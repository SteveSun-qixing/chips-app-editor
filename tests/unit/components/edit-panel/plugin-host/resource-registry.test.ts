import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEditorResourceRegistry } from '@/components/edit-panel/plugin-host/resource-registry';

const {
  buildCardResourceFullPathMock,
  resolveCardResourceUrlMock,
  releaseCardResourceUrlMock,
} = vi.hoisted(() => ({
  buildCardResourceFullPathMock: vi.fn((cardPath: string, resourcePath: string) => `${cardPath}/${resourcePath}`),
  resolveCardResourceUrlMock: vi.fn(),
  releaseCardResourceUrlMock: vi.fn(),
}));

vi.mock('@/services/card-resource-resolver', () => ({
  buildCardResourceFullPath: buildCardResourceFullPathMock,
  resolveCardResourceUrl: resolveCardResourceUrlMock,
  releaseCardResourceUrl: releaseCardResourceUrlMock,
}));

describe('resource-registry helpers', () => {
  beforeEach(() => {
    buildCardResourceFullPathMock.mockClear();
    resolveCardResourceUrlMock.mockReset();
    releaseCardResourceUrlMock.mockReset();
  });

  it('resolves resource and caches result', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://1', releaseToken: 'token-1' });
    const registry = createEditorResourceRegistry();

    expect(await registry.resolve('/card/image.png')).toBe('blob://1');
    expect(await registry.resolve('/card/image.png')).toBe('blob://1');
    expect(resolveCardResourceUrlMock).toHaveBeenCalledTimes(1);
  });

  it('resolves resource by relative path', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://2', releaseToken: 'token-2' });
    const registry = createEditorResourceRegistry();

    expect(await registry.resolveByRelativePath('/card', 'image.png')).toBe('blob://2');
    expect(buildCardResourceFullPathMock).toHaveBeenCalledWith('/card', 'image.png');
  });

  it('releases existing resource', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://3', releaseToken: 'token-3' });
    const registry = createEditorResourceRegistry();

    await registry.resolve('/card/image.png');
    await registry.release('/card/image.png');

    expect(releaseCardResourceUrlMock).toHaveBeenCalledWith({
      url: 'blob://3',
      releaseToken: 'token-3',
    });
  });

  it('skips release when resource is not cached', async () => {
    const registry = createEditorResourceRegistry();

    await registry.release('/card/missing.png');

    expect(releaseCardResourceUrlMock).not.toHaveBeenCalled();
  });

  it('releases resource by relative path using direct hit', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://4', releaseToken: 'token-4' });
    const registry = createEditorResourceRegistry();

    await registry.resolveByRelativePath('/card', 'image.png');
    await registry.releaseByRelativePath('/card', 'image.png');

    expect(releaseCardResourceUrlMock).toHaveBeenCalledTimes(1);
  });

  it('releases resource by relative path using suffix fallback', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://5', releaseToken: 'token-5' });
    const registry = createEditorResourceRegistry();

    await registry.resolve('/workspace/card/image.png');
    await registry.releaseByRelativePath('/other-card', 'image.png');

    expect(releaseCardResourceUrlMock).toHaveBeenCalledTimes(1);
  });

  it('releases all cached resources', async () => {
    resolveCardResourceUrlMock
      .mockResolvedValueOnce({ url: 'blob://6', releaseToken: 'token-6' })
      .mockResolvedValueOnce({ url: 'blob://7', releaseToken: 'token-7' });

    const registry = createEditorResourceRegistry();
    await registry.resolve('/card/a.png');
    await registry.resolve('/card/b.png');

    await registry.releaseAll();

    expect(releaseCardResourceUrlMock).toHaveBeenCalledTimes(2);
  });

  it('clears cache after releaseAll', async () => {
    resolveCardResourceUrlMock.mockResolvedValue({ url: 'blob://8', releaseToken: 'token-8' });
    const registry = createEditorResourceRegistry();

    await registry.resolve('/card/a.png');
    await registry.releaseAll();
    await registry.release('/card/a.png');

    expect(releaseCardResourceUrlMock).toHaveBeenCalledTimes(1);
  });
});
