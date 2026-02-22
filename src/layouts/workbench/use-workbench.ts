/**
 * 工作台布局控制 Hook
 * @module layouts/workbench/use-workbench
 * @description 提供工作台布局的响应式控制和状态管理
 */

import { ref, computed, reactive, watch, type ComputedRef, type Ref } from 'vue';
import { useUIStore } from '@/core/state';

/**
 * 工作台布局配置选项
 */
export interface WorkbenchOptions {
  /** 左侧面板默认宽度 */
  leftPanelWidth?: number;
  /** 右侧面板默认宽度 */
  rightPanelWidth?: number;
  /** 左侧面板最小宽度 */
  leftPanelMinWidth?: number;
  /** 左侧面板最大宽度 */
  leftPanelMaxWidth?: number;
  /** 右侧面板最小宽度 */
  rightPanelMinWidth?: number;
  /** 右侧面板最大宽度 */
  rightPanelMaxWidth?: number;
  /** 是否默认展开左侧面板 */
  leftPanelExpanded?: boolean;
  /** 是否默认展开右侧面板 */
  rightPanelExpanded?: boolean;
  /** 是否持久化布局配置 */
  persistLayout?: boolean;
  /** 本地存储键名 */
  storageKey?: string;
}

/**
 * 工作台布局状态
 */
export interface WorkbenchState {
  /** 左侧面板宽度 */
  leftPanelWidth: number;
  /** 右侧面板宽度 */
  rightPanelWidth: number;
  /** 左侧面板是否展开 */
  leftPanelExpanded: boolean;
  /** 右侧面板是否展开 */
  rightPanelExpanded: boolean;
  /** 是否显示左侧面板 */
  showLeftPanel: boolean;
  /** 是否显示右侧面板 */
  showRightPanel: boolean;
  /** 是否正在调整布局 */
  isResizing: boolean;
}

/**
 * Hook 返回类型
 */
export interface WorkbenchControlsReturn {
  /** 布局状态 */
  state: WorkbenchState;
  /** 左侧面板宽度 */
  leftPanelWidth: Ref<number>;
  /** 右侧面板宽度 */
  rightPanelWidth: Ref<number>;
  /** 左侧面板是否展开 */
  leftPanelExpanded: Ref<boolean>;
  /** 右侧面板是否展开 */
  rightPanelExpanded: Ref<boolean>;
  /** 是否显示左侧面板 */
  showLeftPanel: Ref<boolean>;
  /** 是否显示右侧面板 */
  showRightPanel: Ref<boolean>;
  /** 是否正在调整布局 */
  isResizing: Ref<boolean>;
  /** 主区域可用宽度 */
  mainAreaWidth: ComputedRef<number>;
  /** 切换左侧面板 */
  toggleLeftPanel: () => void;
  /** 切换右侧面板 */
  toggleRightPanel: () => void;
  /** 设置左侧面板宽度 */
  setLeftPanelWidth: (width: number) => void;
  /** 设置右侧面板宽度 */
  setRightPanelWidth: (width: number) => void;
  /** 展开左侧面板 */
  expandLeftPanel: () => void;
  /** 收起左侧面板 */
  collapseLeftPanel: () => void;
  /** 展开右侧面板 */
  expandRightPanel: () => void;
  /** 收起右侧面板 */
  collapseRightPanel: () => void;
  /** 显示左侧面板 */
  showLeft: () => void;
  /** 隐藏左侧面板 */
  hideLeft: () => void;
  /** 显示右侧面板 */
  showRight: () => void;
  /** 隐藏右侧面板 */
  hideRight: () => void;
  /** 重置布局 */
  resetLayout: () => void;
  /** 保存布局配置 */
  saveLayout: () => void;
  /** 加载布局配置 */
  loadLayout: () => void;
  /** 设置调整状态 */
  setResizing: (resizing: boolean) => void;
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<WorkbenchOptions> = {
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  leftPanelMinWidth: 180,
  leftPanelMaxWidth: 480,
  rightPanelMinWidth: 200,
  rightPanelMaxWidth: 500,
  leftPanelExpanded: true,
  rightPanelExpanded: true,
  persistLayout: false,
  storageKey: 'chips-workbench-layout',
};

/**
 * 工作台布局控制 Hook
 * @param options - 配置选项
 * @returns 工作台布局控制方法和状态
 * 
 * @example
 * ```typescript
 * const {
 *   leftPanelWidth,
 *   rightPanelWidth,
 *   toggleLeftPanel,
 *   toggleRightPanel,
 *   resetLayout,
 * } = useWorkbenchControls({
 *   leftPanelWidth: 280,
 *   rightPanelWidth: 320,
 *   persistLayout: true,
 * });
 * ```
 */
export function useWorkbenchControls(
  options: WorkbenchOptions = {}
): WorkbenchControlsReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const uiStore = useUIStore();

  // 响应式状态
  const leftPanelWidth = ref(opts.leftPanelWidth);
  const rightPanelWidth = ref(opts.rightPanelWidth);
  const leftPanelExpanded = ref(opts.leftPanelExpanded);
  const rightPanelExpanded = ref(opts.rightPanelExpanded);
  const showLeftPanel = ref(true);
  const showRightPanel = ref(true);
  const isResizing = ref(false);

  // 计算属性：主区域可用宽度
  const mainAreaWidth = computed(() => {
    // 假设总宽度为 window.innerWidth，实际使用时应该从容器获取
    const totalWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const leftWidth = showLeftPanel.value
      ? (leftPanelExpanded.value ? leftPanelWidth.value : 40)
      : 0;
    const rightWidth = showRightPanel.value
      ? (rightPanelExpanded.value ? rightPanelWidth.value : 40)
      : 0;
    return Math.max(300, totalWidth - leftWidth - rightWidth);
  });

  // 聚合状态对象
  const state = reactive<WorkbenchState>({
    get leftPanelWidth() { return leftPanelWidth.value; },
    get rightPanelWidth() { return rightPanelWidth.value; },
    get leftPanelExpanded() { return leftPanelExpanded.value; },
    get rightPanelExpanded() { return rightPanelExpanded.value; },
    get showLeftPanel() { return showLeftPanel.value; },
    get showRightPanel() { return showRightPanel.value; },
    get isResizing() { return isResizing.value; },
  });

  /**
   * 限制宽度在有效范围内
   * @param width - 宽度值
   * @param min - 最小宽度
   * @param max - 最大宽度
   */
  function clampWidth(width: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, width));
  }

  /**
   * 切换左侧面板展开状态
   */
  function toggleLeftPanel(): void {
    leftPanelExpanded.value = !leftPanelExpanded.value;
  }

  /**
   * 切换右侧面板展开状态
   */
  function toggleRightPanel(): void {
    rightPanelExpanded.value = !rightPanelExpanded.value;
  }

  /**
   * 设置左侧面板宽度
   * @param width - 新宽度
   */
  function setLeftPanelWidth(width: number): void {
    leftPanelWidth.value = clampWidth(width, opts.leftPanelMinWidth, opts.leftPanelMaxWidth);
  }

  /**
   * 设置右侧面板宽度
   * @param width - 新宽度
   */
  function setRightPanelWidth(width: number): void {
    rightPanelWidth.value = clampWidth(width, opts.rightPanelMinWidth, opts.rightPanelMaxWidth);
  }

  /**
   * 展开左侧面板
   */
  function expandLeftPanel(): void {
    leftPanelExpanded.value = true;
  }

  /**
   * 收起左侧面板
   */
  function collapseLeftPanel(): void {
    leftPanelExpanded.value = false;
  }

  /**
   * 展开右侧面板
   */
  function expandRightPanel(): void {
    rightPanelExpanded.value = true;
  }

  /**
   * 收起右侧面板
   */
  function collapseRightPanel(): void {
    rightPanelExpanded.value = false;
  }

  /**
   * 显示左侧面板
   */
  function showLeft(): void {
    showLeftPanel.value = true;
  }

  /**
   * 隐藏左侧面板
   */
  function hideLeft(): void {
    showLeftPanel.value = false;
  }

  /**
   * 显示右侧面板
   */
  function showRight(): void {
    showRightPanel.value = true;
  }

  /**
   * 隐藏右侧面板
   */
  function hideRight(): void {
    showRightPanel.value = false;
  }

  /**
   * 重置布局到默认配置
   */
  function resetLayout(): void {
    leftPanelWidth.value = opts.leftPanelWidth;
    rightPanelWidth.value = opts.rightPanelWidth;
    leftPanelExpanded.value = opts.leftPanelExpanded;
    rightPanelExpanded.value = opts.rightPanelExpanded;
    showLeftPanel.value = true;
    showRightPanel.value = true;
  }

  /**
   * 保存布局配置到本地存储
   */
  function saveLayout(): void {
    if (!opts.persistLayout || typeof localStorage === 'undefined') return;

    const layoutData = {
      leftPanelWidth: leftPanelWidth.value,
      rightPanelWidth: rightPanelWidth.value,
      leftPanelExpanded: leftPanelExpanded.value,
      rightPanelExpanded: rightPanelExpanded.value,
      showLeftPanel: showLeftPanel.value,
      showRightPanel: showRightPanel.value,
    };

    try {
      localStorage.setItem(opts.storageKey, JSON.stringify(layoutData));
    } catch (e) {
      console.warn('Failed to save workbench layout:', e);
    }
  }

  /**
   * 从本地存储加载布局配置
   */
  function loadLayout(): void {
    if (!opts.persistLayout || typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(opts.storageKey);
      if (stored) {
        const layoutData = JSON.parse(stored);
        if (layoutData.leftPanelWidth !== undefined) {
          leftPanelWidth.value = layoutData.leftPanelWidth;
        }
        if (layoutData.rightPanelWidth !== undefined) {
          rightPanelWidth.value = layoutData.rightPanelWidth;
        }
        if (layoutData.leftPanelExpanded !== undefined) {
          leftPanelExpanded.value = layoutData.leftPanelExpanded;
        }
        if (layoutData.rightPanelExpanded !== undefined) {
          rightPanelExpanded.value = layoutData.rightPanelExpanded;
        }
        if (layoutData.showLeftPanel !== undefined) {
          showLeftPanel.value = layoutData.showLeftPanel;
        }
        if (layoutData.showRightPanel !== undefined) {
          showRightPanel.value = layoutData.showRightPanel;
        }
      }
    } catch (e) {
      console.warn('Failed to load workbench layout:', e);
    }
  }

  /**
   * 设置调整状态
   * @param resizing - 是否正在调整
   */
  function setResizing(resizing: boolean): void {
    isResizing.value = resizing;
    uiStore.setDragging(resizing);
  }

  // 如果启用了持久化，监听变化并保存
  if (opts.persistLayout) {
    watch(
      [leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, showLeftPanel, showRightPanel],
      () => {
        saveLayout();
      },
      { deep: true }
    );

    // 初始化时加载布局
    loadLayout();
  }

  return {
    state,
    leftPanelWidth,
    rightPanelWidth,
    leftPanelExpanded,
    rightPanelExpanded,
    showLeftPanel,
    showRightPanel,
    isResizing,
    mainAreaWidth,
    toggleLeftPanel,
    toggleRightPanel,
    setLeftPanelWidth,
    setRightPanelWidth,
    expandLeftPanel,
    collapseLeftPanel,
    expandRightPanel,
    collapseRightPanel,
    showLeft,
    hideLeft,
    showRight,
    hideRight,
    resetLayout,
    saveLayout,
    loadLayout,
    setResizing,
  };
}
