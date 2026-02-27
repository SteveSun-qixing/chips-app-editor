/**
 * UI 状态管理 Store
 * @module core/state/stores/ui
 * @description 管理编辑器 UI 状态（框架无关实现）
 */

import { createStore } from '../store-core';
import { useStore } from '../use-store';
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
  /** 窗口列表 */
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

// ─── Store 实例 ───────────────────────────────────────────

const uiStore = createStore<UIStoreState>({
  windowList: [],
  focusedWindowId: null,
  maxZIndex: 100,
  canvas: { zoom: 1, panX: 0, panY: 0 },
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
});

// ─── Getters ──────────────────────────────────────────────

function _windows(s: UIStoreState): Map<string, WindowConfig> {
  const map = new Map<string, WindowConfig>();
  for (const w of s.windowList) {
    map.set(w.id, w);
  }
  return map;
}

function _cardWindows(s: UIStoreState): CardWindowConfig[] {
  return s.windowList.filter((w): w is CardWindowConfig => w.type === 'card');
}

function _toolWindows(s: UIStoreState): ToolWindowConfig[] {
  return s.windowList.filter((w): w is ToolWindowConfig => w.type === 'tool');
}

function _focusedWindow(s: UIStoreState): WindowConfig | null {
  if (!s.focusedWindowId) return null;
  return s.windowList.find((w) => w.id === s.focusedWindowId) ?? null;
}

function _zoomPercent(s: UIStoreState): number {
  return Math.round(s.canvas.zoom * 100);
}

function _windowCount(s: UIStoreState): number {
  return s.windowList.length;
}

function _hasWindows(s: UIStoreState): boolean {
  return s.windowList.length > 0;
}

function _minimizedToolList(s: UIStoreState): string[] {
  return s.minimizedToolIds;
}

function _minimizedTools(s: UIStoreState): Set<string> {
  return new Set(s.minimizedToolIds);
}

function _isDarkTheme(s: UIStoreState): boolean {
  return s.theme.includes('dark');
}

// ─── Actions ──────────────────────────────────────────────

function addWindow(config: WindowConfig): void {
  const s = uiStore.getState();
  const newMaxZIndex = s.maxZIndex + 1;
  const newConfig = { ...config, zIndex: newMaxZIndex };

  const existingIndex = s.windowList.findIndex((w) => w.id === config.id);
  let newWindowList: WindowConfig[];
  if (existingIndex >= 0) {
    newWindowList = [...s.windowList];
    newWindowList[existingIndex] = newConfig;
  } else {
    newWindowList = [...s.windowList, newConfig];
  }

  uiStore.setState({ windowList: newWindowList, maxZIndex: newMaxZIndex });
  console.warn('[UIStore] 添加窗口:', config.id, 'type:', config.type, '当前窗口数:', newWindowList.length);
}

function removeWindow(windowId: string): void {
  const s = uiStore.getState();
  const newWindowList = s.windowList.filter((w) => w.id !== windowId);
  const newMinimizedToolIds = s.minimizedToolIds.filter((id) => id !== windowId);
  const newFocusedWindowId = s.focusedWindowId === windowId ? null : s.focusedWindowId;

  uiStore.setState({
    windowList: newWindowList,
    minimizedToolIds: newMinimizedToolIds,
    focusedWindowId: newFocusedWindowId,
  });
}

function updateWindow(windowId: string, updates: Partial<WindowConfig>): void {
  const s = uiStore.getState();
  const newWindowList = s.windowList.map((w) =>
    w.id === windowId ? { ...w, ...updates } : w,
  );
  uiStore.setState({ windowList: newWindowList });
}

function getWindow(windowId: string): WindowConfig | undefined {
  return uiStore.getState().windowList.find((w) => w.id === windowId);
}

function focusWindow(windowId: string): void {
  const s = uiStore.getState();
  const newMaxZIndex = s.maxZIndex + 1;
  const newWindowList = s.windowList.map((w) =>
    w.id === windowId ? { ...w, zIndex: newMaxZIndex } : w,
  );
  uiStore.setState({
    windowList: newWindowList,
    focusedWindowId: windowId,
    maxZIndex: newMaxZIndex,
  });
}

function blurWindow(): void {
  uiStore.setState({ focusedWindowId: null });
}

function moveWindow(windowId: string, x: number, y: number): void {
  updateWindow(windowId, { position: { x, y } });
}

function resizeWindow(windowId: string, width: number, height: number): void {
  updateWindow(windowId, { size: { width, height } });
}

function setWindowState(windowId: string, state: WindowConfig['state']): void {
  updateWindow(windowId, { state });
}

function updateCanvas(updates: Partial<CanvasState>): void {
  const s = uiStore.getState();
  uiStore.setState({ canvas: { ...s.canvas, ...updates } });
}

function setZoom(zoom: number): void {
  updateCanvas({ zoom: Math.max(0.1, Math.min(5, zoom)) });
}

function zoomIn(delta = 0.1): void {
  const s = uiStore.getState();
  setZoom(s.canvas.zoom + delta);
}

function zoomOut(delta = 0.1): void {
  const s = uiStore.getState();
  setZoom(s.canvas.zoom - delta);
}

function pan(deltaX: number, deltaY: number): void {
  const s = uiStore.getState();
  updateCanvas({ panX: s.canvas.panX + deltaX, panY: s.canvas.panY + deltaY });
}

function setCanvasPosition(x: number, y: number): void {
  updateCanvas({ panX: x, panY: y });
}

function resetCanvas(): void {
  uiStore.setState({ canvas: { zoom: 1, panX: 0, panY: 0 } });
}

function fitToViewport(): void {
  const s = uiStore.getState();
  const visibleWindows = s.windowList.filter((w) => w.state !== 'minimized');
  if (visibleWindows.length === 0) {
    resetCanvas();
    return;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const w of visibleWindows) {
    minX = Math.min(minX, w.position.x);
    minY = Math.min(minY, w.position.y);
    maxX = Math.max(maxX, w.position.x + w.size.width);
    maxY = Math.max(maxY, w.position.y + w.size.height);
  }

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const safePadding = 64;

  const zoomByWidth = Math.max(0.1, (viewportWidth - safePadding * 2) / boundsWidth);
  const zoomByHeight = Math.max(0.1, (viewportHeight - safePadding * 2) / boundsHeight);
  const zoom = Math.min(5, Math.min(zoomByWidth, zoomByHeight));

  const centerX = minX + boundsWidth / 2;
  const centerY = minY + boundsHeight / 2;

  uiStore.setState({
    canvas: {
      zoom,
      panX: viewportWidth / 2 - centerX * zoom,
      panY: viewportHeight / 2 - centerY * zoom,
    },
  });
}

function toggleSidebar(): void {
  const s = uiStore.getState();
  uiStore.setState({ sidebarExpanded: !s.sidebarExpanded });
}

function setSidebarExpanded(expanded: boolean): void {
  uiStore.setState({ sidebarExpanded: expanded });
}

function setSidebarWidth(width: number): void {
  uiStore.setState({ sidebarWidth: Math.max(200, Math.min(400, width)) });
}

function setDockPosition(position: DockPosition): void {
  uiStore.setState({ dockPosition: position });
}

function toggleDockVisible(): void {
  const s = uiStore.getState();
  uiStore.setState({ dockVisible: !s.dockVisible });
}

function setDockVisible(visible: boolean): void {
  uiStore.setState({ dockVisible: visible });
}

function setTheme(theme: string): void {
  uiStore.setState({ theme });
}

function toggleGrid(): void {
  const s = uiStore.getState();
  uiStore.setState({ showGrid: !s.showGrid });
}

function setShowGrid(show: boolean): void {
  uiStore.setState({ showGrid: show });
}

function toggleSnapToGrid(): void {
  const s = uiStore.getState();
  uiStore.setState({ snapToGrid: !s.snapToGrid });
}

function setSnapToGrid(snap: boolean): void {
  uiStore.setState({ snapToGrid: snap });
}

function setGridSize(size: number): void {
  uiStore.setState({ gridSize: Math.max(10, Math.min(100, size)) });
}

function minimizeTool(toolId: string): void {
  const s = uiStore.getState();
  const newMinimizedToolIds = s.minimizedToolIds.includes(toolId)
    ? s.minimizedToolIds
    : [...s.minimizedToolIds, toolId];
  const newWindowList = s.windowList.map((w) =>
    w.id === toolId ? { ...w, state: 'minimized' as const } : w,
  );
  uiStore.setState({ minimizedToolIds: newMinimizedToolIds, windowList: newWindowList });
}

function restoreTool(toolId: string): void {
  const s = uiStore.getState();
  const newMinimizedToolIds = s.minimizedToolIds.filter((id) => id !== toolId);
  const newWindowList = s.windowList.map((w) =>
    w.id === toolId ? { ...w, state: 'normal' as const } : w,
  );
  uiStore.setState({ minimizedToolIds: newMinimizedToolIds, windowList: newWindowList });
}

function toggleFullscreen(): void {
  const s = uiStore.getState();
  uiStore.setState({ isFullscreen: !s.isFullscreen });
}

function setFullscreen(fullscreen: boolean): void {
  uiStore.setState({ isFullscreen: fullscreen });
}

function setDragging(dragging: boolean): void {
  uiStore.setState({ isDragging: dragging });
}

function clearWindows(): void {
  uiStore.setState({ windowList: [], focusedWindowId: null, minimizedToolIds: [] });
}

function uiReset(): void {
  clearWindows();
  resetCanvas();
  uiStore.setState({
    sidebarExpanded: true,
    dockVisible: true,
    isFullscreen: false,
    isDragging: false,
  });
}

// ─── 导出 ─────────────────────────────────────────────────

/**
 * 获取 UI Store 实例（非组件调用）
 */
export function getUIStore() {
  return {
    getState: uiStore.getState,
    // Window actions
    addWindow,
    removeWindow,
    updateWindow,
    getWindow,
    focusWindow,
    blurWindow,
    moveWindow,
    resizeWindow,
    setWindowState,
    // Canvas actions
    updateCanvas,
    setZoom,
    zoomIn,
    zoomOut,
    pan,
    setCanvasPosition,
    resetCanvas,
    fitToViewport,
    // Sidebar & Dock actions
    toggleSidebar,
    setSidebarExpanded,
    setSidebarWidth,
    setDockPosition,
    toggleDockVisible,
    setDockVisible,
    // Theme & Grid actions
    setTheme,
    toggleGrid,
    setShowGrid,
    toggleSnapToGrid,
    setSnapToGrid,
    setGridSize,
    // Tool minimization
    minimizeTool,
    restoreTool,
    // Fullscreen & Drag
    toggleFullscreen,
    setFullscreen,
    setDragging,
    // Clear & Reset
    clearWindows,
    reset: uiReset,
    // Getters
    windows: _windows,
    cardWindows: _cardWindows,
    toolWindows: _toolWindows,
    focusedWindow: _focusedWindow,
    zoomPercent: _zoomPercent,
    windowCount: _windowCount,
    hasWindows: _hasWindows,
    minimizedToolList: _minimizedToolList,
    minimizedTools: _minimizedTools,
    isDarkTheme: _isDarkTheme,
  };
}

/**
 * React Hook：使用 UI Store（组件调用）
 * 
 * 支持两种调用方式：
 * - useUIStore() - 返回整个 state
 * - useUIStore(selector) - 返回选择器选中的状态片段
 */
export function useUIStore(): Readonly<UIStoreState>;
export function useUIStore<U>(selector: (state: Readonly<UIStoreState>) => U): U;
export function useUIStore<U>(selector?: (state: Readonly<UIStoreState>) => U): U | Readonly<UIStoreState> {
  if (!selector) {
    return useStore(uiStore, (state) => state);
  }
  return useStore(uiStore, selector);
}

export type UIStore = ReturnType<typeof getUIStore>;

/** 暴露内部 store 用于测试 */
export const __uiStoreInternal = uiStore;
