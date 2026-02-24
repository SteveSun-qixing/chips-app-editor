/**
 * 编辑面板类型定义
 * @module components/edit-panel/types
 */

import type { BaseCardInfo } from '@/core/state/stores/card';

/**
 * 编辑面板位置
 */
export type EditPanelPosition = 'right' | 'left' | 'bottom';

/**
 * 编辑面板属性
 */
export interface EditPanelProps {
  /** 面板位置 */
  position?: EditPanelPosition;
  /** 面板宽度 */
  width?: number;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

/**
 * 插件宿主属性
 */
export interface PluginHostProps {
  /** 复合卡片 ID */
  cardId?: string;
  /** 基础卡片类型 */
  cardType: string;
  /** 基础卡片 ID */
  baseCardId: string;
  /** 当前配置 */
  config: Record<string, unknown>;
}

/**
 * 默认编辑器属性
 */
export interface DefaultEditorProps {
  /** 基础卡片信息 */
  baseCard: BaseCardInfo;
  /** 配置 Schema */
  schema?: Record<string, unknown>;
  /** 编辑模式 */
  mode?: 'json' | 'form';
}

/**
 * 编辑器插件接口
 */
export interface EditorPlugin {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 支持的卡片类型 */
  cardType: string;
  /** 挂载插件 */
  mount(container: HTMLElement, config: Record<string, unknown>): void | Promise<void>;
  /** 卸载插件 */
  unmount(): void | Promise<void>;
  /** 获取当前配置 */
  getConfig(): Record<string, unknown>;
  /** 设置配置 */
  setConfig(config: Record<string, unknown>): void;
  /** 验证配置 */
  validate?(): boolean | Promise<boolean>;
  /** 配置变更回调 */
  onConfigChange?(callback: (config: Record<string, unknown>) => void): void;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  /** 基础卡片 ID */
  baseCardId: string;
  /** 新配置 */
  config: Record<string, unknown>;
  /** 变更来源 */
  source: 'plugin' | 'user' | 'sync';
}

/**
 * 编辑面板状态
 */
export interface EditPanelState {
  /** 是否可见 */
  visible: boolean;
  /** 是否展开 */
  expanded: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 当前卡片 ID */
  currentCardId: string | null;
  /** 当前基础卡片 ID */
  currentBaseCardId: string | null;
  /** 当前插件 */
  currentPlugin: EditorPlugin | null;
}

/**
 * 表单字段定义
 */
export interface FormField {
  /** 字段键名 */
  key: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'color' | 'file';
  /** 默认值 */
  default?: unknown;
  /** 是否必填 */
  required?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 下拉选项 */
  options?: Array<{ label: string; value: unknown }>;
  /** 验证规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}
