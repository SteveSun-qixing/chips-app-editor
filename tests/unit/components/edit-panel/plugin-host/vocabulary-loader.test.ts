import { describe, expect, it, vi } from 'vitest';
import { createIframeVocabularyLoader } from '@/components/edit-panel/plugin-host/vocabulary-loader';

describe('vocabulary-loader helpers', () => {
  it('returns empty vocabulary when loader is disabled', async () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => false,
      getLocalVocabulary: vi.fn(),
      getHostVocabulary: vi.fn(),
    });

    expect(await loader.load('en-US')).toEqual({});
  });

  it('merges host and local vocabulary with host priority', async () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue({
        'toolbar.bold': 'Bold Local',
        'toolbar.italic': 'Italic Local',
      }),
      getHostVocabulary: vi.fn().mockResolvedValue({
        'toolbar.bold': 'Bold Host',
      }),
    });

    expect(await loader.load('en-US')).toEqual({
      'toolbar.bold': 'Bold Host',
      'toolbar.italic': 'Italic Local',
    });
  });

  it('falls back to local vocabulary when host response is unresolved key', async () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue({
        'toolbar.bold': 'Bold Local',
      }),
      getHostVocabulary: vi.fn().mockResolvedValue({
        'toolbar.bold': 'toolbar.bold',
      }),
    });

    expect(await loader.load('en-US')).toEqual({
      'toolbar.bold': 'Bold Local',
    });
  });

  it('drops unresolved host key without local fallback', async () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue(null),
      getHostVocabulary: vi.fn().mockResolvedValue({
        'toolbar.bold': 'toolbar.bold',
      }),
    });

    expect(await loader.load('en-US')).toEqual({});
  });

  it('ignores stale load after invalidation', async () => {
    let resolveLocal: ((value: Record<string, string>) => void) | null = null;
    const localPromise = new Promise<Record<string, string>>((resolve) => {
      resolveLocal = resolve;
    });

    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockReturnValue(localPromise),
      getHostVocabulary: vi.fn().mockResolvedValue(null),
    });

    const pending = loader.load('en-US');
    loader.invalidatePendingLoad();
    resolveLocal?.({ 'toolbar.bold': 'Bold Local' });

    expect(await pending).toEqual({});
  });

  it('builds envelope with incremental version', () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue(null),
      getHostVocabulary: vi.fn().mockResolvedValue(null),
    });

    const first = loader.buildEnvelope('en-US', { 'toolbar.bold': 'Bold' });
    const second = loader.buildEnvelope('en-US', { 'toolbar.bold': 'Bold' });

    expect(first.version).toContain(':v1');
    expect(second.version).toContain(':v2');
    expect(loader.getCurrentVersion()).toBe(second.version);
  });

  it('reset clears version sequence', () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => 'chips-official.rich-text-card',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue(null),
      getHostVocabulary: vi.fn().mockResolvedValue(null),
    });

    loader.buildEnvelope('en-US', {});
    loader.reset();

    expect(loader.getCurrentVersion()).toBe('init');

    const next = loader.buildEnvelope('en-US', {});
    expect(next.version).toContain(':v1');
  });

  it('uses unknown-plugin fallback when pluginId is empty', () => {
    const loader = createIframeVocabularyLoader({
      getPluginId: () => '',
      isEnabled: () => true,
      getLocalVocabulary: vi.fn().mockResolvedValue(null),
      getHostVocabulary: vi.fn().mockResolvedValue(null),
    });

    const envelope = loader.buildEnvelope('en-US', {});
    expect(envelope.version.startsWith('unknown-plugin:')).toBe(true);
  });
});
