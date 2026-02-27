/**
 * 编辑器状态管理 Store
 * @module core/state/stores/editor
 * @description 管理编辑器整体状态（框架无关实现）
 */

import { createStore } from '../store-core';
import { useStore } from '../use-store';
import type { EditorState, LayoutType } from '@/types';

/**
 * 编辑器 Store 状态接口
 */
export interface EditorStoreState {
  /** 编辑器状态 */
  state: EditorState;
  /** 当前布局 */
  currentLayout: LayoutType;
  /** 是否已连接 SDK */
  isConnected: boolean;
  /** 调试模式 */
  debug: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number;
  /** 最后保存时间 */
  lastSaveTime: number | null;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 语言环境 */
  locale: string;
}

// ─── Store 实例 ───────────────────────────────────────────

const editorStore = createStore<EditorStoreState>({
  state: 'idle',
  currentLayout: 'infinite-canvas',
  isConnected: false,
  debug: false,
  autoSaveInterval: 30000,
  lastSaveTime: null,
  hasUnsavedChanges: false,
  error: null,
  locale: 'zh-CN',
});

// ─── Getters（纯函数，从 state 派生） ─────────────────────

function _isReady(s: EditorStoreState): boolean {
  return s.state === 'ready';
}

function _isInitializing(s: EditorStoreState): boolean {
  return s.state === 'initializing';
}

function _hasError(s: EditorStoreState): boolean {
  return s.error !== null;
}

function _isDestroyed(s: EditorStoreState): boolean {
  return s.state === 'destroyed';
}

function _canOperate(s: EditorStoreState): boolean {
  return s.state === 'ready' && s.isConnected;
}

function _errorMessage(s: EditorStoreState): string | null {
  return s.error?.message ?? null;
}

// ─── Actions ──────────────────────────────────────────────

function setState(newState: EditorState): void {
  editorStore.setState({ state: newState });
}

function setLayout(layout: LayoutType): void {
  editorStore.setState({ currentLayout: layout });
}

function setConnected(connected: boolean): void {
  editorStore.setState({ isConnected: connected });
}

function setDebug(debug: boolean): void {
  editorStore.setState({ debug });
}

function setAutoSaveInterval(interval: number): void {
  editorStore.setState({ autoSaveInterval: interval });
}

function setLocale(locale: string): void {
  editorStore.setState({ locale });
}

function markUnsaved(): void {
  editorStore.setState({ hasUnsavedChanges: true });
}

function markSaved(): void {
  editorStore.setState({ hasUnsavedChanges: false, lastSaveTime: Date.now() });
}

function setError(error: Error | null): void {
  if (error) {
    editorStore.setState({ error, state: 'error' });
  } else {
    editorStore.setState({ error: null });
  }
}

function clearError(): void {
  const s = editorStore.getState();
  const updates: Partial<EditorStoreState> = { error: null };
  if (s.state === 'error') {
    updates.state = 'ready';
  }
  editorStore.setState(updates);
}

function reset(): void {
  editorStore.setState({
    state: 'idle',
    currentLayout: 'infinite-canvas',
    isConnected: false,
    hasUnsavedChanges: false,
    lastSaveTime: null,
    error: null,
  });
}

function initialize(options: Partial<EditorStoreState> = {}): void {
  const updates: Partial<EditorStoreState> = { state: 'initializing' };
  if (options.debug !== undefined) updates.debug = options.debug;
  if (options.currentLayout) updates.currentLayout = options.currentLayout;
  if (options.autoSaveInterval !== undefined) updates.autoSaveInterval = options.autoSaveInterval;
  if (options.locale) updates.locale = options.locale;
  editorStore.setState(updates);
}

// ─── 导出对象：非组件调用 ─────────────────────────────────

export type EditorStore = {
  getState: () => Readonly<EditorStoreState>;
  setState: (newState: EditorState) => void;
  setLayout: (layout: LayoutType) => void;
  setConnected: (connected: boolean) => void;
  setDebug: (debug: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setLocale: (locale: string) => void;
  markUnsaved: () => void;
  markSaved: () => void;
  setError: (error: Error | null) => void;
  clearError: () => void;
  reset: () => void;
  initialize: (options?: Partial<EditorStoreState>) => void;
  // Getters
  isReady: (s: EditorStoreState) => boolean;
  isInitializing: (s: EditorStoreState) => boolean;
  hasError: (s: EditorStoreState) => boolean;
  isDestroyed: (s: EditorStoreState) => boolean;
  canOperate: (s: EditorStoreState) => boolean;
  errorMessage: (s: EditorStoreState) => string | null;
};

/**
 * 获取 Editor Store 实例（非组件调用）
 *
 * @example
 * ```typescript
 * const store = getEditorStore();
 * store.setLayout('workbench');
 * const state = store.getState();
 * ```
 */
export function getEditorStore() {
  return {
    getState: editorStore.getState,
    setState,
    setLayout,
    setConnected,
    setDebug,
    setAutoSaveInterval,
    setLocale,
    markUnsaved,
    markSaved,
    setError,
    clearError,
    reset,
    initialize,
    isReady: _isReady,
    isInitializing: _isInitializing,
    hasError: _hasError,
    isDestroyed: _isDestroyed,
    canOperate: _canOperate,
    errorMessage: _errorMessage,
  };
}

/**
 * React Hook：使用 Editor Store（组件调用）
 *
 * @param selector - 状态选择器
 * @returns 选择器返回的状态片段
 *
 * @example
 * ```tsx
 * function LayoutButton() {
 *   const layout = useEditorStore(s => s.currentLayout);
 *   return <button>{layout}</button>;
 * }
 * ```
 */
export function useEditorStore(): Readonly<EditorStoreState>;
export function useEditorStore<U>(selector: (state: Readonly<EditorStoreState>) => U): U;
export function useEditorStore<U>(selector?: (state: Readonly<EditorStoreState>) => U): U | Readonly<EditorStoreState> {
  if (!selector) {
    return useStore(editorStore, (state) => state);
  }
  return useStore(editorStore, selector);
}

/** 暴露内部 store 用于测试 */
export const __editorStoreInternal = editorStore;
