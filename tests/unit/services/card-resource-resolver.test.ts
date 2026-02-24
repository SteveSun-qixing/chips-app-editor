import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  releaseCardResourceUrl,
  resolveCardResourceUrl,
} from '@/services/card-resource-resolver';

describe('card-resource-resolver', () => {
  beforeEach(() => {
    readBinaryMock.mockReset();
  });

  it('preserves absolute card path', () => {
    const fullPath = buildCardResourceFullPath(
      '/Users/sevenstars/Documents/ChipsCard/Develop/Project-12/ProductFinishedProductTestingSpace/TestWorkspace/demo-card',
      'photo.jpg'
    );

    expect(fullPath).toBe(
      '/Users/sevenstars/Documents/ChipsCard/Develop/Project-12/ProductFinishedProductTestingSpace/TestWorkspace/demo-card/photo.jpg'
    );
  });

  it('normalizes duplicate slashes in resource path', () => {
    const fullPath = buildCardResourceFullPath('TestWorkspace/demo-card/', '/images//photo.jpg');
    expect(fullPath).toBe('TestWorkspace/demo-card/images/photo.jpg');
  });

  it('creates object url from binary content', async () => {
    readBinaryMock.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const createObjectUrlMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test-image');

    const resolved = await resolveCardResourceUrl('/tmp/demo/test.jpg');

    expect(readBinaryMock).toHaveBeenCalledWith('/tmp/demo/test.jpg');
    expect(resolved).toEqual({
      fullPath: '/tmp/demo/test.jpg',
      url: 'blob:test-image',
      source: 'file',
    });
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);

    createObjectUrlMock.mockRestore();
  });

  it('releases object url', async () => {
    const revokeObjectUrlMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await releaseCardResourceUrl({
      fullPath: '/tmp/demo/test.jpg',
      url: 'blob:test-image',
      source: 'file',
    });

    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:test-image');
    revokeObjectUrlMock.mockRestore();
  });
});
