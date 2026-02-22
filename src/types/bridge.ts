/**
 * Bridge API 类型定义
 * @module types/bridge
 * @description 定义 window.chips Bridge API 的完整类型
 *
 * Bridge API 由 Chips Host 的 preload 脚本通过 contextBridge 注入。
 * 在 chipsd dev 模式下，由 Mock Bridge Vite 插件注入。
 */

export interface ChipsDialogFileFilter {
  name: string;
  extensions: string[];
}

export interface ChipsOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: ChipsDialogFileFilter[];
  multiSelections?: boolean;
  directory?: boolean;
}

export interface ChipsSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: ChipsDialogFileFilter[];
}

export interface ChipsMessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface ChipsPluginListFilter {
  type?: 'app' | 'card' | 'layout' | 'module' | 'theme';
  capability?: string;
}

export interface ChipsPluginInfo {
  id: string;
  name: string;
  version: string;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  publisher: string;
  installPath: string;
  enabled: boolean;
}

export interface ChipsPluginSelfInfo {
  id: string;
  version: string;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  installPath: string;
}

export interface ChipsWindowInfo {
  id: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
  isFullScreen: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
}

export interface ChipsWindowBridge {
  close(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  restore(): Promise<void>;
  setTitle(title: string): Promise<void>;
  setSize(width: number, height: number): Promise<void>;
  getSize(): Promise<{ width: number; height: number }>;
  setPosition(x: number, y: number): Promise<void>;
  getPosition(): Promise<{ x: number; y: number }>;
  setFullScreen(flag: boolean): Promise<void>;
  isFullScreen(): Promise<boolean>;
  setAlwaysOnTop(flag: boolean): Promise<void>;
  openPlugin(pluginId: string, launchParams?: unknown): Promise<void>;
  getInfo(): Promise<ChipsWindowInfo>;
}

export interface ChipsDialogBridge {
  showOpenDialog(options: ChipsOpenDialogOptions): Promise<string[] | null>;
  showSaveDialog(options: ChipsSaveDialogOptions): Promise<string | null>;
  showMessageBox(options: ChipsMessageBoxOptions): Promise<{ response: number }>;
}

export interface ChipsPluginBridge {
  getSelf(): Promise<ChipsPluginSelfInfo>;
  list(filter?: ChipsPluginListFilter): Promise<ChipsPluginInfo[]>;
  get(pluginId: string): Promise<ChipsPluginInfo | null>;
  getCardPlugin(
    cardType: string
  ): Promise<{ pluginId: string; rendererPath: string; editorPath: string } | null>;
  getLayoutPlugin(
    layoutType: string
  ): Promise<{ pluginId: string; rendererPath: string; editorPath: string } | null>;
}

export interface ChipsClipboardBridge {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  readHTML(): Promise<string>;
  writeHTML(html: string): Promise<void>;
  readImage(): Promise<string | null>;
  writeImage(dataUrl: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ChipsShellBridge {
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  beep(): Promise<void>;
}

export interface ChipsBridgeAPI {
  invoke<TResponse = unknown>(
    namespace: string,
    action: string,
    params?: unknown
  ): Promise<TResponse>;
  on(event: string, handler: (payload: unknown) => void): () => void;
  once(event: string, handler: (payload: unknown) => void): () => void;
  emit(event: string, data?: unknown): void;
  window: ChipsWindowBridge;
  dialog: ChipsDialogBridge;
  plugin: ChipsPluginBridge;
  clipboard: ChipsClipboardBridge;
  shell: ChipsShellBridge;
}

export interface FileReadResult {
  content: string;
  encoding: 'utf8' | 'base64' | 'binary';
  size: number;
}

declare global {
  interface Window {
    chips: ChipsBridgeAPI;
  }
}
