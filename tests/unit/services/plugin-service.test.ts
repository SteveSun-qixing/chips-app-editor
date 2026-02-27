import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listMock,
  getCardPluginMock,
  getCardRuntimeContextMock,
  resolveFileUrlMock,
} = vi.hoisted(() => ({
  listMock: vi.fn(),
  getCardPluginMock: vi.fn(),
  getCardRuntimeContextMock: vi.fn(),
  resolveFileUrlMock: vi.fn(),
}));

vi.mock('@/services/editor-runtime-gateway', () => ({
  getEditorPluginHook: () => ({
    list: listMock,
    getCardPlugin: getCardPluginMock,
    getCardRuntimeContext: getCardRuntimeContextMock,
    resolveFileUrl: resolveFileUrlMock,
  }),
}));

import {
  __resetPluginServiceForTests,
  getCardPluginPermissions,
  getHostPluginVocabulary,
  getLocalPluginVocabulary,
  getEditorComponent,
  getEditorRuntime,
  getRegisteredPlugins,
} from '@/services/plugin-service';

function resetRuntimeMocks(): void {
  listMock.mockReset();
  getCardPluginMock.mockReset();
  getCardRuntimeContextMock.mockReset();
  resolveFileUrlMock.mockReset();

  listMock.mockResolvedValue([
    {
      id: 'chips-official.rich-text-card',
      name: 'Rich Text Card',
      version: '1.0.0',
      capabilities: {
        cardType: 'RichTextCard',
      },
    },
  ]);

  getCardPluginMock.mockResolvedValue({
    pluginId: 'chips-official.rich-text-card',
    rendererPath: 'dist/renderer/index.html',
    editorPath: 'dist/editor/index.html',
  });

  getCardRuntimeContextMock.mockResolvedValue({
    pluginId: 'chips-official.rich-text-card',
    cardType: 'RichTextCard',
    rendererPath: 'dist/renderer/index.html',
    rendererUrl: 'https://plugins.local/renderer/index.html',
    editorPath: 'dist/editor/index.html',
    editorUrl: 'https://plugins.local/editor/index.html',
    permissions: ['resource.fetch'],
    locale: 'zh-CN',
    vocabularyVersion: 3,
    vocabulary: {
      'toolbar.bold': '加粗',
    },
  });

  resolveFileUrlMock.mockImplementation(async (pluginId: string, relativePath: string) => {
    return `chips://plugin/${pluginId}/${relativePath}`;
  });
}

describe('plugin-service', () => {
  beforeEach(() => {
    __resetPluginServiceForTests();
    vi.restoreAllMocks();
    resetRuntimeMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns iframe runtime for html editor entry', async () => {
    const runtime = await getEditorRuntime('RichTextCard');

    expect(runtime).toBeTruthy();
    expect(runtime?.mode).toBe('iframe');
    expect(runtime?.iframeUrl).toBe('chips://plugin/chips-official.rich-text-card/dist/editor/index.html');
  });

  it('returns null component for iframe runtime', async () => {
    const component = await getEditorComponent('RichTextCard');
    expect(component).toBeNull();
  });

  it('supports legacy plugin id as card type alias', async () => {
    const runtime = await getEditorRuntime('chips-official.rich-text-card');
    expect(runtime?.mode).toBe('iframe');
    expect(runtime?.pluginId).toBe('chips-official.rich-text-card');
  });

  it('maps discovered cardTypes from plugin capabilities.cardType', async () => {
    await getEditorRuntime('RichTextCard');
    const plugins = getRegisteredPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.cardTypes).toEqual(['RichTextCard']);
  });

  it('returns null when runtime cannot resolve card plugin entry', async () => {
    getCardPluginMock.mockResolvedValue(null);

    const runtime = await getEditorRuntime('UnknownCard');
    expect(runtime).toBeNull();
  });

  it('retries card plugin lookup after first miss', async () => {
    getCardPluginMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        pluginId: 'chips-official.rich-text-card',
        rendererPath: 'dist/renderer/index.html',
        editorPath: 'dist/editor/index.html',
      });

    const runtime = await getEditorRuntime('RichTextCard');
    expect(runtime?.mode).toBe('iframe');
    expect(getCardPluginMock).toHaveBeenCalledTimes(2);
  });

  it('loads host runtime vocabulary from plugin runtime context', async () => {
    const result = await getHostPluginVocabulary('chips-official.rich-text-card', 'zh-CN');

    expect(result).toEqual({
      locale: 'zh-CN',
      vocabularyVersion: 3,
      vocabulary: {
        'toolbar.bold': '加粗',
      },
    });
  });

  it('loads local vocabulary from plugin locale file', async () => {
    resolveFileUrlMock.mockResolvedValue('https://plugins.local/chips-official.rich-text-card/locales/vocabulary.yaml');

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
    resolveFileUrlMock.mockResolvedValue('https://plugins.local/chips-official.rich-text-card/manifest.yaml');

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
