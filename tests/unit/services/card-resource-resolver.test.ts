import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readBinaryMock } = vi.hoisted(() => ({
  readBinaryMock: vi.fn(),
}));

vi.mock('@/services/resource-service', () => ({
  resourceService: {
    readBinary: readBinaryMock,
  },
}));

import {
  buildCardResourceFullPath,
  isDirectResourceUrl,
  releaseCardResourceUrl,
  resolveCardResourceUrl,
  type CardResolvedResource,
} from '@/services/card-resource-resolver';

type ObjectUrlFn = (obj: Blob | MediaSource) => string;
type RevokeObjectUrlFn = (url: string) => void;

let originalCreateObjectUrl: ObjectUrlFn | undefined;
let originalRevokeObjectUrl: RevokeObjectUrlFn | undefined;

beforeEach(() => {
  originalCreateObjectUrl = URL.createObjectURL as ObjectUrlFn | undefined;
  originalRevokeObjectUrl = URL.revokeObjectURL as RevokeObjectUrlFn | undefined;
  readBinaryMock.mockReset();
});

afterEach(() => {
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectUrl,
    });
  } else {
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
  }

  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectUrl,
    });
  } else {
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  }
});

describe('card-resource-resolver', () => {
  it('isDirectResourceUrl 应识别可直接访问的 URL', () => {
    expect(isDirectResourceUrl('http://example.com/a.png')).toBe(true);
    expect(isDirectResourceUrl('https://example.com/a.png')).toBe(true);
    expect(isDirectResourceUrl('blob:abc123')).toBe(true);
    expect(isDirectResourceUrl('data:image/png;base64,AAAA')).toBe(true);
  });

  it('isDirectResourceUrl 对卡片相对路径返回 false', () => {
    expect(isDirectResourceUrl('assets/photo.png')).toBe(false);
  });

  it('buildCardResourceFullPath 应保留 unix 绝对路径前缀', () => {
    expect(
      buildCardResourceFullPath('/Users/demo/workspace/demo-card', 'images/photo.png')
    ).toBe('/Users/demo/workspace/demo-card/images/photo.png');
  });

  it('buildCardResourceFullPath 应规范化 windows 路径', () => {
    expect(
      buildCardResourceFullPath('C:\\workspace\\demo-card\\', '\\images\\photo.png')
    ).toBe('C:/workspace/demo-card/images/photo.png');
  });

  it('buildCardResourceFullPath 在资源路径为空时返回卡片路径', () => {
    expect(buildCardResourceFullPath('/workspace/demo-card/', '')).toBe('/workspace/demo-card');
  });

  it('buildCardResourceFullPath 在卡片路径为空时返回资源路径', () => {
    expect(buildCardResourceFullPath('', '/images/photo.png')).toBe('images/photo.png');
  });

  it('resolveCardResourceUrl 应通过 file.read 构造 object URL', async () => {
    readBinaryMock.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    let capturedBlobType = '';
    const createObjectUrlMock = vi.fn((blob: Blob) => {
      capturedBlobType = blob.type;
      return 'blob:mock-image-url';
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });

    const resolved = await resolveCardResourceUrl('/workspace/demo-card/images/photo.png');

    expect(readBinaryMock).toHaveBeenCalledWith('/workspace/demo-card/images/photo.png');
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(capturedBlobType).toBe('image/png');
    expect(resolved).toEqual({
      fullPath: '/workspace/demo-card/images/photo.png',
      url: 'blob:mock-image-url',
      source: 'file-read',
    });
  });

  it('resolveCardResourceUrl 在 createObjectURL 缺失时抛错', async () => {
    readBinaryMock.mockResolvedValue(new Uint8Array([1]).buffer);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await expect(resolveCardResourceUrl('/workspace/demo-card/images/photo.png')).rejects.toThrow(
      'URL.createObjectURL is unavailable'
    );
  });

  it('releaseCardResourceUrl 应撤销 object URL 且吞掉异常', async () => {
    const revokeMock = vi.fn(() => {
      throw new Error('revoke failed');
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeMock,
    });

    const resource: CardResolvedResource = {
      fullPath: '/workspace/demo-card/images/photo.png',
      url: 'blob:mock-image-url',
      source: 'file-read',
    };

    await expect(releaseCardResourceUrl(resource)).resolves.toBeUndefined();
    expect(revokeMock).toHaveBeenCalledWith('blob:mock-image-url');
  });
});
