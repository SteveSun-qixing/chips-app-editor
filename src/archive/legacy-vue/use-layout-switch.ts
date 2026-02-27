/**
 * 布局切换 Hook
 * @module layouts/use-layout-switch
 * @description 提供布局切换功能，支持在无限画布和工作台布局之间平滑切换
 */

import { ref, computed, nextTick, type ComputedRef, type Ref } from 'vue';
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
 * 布局切换返回类型
 */
export interface LayoutSwitchReturn {
  /** 当前布局类型 */
  currentLayout: ComputedRef<LayoutType>;
  /** 是否正在切换 */
  isSwitching: Ref<boolean>;
  /** 是否为无限画布布局 */
  isInfiniteCanvas: ComputedRef<boolean>;
  /** 是否为工作台布局 */
  isWorkbench: ComputedRef<boolean>;
  /** 切换到指定布局 */
  switchTo: (layout: LayoutType) => Promise<void>;
  /** 切换到无限画布 */
  switchToCanvas: () => Promise<void>;
  /** 切换到工作台 */
  switchToWorkbench: () => Promise<void>;
  /** 切换布局（在两种布局之间切换） */
  toggleLayout: () => Promise<void>;
  /** 保存的窗口状态 */
  savedWindowState: Ref<WindowConfig[]>;
}

/** 默认选项 */
const DEFAULT_OPTIONS: Required<LayoutSwitchOptions> = {
  enableTransition: true,
  transitionDuration: 300,
  preserveCardState: true,
  onBeforeSwitch: () => {},
  onAfterSwitch: () => {},
};

/**
 * 布局切换 Hook
 * @param options - 切换选项
 * @returns 布局切换控制方法和状态
 * 
 * @example
 * ```typescript
 * const { 
 *   currentLayout,
 *   isSwitching,
 *   toggleLayout,
 *   switchToCanvas,
 *   switchToWorkbench,
 * } = useLayoutSwitch({
 *   enableTransition: true,
 *   preserveCardState: true,
 *   onAfterSwitch: (from, to) => {
 *     console.warn(`Switched from ${from} to ${to}`);
 *   }
 * });
 * ```
 */
export function useLayoutSwitch(
  options: LayoutSwitchOptions = {}
): LayoutSwitchReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const editorStore = getEditorStore();
  const uiStore = getUIStore();

  /** 是否正在切换 */
  const isSwitching = ref(false);

  /** 保存的窗口状态（用于布局切换时恢复） */
  const savedWindowState = ref<WindowConfig[]>([]);

  /** 当前布局类型 */
  const currentLayout = computed(() => editorStore.currentLayout);

  /** 是否为无限画布布局 */
  const isInfiniteCanvas = computed(() => currentLayout.value === 'infinite-canvas');

  /** 是否为工作台布局 */
  const isWorkbench = computed(() => currentLayout.value === 'workbench');

  /**
   * 保存当前窗口状态
   */
  function saveWindowState(): void {
    if (opts.preserveCardState) {
      savedWindowState.value = [...uiStore.windowList];
    }
  }

  /**
   * 恢复窗口状态
   */
  function restoreWindowState(): void {
    if (opts.preserveCardState && savedWindowState.value.length > 0) {
      // 清除当前窗口
      uiStore.clearWindows();
      
      // 恢复保存的窗口
      for (const window of savedWindowState.value) {
        uiStore.addWindow({ ...window });
      }
      
      // 恢复焦点窗口
      const lastFocused = savedWindowState.value.find(
        w => w.id === uiStore.focusedWindowId
      );
      if (lastFocused) {
        uiStore.focusWindow(lastFocused.id);
      }
    }
  }

  /**
   * 执行布局切换
   * @param targetLayout - 目标布局
   */
  async function performSwitch(targetLayout: LayoutType): Promise<void> {
    const fromLayout = currentLayout.value;

    // 如果目标布局与当前布局相同，不执行切换
    if (fromLayout === targetLayout) {
      return;
    }

    isSwitching.value = true;

    try {
      // 切换前回调
      await opts.onBeforeSwitch(fromLayout, targetLayout);

      // 保存当前窗口状态
      saveWindowState();

      // 等待下一帧以确保 DOM 更新
      await nextTick();

      // 如果启用过渡动画，添加过渡类
      if (opts.enableTransition) {
        document.body.classList.add('layout-transitioning');
      }

      // 执行布局切换
      editorStore.setLayout(targetLayout);

      // 等待过渡完成
      if (opts.enableTransition) {
        await new Promise(resolve => setTimeout(resolve, opts.transitionDuration));
        document.body.classList.remove('layout-transitioning');
      }

      // 恢复窗口状态
      await nextTick();
      restoreWindowState();

      // 切换后回调
      await opts.onAfterSwitch(fromLayout, targetLayout);

    } catch (error) {
      console.error('Layout switch failed:', error);
      // 发生错误时恢复原布局
      editorStore.setLayout(fromLayout);
    } finally {
      isSwitching.value = false;
    }
  }

  /**
   * 切换到指定布局
   * @param layout - 目标布局
   */
  async function switchTo(layout: LayoutType): Promise<void> {
    if (isSwitching.value) return;
    await performSwitch(layout);
  }

  /**
   * 切换到无限画布
   */
  async function switchToCanvas(): Promise<void> {
    await switchTo('infinite-canvas');
  }

  /**
   * 切换到工作台
   */
  async function switchToWorkbench(): Promise<void> {
    await switchTo('workbench');
  }

  /**
   * 切换布局（在两种布局之间切换）
   */
  async function toggleLayout(): Promise<void> {
    const targetLayout: LayoutType = isInfiniteCanvas.value ? 'workbench' : 'infinite-canvas';
    await switchTo(targetLayout);
  }

  return {
    currentLayout,
    isSwitching,
    isInfiniteCanvas,
    isWorkbench,
    switchTo,
    switchToCanvas,
    switchToWorkbench,
    toggleLayout,
    savedWindowState,
  };
}
