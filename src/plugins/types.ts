/**
 * 插件系统类型定义
 * @module plugins/types
 */

import type { EditorInstance } from '@/types';

/** 插件元数据 */
export interface PluginMetadata {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 依赖的插件 */
  dependencies?: string[];
}

/** 插件上下文 */
export interface PluginContext {
  /** 编辑器实例 */
  editor: EditorInstance;
  /** 日志记录 */
  logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/** 插件接口 */
export interface Plugin {
  /** 插件元数据 */
  metadata: PluginMetadata;
  /** 激活插件 */
  activate: (context: PluginContext) => void | Promise<void>;
  /** 停用插件 */
  deactivate?: () => void | Promise<void>;
}
