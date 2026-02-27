/**
 * 布局切换工具
 * @module layouts/use-layout-switch
 * @description 提供布局切换功能（框架无关实现）
 *
 * 注意：此模块同时被服务层和组件调用，
 * 因此实现为纯函数 + getState()，不使用 React Hook。
 */

import { getEditorStore, getUIStore } from '@/core/state';
import type { LayoutType, WindowConfig } from '@/types';

/**
 * 布局切换选项
 */
export interface LayoutSwitchOptions {
  /** 是否启用过渡动画 */
  enableTransition?: boolean;
  /** 过渡持续时间（毫秒） */
  transitionDuration?: number;
  /** 是否保持卡片状态 */
  preserveCardState?: boolean;
  /** 切换前回调 */
  onBeforeSwitch?: (from: LayoutType, to: LayoutType) => void | Promise<void>;
  /** 切换后回调 */
  onAfterSwitch?: (from: LayoutType, to: LayoutType) => void | Promise<void>;
}

/**
 * 布局切换返回类型（框架无关）
 */
export interface LayoutSwitchReturn {
  /** 获取当前布局类型 */
  getCurrentLayout: () => LayoutType;
  /** 是否正在切换 */
  isSwitching: () => boolean;
  /** 切换到指定布局 */
  switchTo: (layout: LayoutType) => Promise<void>;
  /** 切换到无限画布 */
  switchToCanvas: () => Promise<void>;
  /** 切换到工作台 */
  switchToWorkbench: () => Promise<void>;
  /** 切换布局（在两种布局之间切换） */
  toggleLayout: () => Promise<void>;
  /** 获取保存的窗口状态 */
  getSavedWindowState: () => WindowConfig[];
}

/** 默认选项 */
const DEFAULT_OPTIONS: Required<LayoutSwitchOptions> = {
  enableTransition: true,
  transitionDuration: 300,
  preserveCardState: true,
  onBeforeSwitch: () => { },
  onAfterSwitch: () => { },
};

/**
 * 创建布局切换控制器
 *
 * @param options - 切换选项
 * @returns 布局切换控制方法
 *
 * @example
 * ```typescript
 * const layoutSwitch = createLayoutSwitch({
 *   enableTransition: true,
 *   onAfterSwitch: (from, to) => console.log(`${from} -> ${to}`),
 * });
 *
 * await layoutSwitch.switchToCanvas();
 * ```
 */
export function createLayoutSwitch(
  options: LayoutSwitchOptions = {},
): LayoutSwitchReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let switching = false;
  let savedWindowState: WindowConfig[] = [];

  function getCurrentLayout(): LayoutType {
    return getEditorStore().getState().currentLayout;
  }

  function isSwitching(): boolean {
    return switching;
  }

  function getSavedWindowState(): WindowConfig[] {
    return savedWindowState;
  }

  function saveWindowState(): void {
    if (opts.preserveCardState) {
      savedWindowState = [...getUIStore().getState().windowList];
    }
  }

  function restoreWindowState(): void {
    if (opts.preserveCardState && savedWindowState.length > 0) {
      const uiStore = getUIStore();
      uiStore.clearWindows();
      for (const w of savedWindowState) {
        uiStore.addWindow({ ...w });
      }
      const focusedId = getUIStore().getState().focusedWindowId;
      const lastFocused = savedWindowState.find((w) => w.id === focusedId);
      if (lastFocused) {
        uiStore.focusWindow(lastFocused.id);
      }
    }
  }

  async function performSwitch(targetLayout: LayoutType): Promise<void> {
    const editorStore = getEditorStore();
    const fromLayout = getCurrentLayout();

    if (fromLayout === targetLayout) return;

    switching = true;

    try {
      await opts.onBeforeSwitch(fromLayout, targetLayout);
      saveWindowState();

      // 过渡动画
      if (opts.enableTransition && typeof document !== 'undefined') {
        document.body.classList.add('layout-transitioning');
      }

      editorStore.setLayout(targetLayout);

      if (opts.enableTransition) {
        await new Promise((resolve) => setTimeout(resolve, opts.transitionDuration));
        if (typeof document !== 'undefined') {
          document.body.classList.remove('layout-transitioning');
        }
      }

      // 等待一帧再恢复窗口状态
      await new Promise((resolve) => requestAnimationFrame(resolve));
      restoreWindowState();

      await opts.onAfterSwitch(fromLayout, targetLayout);
    } catch (error) {
      console.error('Layout switch failed:', error);
      editorStore.setLayout(fromLayout);
    } finally {
      switching = false;
    }
  }

  async function switchTo(layout: LayoutType): Promise<void> {
    if (switching) return;
    await performSwitch(layout);
  }

  async function switchToCanvas(): Promise<void> {
    await switchTo('infinite-canvas');
  }

  async function switchToWorkbench(): Promise<void> {
    await switchTo('workbench');
  }

  async function toggleLayout(): Promise<void> {
    const target: LayoutType =
      getCurrentLayout() === 'infinite-canvas' ? 'workbench' : 'infinite-canvas';
    await switchTo(target);
  }

  return {
    getCurrentLayout,
    isSwitching,
    switchTo,
    switchToCanvas,
    switchToWorkbench,
    toggleLayout,
    getSavedWindowState,
  };
}

/**
 * 兼容旧接口的工厂函数
 * @deprecated 使用 createLayoutSwitch 替代
 */
export function useLayoutSwitch(options: LayoutSwitchOptions = {}): LayoutSwitchReturn {
  return createLayoutSwitch(options);
}
