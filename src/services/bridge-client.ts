/**
 * 编辑器 Bridge 客户端
 * @module services/bridge-client
 * @description 封装编辑器与 Chips Host Bridge API 的交互
 *
 * 提供类型安全的 Bridge 调用接口，包括文件对话框、消息框、
 * 窗口控制、插件管理等编辑器特有的 Bridge 操作。
 */

import type {
  ChipsBridgeAPI,
  ChipsMessageBoxOptions,
  ChipsOpenDialogOptions,
  ChipsSaveDialogOptions,
  FileReadResult,
} from '@/types/bridge';
import type { PluginInitPayload } from '@/types/plugin-init';
import { decodeBase64ToBytes } from '@/utils/base64';
import { subscribePluginInit } from '@/utils/plugin-init';

export interface BridgeInvokeError extends Error {
  code?: string;
  details?: unknown;
  cause?: unknown;
}

export interface EditorBridgeClient {
  showOpenFileDialog(options?: ChipsOpenDialogOptions): Promise<string[] | null>;
  showSaveFileDialog(options?: ChipsSaveDialogOptions): Promise<string | null>;
  showMessageBox(options: ChipsMessageBoxOptions): Promise<{ response: number }>;
  readFileAsBytes(path: string): Promise<Uint8Array>;
  setWindowTitle(title: string): Promise<void>;
  openPlugin(pluginId: string, launchParams?: unknown): Promise<void>;
  onPluginInit(handler: (payload: PluginInitPayload) => void): () => void;
  warmupPluginContext(): Promise<void>;
}

const BRIDGE_UNAVAILABLE_CODE = 'BRIDGE_UNAVAILABLE';

function toBridgeError(error: unknown): BridgeInvokeError {
  if (error instanceof Error) {
    return error as BridgeInvokeError;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Unknown bridge error';
    const bridgeError = new Error(message) as BridgeInvokeError;
    bridgeError.code = typeof candidate.code === 'string' ? candidate.code : undefined;
    bridgeError.details = candidate.details;
    bridgeError.cause = error;
    return bridgeError;
  }

  const fallback = new Error(String(error)) as BridgeInvokeError;
  fallback.cause = error;
  return fallback;
}

function requireBridge(): ChipsBridgeAPI {
  if (typeof window === 'undefined' || !window.chips || typeof window.chips.invoke !== 'function') {
    const error = new Error('window.chips.invoke is unavailable') as BridgeInvokeError;
    error.code = BRIDGE_UNAVAILABLE_CODE;
    throw error;
  }

  return window.chips;
}

export async function invokeBridge<T>(
  namespace: string,
  action: string,
  params?: unknown,
): Promise<T> {
  try {
    const bridge = requireBridge();
    return (await bridge.invoke(namespace, action, params)) as T;
  } catch (error: unknown) {
    throw toBridgeError(error);
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class EditorBridgeClientImpl implements EditorBridgeClient {
  public async showOpenFileDialog(options?: ChipsOpenDialogOptions): Promise<string[] | null> {
    const bridge = requireBridge();
    const defaults: ChipsOpenDialogOptions = {
      title: 'Open',
      filters: [
        { name: 'Chips Files', extensions: ['card', 'box'] },
        { name: 'Card Files', extensions: ['card'] },
        { name: 'Box Files', extensions: ['box'] },
      ],
      multiSelections: false,
    };
    return bridge.dialog.showOpenDialog({ ...defaults, ...options });
  }

  public async showSaveFileDialog(options?: ChipsSaveDialogOptions): Promise<string | null> {
    const bridge = requireBridge();
    const defaults: ChipsSaveDialogOptions = {
      title: 'Save',
      filters: [
        { name: 'Card Files', extensions: ['card'] },
        { name: 'Box Files', extensions: ['box'] },
      ],
    };
    return bridge.dialog.showSaveDialog({ ...defaults, ...options });
  }

  public async showMessageBox(options: ChipsMessageBoxOptions): Promise<{ response: number }> {
    const bridge = requireBridge();
    return bridge.dialog.showMessageBox(options);
  }

  public async readFileAsBytes(path: string): Promise<Uint8Array> {
    const readResult = await invokeBridge<FileReadResult>('file', 'read', {
      path,
      encoding: 'base64',
      mode: 'buffer',
    });

    if (!readResult || typeof readResult !== 'object') {
      throw new Error('Invalid file.read response');
    }

    if (typeof readResult.content !== 'string') {
      throw new Error('Invalid file.read content');
    }

    if (readResult.encoding !== 'base64') {
      throw new Error(`Unsupported encoding from file.read: ${readResult.encoding}`);
    }

    return decodeBase64ToBytes(readResult.content);
  }

  public async setWindowTitle(title: string): Promise<void> {
    const bridge = requireBridge();
    await bridge.window.setTitle(title);
  }

  public async openPlugin(pluginId: string, launchParams?: unknown): Promise<void> {
    const bridge = requireBridge();
    await bridge.window.openPlugin(pluginId, launchParams);
  }

  public onPluginInit(handler: (payload: PluginInitPayload) => void): () => void {
    return subscribePluginInit(handler);
  }

  public async warmupPluginContext(): Promise<void> {
    try {
      const bridge = requireBridge();
      await Promise.allSettled([
        bridge.plugin.getSelf(),
        bridge.plugin.list({ type: 'card' }),
      ]);
    } catch (error) {
      console.warn('[Editor] Plugin context warmup failed:', toErrorMessage(error));
    }
  }
}

export function createEditorBridgeClient(): EditorBridgeClient {
  return new EditorBridgeClientImpl();
}
