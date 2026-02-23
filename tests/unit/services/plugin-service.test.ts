import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerPlugin = vi.fn();
const enablePlugin = vi.fn();

vi.mock('@/services/sdk-service', () => ({
  getEditorSdk: vi.fn(async () => ({
    registerPlugin,
    plugins: {
      enable: enablePlugin,
    },
  })),
}));

import {
  __resetPluginServiceForTests,
  getCardPluginPermissions,
  getLocalPluginVocabulary,
  getEditorComponent,
  getEditorRuntime,
  getRegisteredPlugins,
} from '@/services/plugin-service';

function installBridgeMock(overrides?: {
  list?: ReturnType<typeof vi.fn>;
  getCardPlugin?: ReturnType<typeof vi.fn>;
  getCardRuntimeContext?: ReturnType<typeof vi.fn>;
  resolveFileUrl?: ReturnType<typeof vi.fn>;
}): void {
  (window as typeof window & { chips?: unknown }).chips = {
    plugin: {
      list:
        overrides?.list ??
        vi.fn().mockResolvedValue([
          {
            id: 'chips-official.rich-text-card',
            name: 'Rich Text Card',
            version: '1.0.0',
            capabilities: {
              cardType: 'RichTextCard',
            },
          },
        ]),
      getCardPlugin:
        overrides?.getCardPlugin ??
        vi.fn().mockResolvedValue({
          pluginId: 'chips-official.rich-text-card',
          rendererPath: 'dist/renderer/index.html',
          editorPath: 'dist/editor/index.html',
        }),
      getCardRuntimeContext: overrides?.getCardRuntimeContext,
      resolveFileUrl:
        overrides?.resolveFileUrl ??
        vi.fn().mockResolvedValue(
          'chips://plugin/chips-official.rich-text-card/dist/editor/index.html'
        ),
    },
  };
}

describe('plugin-service', () => {
  beforeEach(() => {
    registerPlugin.mockReset();
    enablePlugin.mockReset();
    __resetPluginServiceForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns iframe runtime for html editor entry', async () => {
    installBridgeMock();

    const runtime = await getEditorRuntime('RichTextCard');

    expect(runtime).toBeTruthy();
    expect(runtime?.mode).toBe('iframe');
    expect(runtime?.iframeUrl).toBe('chips://plugin/chips-official.rich-text-card/dist/editor/index.html');
  });

  it('prefers plugin runtime context channel when available', async () => {
    const getCardRuntimeContext = vi.fn().mockResolvedValue({
      pluginId: 'chips-official.rich-text-card',
      cardType: 'RichTextCard',
      rendererPath: 'dist/renderer/index.html',
      rendererUrl: 'chips://plugin/chips-official.rich-text-card/dist/renderer/index.html',
      editorPath: 'dist/editor/index.html',
      editorUrl: 'chips://plugin/chips-official.rich-text-card/dist/editor/index.html',
      permissions: ['resource.fetch', 'theme.read'],
      locale: 'en-US',
      vocabularyVersion: 3,
      vocabulary: {
        'toolbar.bold': 'Bold',
      },
      decisionSource: 'fallback',
    });
    const getCardPlugin = vi.fn().mockResolvedValue(null);
    const resolveFileUrl = vi.fn();

    installBridgeMock({
      getCardRuntimeContext,
      getCardPlugin,
      resolveFileUrl,
    });

    const runtime = await getEditorRuntime('RichTextCard');
    const permissions = await getCardPluginPermissions('chips-official.rich-text-card');
    const vocabulary = await getLocalPluginVocabulary('chips-official.rich-text-card', 'en-US');

    expect(runtime?.mode).toBe('iframe');
    expect(runtime?.iframeUrl).toBe('chips://plugin/chips-official.rich-text-card/dist/editor/index.html');
    expect(getCardRuntimeContext).toHaveBeenCalledWith('RichTextCard', undefined);
    expect(getCardPlugin).not.toHaveBeenCalled();
    expect(resolveFileUrl).not.toHaveBeenCalled();
    expect(Array.from(permissions.values())).toEqual(['resource.fetch', 'theme.read']);
    expect(vocabulary).toEqual({
      'toolbar.bold': 'Bold',
    });
  });

  it('returns null component for iframe runtime', async () => {
    installBridgeMock();

    const component = await getEditorComponent('RichTextCard');
    expect(component).toBeNull();
  });

  it('supports legacy plugin id as card type alias', async () => {
    installBridgeMock();

    const runtime = await getEditorRuntime('chips-official.rich-text-card');
    expect(runtime?.mode).toBe('iframe');
    expect(runtime?.pluginId).toBe('chips-official.rich-text-card');
  });

  it('maps discovered cardTypes from plugin capabilities.cardType', async () => {
    installBridgeMock();

    await getEditorRuntime('RichTextCard');
    const plugins = getRegisteredPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.cardTypes).toEqual(['RichTextCard']);
  });

  it('returns null when bridge cannot resolve card plugin entry', async () => {
    installBridgeMock({
      getCardPlugin: vi.fn().mockResolvedValue(null),
    });

    const runtime = await getEditorRuntime('UnknownCard');
    expect(runtime).toBeNull();
  });

  it('retries card plugin lookup after first miss', async () => {
    const getCardPlugin = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        pluginId: 'chips-official.rich-text-card',
        rendererPath: 'dist/renderer/index.html',
        editorPath: 'dist/editor/index.html',
      });

    installBridgeMock({ getCardPlugin });

    const runtime = await getEditorRuntime('RichTextCard');
    expect(runtime?.mode).toBe('iframe');
    expect(getCardPlugin).toHaveBeenCalledTimes(2);
  });

  it('returns null when bridge is unavailable', async () => {
    (window as typeof window & { chips?: unknown }).chips = undefined;

    const runtime = await getEditorRuntime('RichTextCard');
    expect(runtime).toBeNull();
  });

  it('loads local vocabulary from plugin locale file', async () => {
    installBridgeMock({
      resolveFileUrl: vi.fn().mockResolvedValue('https://plugins.local/chips-official.rich-text-card/locales/vocabulary.yaml'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
vocabulary:
  en-US:
    toolbar.bold: "Bold"
`,
    } as Response));

    const vocabulary = await getLocalPluginVocabulary('chips-official.rich-text-card', 'en-US');

    expect(vocabulary).toEqual({
      'toolbar.bold': 'Bold',
    });
  });

  it('loads plugin permissions from manifest', async () => {
    installBridgeMock({
      resolveFileUrl: vi.fn().mockResolvedValue('https://plugins.local/chips-official.rich-text-card/manifest.yaml'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
permissions:
  - resource.fetch
  - theme.read
`,
    } as Response));

    const permissions = await getCardPluginPermissions('chips-official.rich-text-card');
    expect(Array.from(permissions.values())).toEqual(['resource.fetch', 'theme.read']);
  });
});
