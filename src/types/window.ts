/**
 * 窗口类型定义
 * @module types/window
 */

/** 窗口类型 */
export type WindowType = 'card' | 'tool' | 'modal';

/** 窗口状态 */
export type WindowState = 'normal' | 'minimized' | 'collapsed' | 'cover';

/** 窗口位置 */
export interface WindowPosition {
  x: number;
  y: number;
}

/** 窗口大小 */
export interface WindowSize {
  width: number;
  height: number;
}

/** 窗口配置基础接口 */
export interface WindowConfig {
  /** 窗口唯一标识 */
  id: string;
  /** 窗口类型 */
  type: WindowType;
  /** 窗口标题 */
  title: string;
  /** 窗口位置 */
  position: WindowPosition;
  /** 窗口大小 */
  size: WindowSize;
  /** 窗口状态 */
  state: WindowState;
  /** 层级索引 */
  zIndex: number;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可拖动 */
  draggable?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否可最小化 */
  minimizable?: boolean;
}

/** 卡片窗口配置 */
export interface CardWindowConfig extends WindowConfig {
  type: 'card';
  /** 卡片ID */
  cardId: string;
  /** 是否处于编辑状态 */
  isEditing: boolean;
  /** 封面比例 */
  coverRatio?: string;
  /** 卡片类型 */
  cardType?: string;
}

/** 工具窗口配置 */
export interface ToolWindowConfig extends WindowConfig {
  type: 'tool';
  /** 工具组件名称 */
  component: string;
  /** 工具图标 */
  icon?: string;
  /** 是否可停靠 */
  dockable?: boolean;
}

/** 模态窗口配置 */
export interface ModalWindowConfig extends WindowConfig {
  type: 'modal';
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
}

/** 窗口管理器事件 */
export interface WindowManagerEvents {
  'window:created': { windowId: string; config: WindowConfig };
  'window:closed': { windowId: string };
  'window:focused': { windowId: string };
  'window:moved': { windowId: string; position: WindowPosition };
  'window:resized': { windowId: string; size: WindowSize };
  'window:stateChanged': { windowId: string; state: WindowState };
}

/** 窗口实例接口 */
export interface WindowInstance {
  /** 窗口配置 */
  readonly config: WindowConfig;
  /** 关闭窗口 */
  close: () => void;
  /** 聚焦窗口 */
  focus: () => void;
  /** 移动窗口 */
  move: (position: WindowPosition) => void;
  /** 调整大小 */
  resize: (size: WindowSize) => void;
  /** 设置状态 */
  setState: (state: WindowState) => void;
}
