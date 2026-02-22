/**
 * 布局类型定义
 * @module types/layout
 */

/** 布局类型 */
export type LayoutType = 'infinite-canvas' | 'workbench';

/** 布局配置基础接口 */
export interface LayoutConfig {
  type: LayoutType;
  options?: Record<string, unknown>;
}

/** 无限画布配置 */
export interface InfiniteCanvasConfig extends LayoutConfig {
  type: 'infinite-canvas';
  options?: {
    /** 网格大小 */
    gridSize?: number;
    /** 最小缩放 */
    minZoom?: number;
    /** 最大缩放 */
    maxZoom?: number;
    /** 默认缩放 */
    defaultZoom?: number;
    /** 是否显示网格 */
    showGrid?: boolean;
    /** 是否吸附网格 */
    snapToGrid?: boolean;
  };
}

/** 工作台配置 */
export interface WorkbenchConfig extends LayoutConfig {
  type: 'workbench';
  options?: {
    /** 侧边栏宽度 */
    sidebarWidth?: number;
    /** 是否显示预览 */
    showPreview?: boolean;
    /** 是否显示工具栏 */
    showToolbar?: boolean;
    /** 面板布局 */
    panelLayout?: 'horizontal' | 'vertical';
  };
}

/** 画布状态 */
export interface CanvasState {
  /** 缩放级别 */
  zoom: number;
  /** 水平平移量 */
  panX: number;
  /** 垂直平移量 */
  panY: number;
}

/** 画布视口 */
export interface CanvasViewport {
  /** 视口左上角X坐标 */
  x: number;
  /** 视口左上角Y坐标 */
  y: number;
  /** 视口宽度 */
  width: number;
  /** 视口高度 */
  height: number;
}

/** 布局管理器接口 */
export interface LayoutManager {
  /** 当前布局类型 */
  readonly currentLayout: LayoutType;
  /** 切换布局 */
  switchLayout: (type: LayoutType, config?: LayoutConfig) => Promise<void>;
  /** 获取布局配置 */
  getConfig: () => LayoutConfig;
  /** 更新布局配置 */
  updateConfig: (config: Partial<LayoutConfig>) => void;
}

/** 画布管理器接口 */
export interface CanvasManager {
  /** 画布状态 */
  readonly state: CanvasState;
  /** 缩放画布 */
  zoom: (scale: number, center?: { x: number; y: number }) => void;
  /** 平移画布 */
  pan: (deltaX: number, deltaY: number) => void;
  /** 重置画布视图 */
  resetView: () => void;
  /** 适应视口 */
  fitToViewport: () => void;
  /** 获取视口 */
  getViewport: () => CanvasViewport;
}
