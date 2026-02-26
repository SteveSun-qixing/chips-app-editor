import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChipsBridgeAPI } from '@chips/sdk';

import {
  __resetEditorRuntimeGatewayForTests,
  getEditorConfigHook,
  getEditorI18nHook,
  getEditorPluginHook,
  getEditorThemeHook,
  invokeEditorRuntime,
  subscribeEditorRuntimeEvent,
} from '@/services/editor-runtime-gateway';

function createRuntimeBridge(overrides?: Partial<ChipsBridgeAPI>): ChipsBridgeAPI {
  return {
    invoke: vi.fn().mockResolvedValue({}),
    on: vi.fn(() => () => undefined),
    once: vi.fn(() => () => undefined),
    emit: vi.fn(),
    window: {
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      restore: vi.fn(),
      setTitle: vi.fn(),
      setSize: vi.fn(),
      getSize: vi.fn(),
      setPosition: vi.fn(),
      getPosition: vi.fn(),
      setFullScreen: vi.fn(),
      isFullScreen: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      openPlugin: vi.fn(),
      getInfo: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      showMessageBox: vi.fn(),
    },
    plugin: {
      getSelf: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      getCardPlugin: vi.fn(),
      getCardRuntimeContext: vi.fn(),
      getLayoutPlugin: vi.fn(),
      resolveFileUrl: vi.fn(),
    },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readHTML: vi.fn(),
      writeHTML: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      clear: vi.fn(),
    },
    shell: {
      openPath: vi.fn(),
      showItemInFolder: vi.fn(),
      openExternal: vi.fn(),
      beep: vi.fn(),
    },
    ...overrides,
  };
}

describe('editor-runtime-gateway', () => {
  beforeEach(() => {
    __resetEditorRuntimeGatewayForTests();
    (window as Window & { chips?: ChipsBridgeAPI }).chips = createRuntimeBridge();
  });

  it('invokes runtime client with namespace/action/params', async () => {
    const invokeMock = vi.fn().mockResolvedValue({ ok: true });
    (window as Window & { chips?: ChipsBridgeAPI }).chips = createRuntimeBridge({
      invoke: invokeMock,
    });

    const response = await invokeEditorRuntime<{ ok: boolean }>('file', 'read', {
      path: '/tmp/a.card',
    });

    expect(response).toEqual({ ok: true });
    expect(invokeMock).toHaveBeenCalledWith('file', 'read', {
      path: '/tmp/a.card',
    });
  });

  it('normalizes unknown runtime errors to standard error shape', async () => {
    const invokeMock = vi.fn().mockRejectedValue(new Error('invoke failed'));
    (window as Window & { chips?: ChipsBridgeAPI }).chips = createRuntimeBridge({
      invoke: invokeMock,
    });

    await expect(invokeEditorRuntime('file', 'read')).rejects.toMatchObject({
      code: 'RUNTIME_INVOKE_FAILED',
      message: 'invoke failed',
    });
  });

  it('keeps standard runtime errors unchanged', async () => {
    const invokeMock = vi.fn().mockRejectedValue({
      code: 'SERVICE_PERMISSION_DENIED',
      message: 'Permission denied',
      retryable: false,
      details: { action: 'file.read' },
    });
    (window as Window & { chips?: ChipsBridgeAPI }).chips = createRuntimeBridge({
      invoke: invokeMock,
    });

    await expect(invokeEditorRuntime('file', 'read')).rejects.toMatchObject({
      code: 'SERVICE_PERMISSION_DENIED',
      message: 'Permission denied',
      retryable: false,
      details: { action: 'file.read' },
    });
  });

  it('subscribes runtime events and returns unsubscribe handle', () => {
    const unsubscribe = vi.fn();
    let registeredHandler: ((payload: unknown) => void) | null = null;
    const onMock = vi.fn((_event: string, callback: (payload: unknown) => void) => {
      registeredHandler = callback;
      return unsubscribe;
    });

    (window as Window & { chips?: ChipsBridgeAPI }).chips = createRuntimeBridge({
      on: onMock,
    });

    const callback = vi.fn();
    const cancel = subscribeEditorRuntimeEvent('theme.changed', callback);

    registeredHandler?.({ themeId: 'default-light' });

    expect(onMock).toHaveBeenCalledWith('theme.changed', expect.any(Function));
    expect(callback).toHaveBeenCalledWith({ themeId: 'default-light' });

    cancel();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('reuses singleton hook instances', () => {
    const themeA = getEditorThemeHook();
    const themeB = getEditorThemeHook();
    const i18nA = getEditorI18nHook();
    const i18nB = getEditorI18nHook();
    const pluginA = getEditorPluginHook();
    const pluginB = getEditorPluginHook();
    const configA = getEditorConfigHook();
    const configB = getEditorConfigHook();

    expect(themeA).toBe(themeB);
    expect(i18nA).toBe(i18nB);
    expect(pluginA).toBe(pluginB);
    expect(configA).toBe(configB);
  });
});
