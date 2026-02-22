/**
 * UI 状态管理 Store
 * @module core/state/stores/ui
 * @description 管理编辑器 UI 状态，包括窗口、画布、侧边栏等
 */

import { defineStore } from 'pinia';
import type {
  WindowConfig,
  CardWindowConfig,
  ToolWindowConfig,
  CanvasState,
} from '@/types';

/** 程序坞位置类型 */
export type DockPosition = 'bottom' | 'left' | 'right';

/**
 * UI Store 状态接口
 */
export interface UIStoreState {
  /** 窗口列表（使用数组以确保响应式） */
  windowList: WindowConfig[];
  /** 当前焦点窗口 ID */
  focusedWindowId: string | null;
  /** 最高 z-index */
  maxZIndex: number;
  /** 画布状态 */
  canvas: CanvasState;
  /** 侧边栏是否展开 */
  sidebarExpanded: boolean;
  /** 侧边栏宽度 */
  sidebarWidth: number;
  /** 程序坞位置 */
  dockPosition: DockPosition;
  /** 程序坞是否可见 */
  dockVisible: boolean;
  /** 主题 ID */
  theme: string;
  /** 是否显示网格 */
  showGrid: boolean;
  /** 是否吸附网格 */
  snapToGrid: boolean;
  /** 网格大小 */
  gridSize: number;
  /** 工具窗口最小化状态 */
  minimizedToolIds: string[];
  /** 全屏模式 */
  isFullscreen: boolean;
  /** 面板拖动状态 */
  isDragging: boolean;
}

/**
 * UI 状态 Store
 * 
 * 负责管理编辑器的 UI 状态，包括：
 * - 窗口管理（创建、移动、调整大小、聚焦）
 * - 画布状态（缩放、平移）
 * - 侧边栏和程序坞
 * - 主题和网格设置
 * 
 * @example
 * ```typescript
 * const uiStore = useUIStore();
 * 
 * // 添加窗口
 * uiStore.addWindow(windowConfig);
 * 
 * // 设置缩放
 * uiStore.setZoom(1.5);
 * 
 * // 切换侧边栏
 * uiStore.toggleSidebar();
 * ```
 */
export const useUIStore = defineStore('ui', {
  state: (): UIStoreState => ({
    windowList: [],
    focusedWindowId: null,
    maxZIndex: 100,
    canvas: {
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    sidebarExpanded: true,
    sidebarWidth: 280,
    dockPosition: 'bottom',
    dockVisible: true,
    theme: 'default-light',
    showGrid: true,
    snapToGrid: true,
    gridSize: 20,
    minimizedToolIds: [],
    isFullscreen: false,
    isDragging: false,
  }),

  getters: {
    /**
     * 获取窗口 Map（兼容旧代码）
     */
    windows(): Map<string, WindowConfig> {
      const map = new Map<string, WindowConfig>();
      for (const w of this.windowList) {
        map.set(w.id, w);
      }
      return map;
    },

    /**
     * 获取卡片窗口
     */
    cardWindows(): CardWindowConfig[] {
      return this.windowList.filter(
        (w): w is CardWindowConfig => w.type === 'card'
      );
    },

    /**
     * 获取工具窗口
     */
    toolWindows(): ToolWindowConfig[] {
      return this.windowList.filter(
        (w): w is ToolWindowConfig => w.type === 'tool'
      );
    },

    /**
     * 获取焦点窗口
     */
    focusedWindow(): WindowConfig | null {
      if (!this.focusedWindowId) return null;
      return this.windowList.find(w => w.id === this.focusedWindowId) ?? null;
    },

    /**
     * 获取缩放百分比
     */
    zoomPercent(): number {
      return Math.round(this.canvas.zoom * 100);
    },

    /**
     * 窗口数量
     */
    windowCount(): number {
      return this.windowList.length;
    },

    /**
     * 是否有窗口
     */
    hasWindows(): boolean {
      return this.windowList.length > 0;
    },

    /**
     * 获取最小化的工具窗口列表
     */
    minimizedToolList(): string[] {
      return this.minimizedToolIds;
    },

    /**
     * 最小化工具 Set（兼容旧代码）
     */
    minimizedTools(): Set<string> {
      return new Set(this.minimizedToolIds);
    },

    /**
     * 是否为深色主题
     */
    isDarkTheme(): boolean {
      return this.theme.includes('dark');
    },
  },

  actions: {
    /**
     * 添加窗口
     * @param config - 窗口配置
     */
    addWindow(config: WindowConfig): void {
      config.zIndex = ++this.maxZIndex;
      // 检查是否已存在
      const existingIndex = this.windowList.findIndex(w => w.id === config.id);
      if (existingIndex >= 0) {
        // 更新现有窗口
        this.windowList[existingIndex] = config;
      } else {
        // 添加新窗口
        this.windowList.push(config);
      }
      console.warn('[UIStore] 添加窗口:', config.id, 'type:', config.type, '当前窗口数:', this.windowList.length);
    },

    /**
     * 移除窗口
     * @param windowId - 窗口 ID
     */
    removeWindow(windowId: string): void {
      const index = this.windowList.findIndex(w => w.id === windowId);
      if (index >= 0) {
        this.windowList.splice(index, 1);
      }
      
      const toolIndex = this.minimizedToolIds.indexOf(windowId);
      if (toolIndex >= 0) {
        this.minimizedToolIds.splice(toolIndex, 1);
      }
      
      if (this.focusedWindowId === windowId) {
        this.focusedWindowId = null;
      }
    },

    /**
     * 更新窗口配置
     * @param windowId - 窗口 ID
     * @param updates - 要更新的配置
     */
    updateWindow(windowId: string, updates: Partial<WindowConfig>): void {
      const window = this.windowList.find(w => w.id === windowId);
      if (window) {
        Object.assign(window, updates);
      }
    },

    /**
     * 获取窗口
     * @param windowId - 窗口 ID
     * @returns 窗口配置或 undefined
     */
    getWindow(windowId: string): WindowConfig | undefined {
      return this.windowList.find(w => w.id === windowId);
    },

    /**
     * 聚焦窗口
     * @param windowId - 窗口 ID
     */
    focusWindow(windowId: string): void {
      this.focusedWindowId = windowId;
      const window = this.windowList.find(w => w.id === windowId);
      if (window) {
        window.zIndex = ++this.maxZIndex;
      }
    },

    /**
     * 取消窗口焦点
     */
    blurWindow(): void {
      this.focusedWindowId = null;
    },

    /**
     * 移动窗口
     * @param windowId - 窗口 ID
     * @param x - X 坐标
     * @param y - Y 坐标
     */
    moveWindow(windowId: string, x: number, y: number): void {
      const window = this.windowList.find(w => w.id === windowId);
      if (window) {
        window.position = { x, y };
      }
    },

    /**
     * 调整窗口大小
     * @param windowId - 窗口 ID
     * @param width - 宽度
     * @param height - 高度
     */
    resizeWindow(windowId: string, width: number, height: number): void {
      const window = this.windowList.find(w => w.id === windowId);
      if (window) {
        window.size = { width, height };
      }
    },

    /**
     * 设置窗口状态
     * @param windowId - 窗口 ID
     * @param state - 窗口状态
     */
    setWindowState(windowId: string, state: WindowConfig['state']): void {
      const window = this.windowList.find(w => w.id === windowId);
      if (window) {
        window.state = state;
      }
    },

    /**
     * 更新画布状态
     * @param updates - 要更新的画布状态
     */
    updateCanvas(updates: Partial<CanvasState>): void {
      Object.assign(this.canvas, updates);
    },

    /**
     * 设置缩放
     * @param zoom - 缩放值（0.1 ~ 5）
     */
    setZoom(zoom: number): void {
      this.canvas.zoom = Math.max(0.1, Math.min(5, zoom));
    },

    /**
     * 增加缩放
     * @param delta - 增量
     */
    zoomIn(delta = 0.1): void {
      this.setZoom(this.canvas.zoom + delta);
    },

    /**
     * 减少缩放
     * @param delta - 减量
     */
    zoomOut(delta = 0.1): void {
      this.setZoom(this.canvas.zoom - delta);
    },

    /**
     * 平移画布
     * @param deltaX - X 方向位移
     * @param deltaY - Y 方向位移
     */
    pan(deltaX: number, deltaY: number): void {
      this.canvas.panX += deltaX;
      this.canvas.panY += deltaY;
    },

    /**
     * 设置画布位置
     * @param x - X 坐标
     * @param y - Y 坐标
     */
    setCanvasPosition(x: number, y: number): void {
      this.canvas.panX = x;
      this.canvas.panY = y;
    },

    /**
     * 重置画布
     */
    resetCanvas(): void {
      this.canvas = { zoom: 1, panX: 0, panY: 0 };
    },

    /**
     * 适应视口
     */
    fitToViewport(): void {
      // TODO: 根据窗口内容计算最佳缩放和位置
      this.resetCanvas();
    },

    /**
     * 切换侧边栏
     */
    toggleSidebar(): void {
      this.sidebarExpanded = !this.sidebarExpanded;
    },

    /**
     * 设置侧边栏展开状态
     * @param expanded - 是否展开
     */
    setSidebarExpanded(expanded: boolean): void {
      this.sidebarExpanded = expanded;
    },

    /**
     * 设置侧边栏宽度
     * @param width - 宽度（像素）
     */
    setSidebarWidth(width: number): void {
      this.sidebarWidth = Math.max(200, Math.min(400, width));
    },

    /**
     * 设置程序坞位置
     * @param position - 位置
     */
    setDockPosition(position: DockPosition): void {
      this.dockPosition = position;
    },

    /**
     * 切换程序坞可见性
     */
    toggleDockVisible(): void {
      this.dockVisible = !this.dockVisible;
    },

    /**
     * 设置程序坞可见性
     * @param visible - 是否可见
     */
    setDockVisible(visible: boolean): void {
      this.dockVisible = visible;
    },

    /**
     * 设置主题
     * @param theme - 主题 ID
     */
    setTheme(theme: string): void {
      this.theme = theme;
    },

    /**
     * 切换网格显示
     */
    toggleGrid(): void {
      this.showGrid = !this.showGrid;
    },

    /**
     * 设置网格显示状态
     * @param show - 是否显示
     */
    setShowGrid(show: boolean): void {
      this.showGrid = show;
    },

    /**
     * 切换网格吸附
     */
    toggleSnapToGrid(): void {
      this.snapToGrid = !this.snapToGrid;
    },

    /**
     * 设置网格吸附状态
     * @param snap - 是否吸附
     */
    setSnapToGrid(snap: boolean): void {
      this.snapToGrid = snap;
    },

    /**
     * 设置网格大小
     * @param size - 网格大小（像素）
     */
    setGridSize(size: number): void {
      this.gridSize = Math.max(10, Math.min(100, size));
    },

    /**
     * 最小化工具窗口
     * @param toolId - 工具窗口 ID
     */
    minimizeTool(toolId: string): void {
      if (!this.minimizedToolIds.includes(toolId)) {
        this.minimizedToolIds.push(toolId);
      }
      
      const window = this.windowList.find(w => w.id === toolId);
      if (window) {
        window.state = 'minimized';
      }
    },

    /**
     * 恢复工具窗口
     * @param toolId - 工具窗口 ID
     */
    restoreTool(toolId: string): void {
      const index = this.minimizedToolIds.indexOf(toolId);
      if (index >= 0) {
        this.minimizedToolIds.splice(index, 1);
      }
      
      const window = this.windowList.find(w => w.id === toolId);
      if (window) {
        window.state = 'normal';
      }
    },

    /**
     * 切换全屏模式
     */
    toggleFullscreen(): void {
      this.isFullscreen = !this.isFullscreen;
    },

    /**
     * 设置全屏模式
     * @param fullscreen - 是否全屏
     */
    setFullscreen(fullscreen: boolean): void {
      this.isFullscreen = fullscreen;
    },

    /**
     * 设置拖动状态
     * @param dragging - 是否正在拖动
     */
    setDragging(dragging: boolean): void {
      this.isDragging = dragging;
    },

    /**
     * 清除所有窗口
     */
    clearWindows(): void {
      this.windowList = [];
      this.focusedWindowId = null;
      this.minimizedToolIds = [];
    },

    /**
     * 重置 UI 状态
     */
    reset(): void {
      this.clearWindows();
      this.resetCanvas();
      this.sidebarExpanded = true;
      this.dockVisible = true;
      this.isFullscreen = false;
      this.isDragging = false;
    },
  },
});

/** 导出类型 */
export type UIStore = ReturnType<typeof useUIStore>;
