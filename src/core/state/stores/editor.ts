/**
 * 编辑器状态管理 Store
 * @module core/state/stores/editor
 * @description 管理编辑器整体状态
 */

import { defineStore } from 'pinia';
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

/**
 * 编辑器状态 Store
 * 
 * 负责管理编辑器的整体状态，包括：
 * - 编辑器生命周期状态（idle、initializing、ready、error、destroyed）
 * - 布局配置
 * - SDK 连接状态
 * - 自动保存配置
 * - 错误状态
 * 
 * @example
 * ```typescript
 * const editorStore = useEditorStore();
 * 
 * // 检查编辑器是否就绪
 * if (editorStore.isReady) {
 *   // 执行操作
 * }
 * 
 * // 设置布局
 * editorStore.setLayout('workbench');
 * 
 * // 标记有未保存的更改
 * editorStore.markUnsaved();
 * ```
 */
export const useEditorStore = defineStore('editor', {
  state: (): EditorStoreState => ({
    state: 'idle',
    currentLayout: 'infinite-canvas',
    isConnected: false,
    debug: false,
    autoSaveInterval: 30000,
    lastSaveTime: null,
    hasUnsavedChanges: false,
    error: null,
    locale: 'zh-CN',
  }),

  getters: {
    /**
     * 编辑器是否就绪
     */
    isReady: (state): boolean => state.state === 'ready',

    /**
     * 编辑器是否正在初始化
     */
    isInitializing: (state): boolean => state.state === 'initializing',

    /**
     * 编辑器是否有错误
     */
    hasError: (state): boolean => state.error !== null,

    /**
     * 编辑器是否已销毁
     */
    isDestroyed: (state): boolean => state.state === 'destroyed',

    /**
     * 是否可以执行操作
     */
    canOperate: (state): boolean => state.state === 'ready' && state.isConnected,

    /**
     * 获取错误消息
     */
    errorMessage: (state): string | null => state.error?.message ?? null,
  },

  actions: {
    /**
     * 设置编辑器状态
     * @param newState - 新的编辑器状态
     */
    setState(newState: EditorState): void {
      this.state = newState;
    },

    /**
     * 设置布局
     * @param layout - 布局类型
     */
    setLayout(layout: LayoutType): void {
      this.currentLayout = layout;
    },

    /**
     * 设置连接状态
     * @param connected - 是否已连接
     */
    setConnected(connected: boolean): void {
      this.isConnected = connected;
    },

    /**
     * 设置调试模式
     * @param debug - 是否启用调试
     */
    setDebug(debug: boolean): void {
      this.debug = debug;
    },

    /**
     * 设置自动保存间隔
     * @param interval - 间隔时间（毫秒），0 表示禁用
     */
    setAutoSaveInterval(interval: number): void {
      this.autoSaveInterval = interval;
    },

    /**
     * 设置语言环境
     * @param locale - 语言代码
     */
    setLocale(locale: string): void {
      this.locale = locale;
    },

    /**
     * 标记有未保存的更改
     */
    markUnsaved(): void {
      this.hasUnsavedChanges = true;
    },

    /**
     * 标记已保存
     */
    markSaved(): void {
      this.hasUnsavedChanges = false;
      this.lastSaveTime = Date.now();
    },

    /**
     * 设置错误
     * @param error - 错误对象，null 表示清除错误
     */
    setError(error: Error | null): void {
      this.error = error;
      if (error) {
        this.state = 'error';
      }
    },

    /**
     * 清除错误
     */
    clearError(): void {
      this.error = null;
      // 恢复到就绪状态（如果之前是 error 状态）
      if (this.state === 'error') {
        this.state = 'ready';
      }
    },

    /**
     * 重置状态
     */
    reset(): void {
      this.state = 'idle';
      this.currentLayout = 'infinite-canvas';
      this.isConnected = false;
      this.hasUnsavedChanges = false;
      this.lastSaveTime = null;
      this.error = null;
    },

    /**
     * 初始化编辑器状态
     * @param options - 初始化选项
     */
    initialize(options: Partial<EditorStoreState> = {}): void {
      if (options.debug !== undefined) {
        this.debug = options.debug;
      }
      if (options.currentLayout) {
        this.currentLayout = options.currentLayout;
      }
      if (options.autoSaveInterval !== undefined) {
        this.autoSaveInterval = options.autoSaveInterval;
      }
      if (options.locale) {
        this.locale = options.locale;
      }
      this.state = 'initializing';
    },
  },
});

/** 导出类型 */
export type EditorStore = ReturnType<typeof useEditorStore>;
