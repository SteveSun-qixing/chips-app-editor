import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEditorBridgeClient, invokeBridge } from '@/services/bridge-client';
import type { ChipsBridgeAPI } from '@/types/bridge';

function createBridgeMock(): ChipsBridgeAPI {
  return {
    invoke: vi.fn(),
    on: vi.fn(() => () => undefined),
    once: vi.fn(() => () => undefined),
    emit: vi.fn(),
    dialog: {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      showMessageBox: vi.fn(),
    },
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
      isFullScreen: vi.fn(),
      setFullScreen: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      openPlugin: vi.fn(),
      getInfo: vi.fn(),
    },
    plugin: {
      getSelf: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      getCardPlugin: vi.fn(),
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
  };
}

describe('editor bridge-client', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'chips', {
      configurable: true,
      writable: true,
      value: createBridgeMock(),
    });
  });

  it('invokes bridge namespace/action', async () => {
    const chips = window.chips;
    vi.mocked(chips.invoke).mockResolvedValue({ ok: true });

    const response = await invokeBridge<{ ok: boolean }>('file', 'read', { path: '/tmp/a.card' });
    expect(response.ok).toBe(true);
    expect(chips.invoke).toHaveBeenCalledWith('file', 'read', { path: '/tmp/a.card' });
  });

  it('reads file content as bytes via shared helper', async () => {
    const chips = window.chips;
    vi.mocked(chips.invoke).mockResolvedValue({
      content: 'AQID',
      encoding: 'base64',
      size: 3,
    });

    const client = createEditorBridgeClient();
    const bytes = await client.readFileAsBytes('/tmp/demo.card');

    expect([...bytes]).toEqual([1, 2, 3]);
    expect(chips.invoke).toHaveBeenCalledWith('file', 'read', {
      path: '/tmp/demo.card',
      encoding: 'base64',
      mode: 'buffer',
    });
  });

  it('opens save dialog with provided defaults', async () => {
    const chips = window.chips;
    vi.mocked(chips.dialog.showSaveDialog).mockResolvedValue('/tmp/demo.card');

    const client = createEditorBridgeClient();
    const selected = await client.showSaveFileDialog();

    expect(selected).toBe('/tmp/demo.card');
    expect(chips.dialog.showSaveDialog).toHaveBeenCalledOnce();
  });
});
