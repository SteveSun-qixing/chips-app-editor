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
} from '@/types/bridge';
import {
  invokeBridge,
  readBridgeFileAsBytes,
  requireBridge,
  type BridgeInvokeError,
} from '@chips/sdk';
import type { PluginInitPayload } from '@/types/plugin-init';
import { subscribePluginInit } from '@/utils/plugin-init';

export { invokeBridge };
export type { BridgeInvokeError };

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

function getBridge(): ChipsBridgeAPI {
  return requireBridge<ChipsBridgeAPI>();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class EditorBridgeClientImpl implements EditorBridgeClient {
  public async showOpenFileDialog(options?: ChipsOpenDialogOptions): Promise<string[] | null> {
    const bridge = getBridge();
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
    const bridge = getBridge();
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
    const bridge = getBridge();
    return bridge.dialog.showMessageBox(options);
  }

  public async readFileAsBytes(path: string): Promise<Uint8Array> {
    return readBridgeFileAsBytes(path);
  }

  public async setWindowTitle(title: string): Promise<void> {
    const bridge = getBridge();
    await bridge.window.setTitle(title);
  }

  public async openPlugin(pluginId: string, launchParams?: unknown): Promise<void> {
    const bridge = getBridge();
    await bridge.window.openPlugin(pluginId, launchParams);
  }

  public onPluginInit(handler: (payload: PluginInitPayload) => void): () => void {
    return subscribePluginInit(handler);
  }

  public async warmupPluginContext(): Promise<void> {
    try {
      const bridge = getBridge();
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
