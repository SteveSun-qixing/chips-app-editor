/**
 * 编辑器类型定义
 * @module types/editor
 */

import type { ChipsSDK } from '@chips/sdk';
export type { ChipsSDK } from '@chips/sdk';

/** 编辑器配置 */
export interface EditorConfig {
  /** SDK 实例 */
  sdk?: ChipsSDK;
  /** 默认布局 */
  layout: 'infinite-canvas' | 'workbench';
  /** 调试模式 */
  debug?: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
  /** 语言环境 */
  locale?: string;
}

/** 编辑器状态 */
export type EditorState = 'idle' | 'initializing' | 'ready' | 'error' | 'destroyed';

/** 编辑器事件类型映射 */
export interface EditorEvents {
  'editor:ready': void;
  'editor:error': { error: Error };
  'editor:destroyed': void;
  'card:opened': { cardId: string };
  'card:closed': { cardId: string };
  'card:saved': { cardId: string };
  'card:created': { cardId: string };
  'layout:changed': { layout: string };
}

/** 编辑器事件回调类型 */
export type EditorEventCallback<K extends keyof EditorEvents> = (
  payload: EditorEvents[K]
) => void;

/** 编辑器插件接口 */
export interface EditorPlugin {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 安装插件 */
  install: (editor: EditorInstance) => void | Promise<void>;
  /** 卸载插件 */
  uninstall?: (editor: EditorInstance) => void | Promise<void>;
}

/** 编辑器实例接口 */
export interface EditorInstance {
  /** 编辑器配置 */
  readonly config: EditorConfig;
  /** 编辑器状态 */
  readonly state: EditorState;
  /** 初始化编辑器 */
  initialize: () => Promise<void>;
  /** 销毁编辑器 */
  destroy: () => Promise<void>;
  /** 注册事件监听 */
  on: <K extends keyof EditorEvents>(event: K, callback: EditorEventCallback<K>) => void;
  /** 移除事件监听 */
  off: <K extends keyof EditorEvents>(event: K, callback: EditorEventCallback<K>) => void;
  /** 触发事件 */
  emit: <K extends keyof EditorEvents>(event: K, payload: EditorEvents[K]) => void;
  /** 使用插件 */
  use: (plugin: EditorPlugin) => Promise<void>;
}
