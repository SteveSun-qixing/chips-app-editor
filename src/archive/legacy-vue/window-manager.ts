/**
 * 窗口管理器
 * @module core/window-manager
 * @description 负责创建、管理、销毁窗口
 */

import { useUIStore, useCardStore } from '@/core/state';
import type {
  WindowConfig,
  CardWindowConfig,
  ToolWindowConfig,
  WindowPosition,
  WindowSize,
  WindowState,
} from '@/types';
import { generateScopedId } from '@/utils';
import { t } from '@/services/i18n-service';

/**
 * 窗口管理器类
 *
 * 负责：
 * - 创建卡片窗口和工具窗口
 * - 管理窗口状态（移动、缩放、聚焦、最小化等）
 * - 窗口平铺和布局
 * - 与 UI Store 交互
 *
 * @example
 * ```typescript
 * const manager = useWindowManager();
 *
 * // 创建卡片窗口
 * const windowId = manager.createCardWindow('card-123', {
 *   title: '我的卡片',
 * });
 *
 * // 创建工具窗口
 * manager.createToolWindow('FileManager', {
 *   title: '文件管理器',
 *   icon: '📁',
 * });
 *
 * // 平铺所有窗口
 * manager.tileWindows();
 * ```
 */
export class WindowManager {
  private uiStore: ReturnType<typeof useUIStore> | null = null;
  private cardStore: ReturnType<typeof useCardStore> | null = null;

  /**
   * 获取 UI Store（延迟初始化）
   */
  private getUIStore(): ReturnType<typeof useUIStore> {
    if (!this.uiStore) {
      this.uiStore = useUIStore();
    }
    return this.uiStore;
  }

  /**
   * 获取 Card Store（延迟初始化）
   */
  private getCardStore(): ReturnType<typeof useCardStore> {
    if (!this.cardStore) {
      this.cardStore = useCardStore();
    }
    return this.cardStore;
  }

  /**
   * 创建卡片窗口
   * @param cardId - 卡片 ID
   * @param options - 窗口配置选项
   * @returns 窗口 ID
   */
  createCardWindow(
    cardId: string,
    options?: Partial<Omit<CardWindowConfig, 'id' | 'type' | 'cardId'>>
  ): string {
    const uiStore = this.getUIStore();
    const cardStore = this.getCardStore();

    const windowId = generateScopedId('card-window');
    const position = this.getNextWindowPosition();
    const cardInfo = cardStore.openCards.get(cardId);

    const config: CardWindowConfig = {
      id: windowId,
      type: 'card',
      title: cardInfo?.metadata.name || options?.title || t('common.untitled_card'),
      cardId,
      position: options?.position ?? position,
      size: options?.size ?? { width: 400, height: 600 },
      state: 'normal',
      zIndex: 0,
      isEditing: false,
      resizable: true,
      draggable: true,
      closable: true,
      minimizable: true,
      ...options,
    };

    uiStore.addWindow(config);
    return windowId;
  }

  /**
   * 创建工具窗口
   * @param component - 工具组件名称
   * @param options - 窗口配置选项
   * @returns 窗口 ID
   */
  createToolWindow(
    component: string,
    options?: Partial<Omit<ToolWindowConfig, 'id' | 'type' | 'component'>>
  ): string {
    const uiStore = this.getUIStore();

    const windowId = generateScopedId('tool-window');
    const position = this.getNextWindowPosition();

    const config: ToolWindowConfig = {
      id: windowId,
      type: 'tool',
      title: options?.title || component,
      component,
      position: options?.position ?? position,
      size: options?.size ?? { width: 300, height: 400 },
      state: 'normal',
      zIndex: 0,
      icon: options?.icon,
      resizable: true,
      draggable: true,
      closable: true,
      minimizable: true,
      dockable: true,
      ...options,
    };

    uiStore.addWindow(config);
    return windowId;
  }

  /**
   * 关闭窗口
   * @param windowId - 窗口 ID
   */
  closeWindow(windowId: string): void {
    const uiStore = this.getUIStore();
    uiStore.removeWindow(windowId);
  }

  /**
   * 聚焦窗口
   * @param windowId - 窗口 ID
   */
  focusWindow(windowId: string): void {
    const uiStore = this.getUIStore();
    uiStore.focusWindow(windowId);
  }

  /**
   * 取消窗口焦点
   */
  blurWindow(): void {
    const uiStore = this.getUIStore();
    uiStore.blurWindow();
  }

  /**
   * 移动窗口
   * @param windowId - 窗口 ID
   * @param position - 新位置
   */
  moveWindow(windowId: string, position: WindowPosition): void {
    const uiStore = this.getUIStore();
    uiStore.moveWindow(windowId, position.x, position.y);
  }

  /**
   * 调整窗口大小
   * @param windowId - 窗口 ID
   * @param size - 新大小
   */
  resizeWindow(windowId: string, size: WindowSize): void {
    const uiStore = this.getUIStore();
    uiStore.resizeWindow(windowId, size.width, size.height);
  }

  /**
   * 更新窗口配置
   * @param windowId - 窗口 ID
   * @param updates - 要更新的配置
   */
  updateWindow(windowId: string, updates: Partial<WindowConfig>): void {
    const uiStore = this.getUIStore();
    uiStore.updateWindow(windowId, updates);
  }

  /**
   * 设置窗口状态
   * @param windowId - 窗口 ID
   * @param state - 窗口状态
   */
  setWindowState(windowId: string, state: WindowState): void {
    const uiStore = this.getUIStore();
    uiStore.setWindowState(windowId, state);
  }

  /**
   * 最小化窗口
   * @param windowId - 窗口 ID
   */
  minimizeWindow(windowId: string): void {
    this.setWindowState(windowId, 'minimized');
  }

  /**
   * 恢复窗口
   * @param windowId - 窗口 ID
   */
  restoreWindow(windowId: string): void {
    const uiStore = this.getUIStore();

    // 如果是工具窗口，从最小化列表中移除
    if (uiStore.minimizedTools.has(windowId)) {
      uiStore.restoreTool(windowId);
    }

    this.setWindowState(windowId, 'normal');
  }

  /**
   * 切换窗口折叠状态
   * @param windowId - 窗口 ID
   */
  toggleCollapse(windowId: string): void {
    const window = this.getWindow(windowId);
    if (window) {
      const newState = window.state === 'collapsed' ? 'normal' : 'collapsed';
      this.setWindowState(windowId, newState);
    }
  }

  /**
   * 获取窗口配置
   * @param windowId - 窗口 ID
   * @returns 窗口配置或 undefined
   */
  getWindow(windowId: string): WindowConfig | undefined {
    const uiStore = this.getUIStore();
    return uiStore.getWindow(windowId);
  }

  /**
   * 获取所有窗口
   * @returns 窗口配置数组
   */
  getAllWindows(): WindowConfig[] {
    const uiStore = this.getUIStore();
    return uiStore.windowList;
  }

  /**
   * 获取所有卡片窗口
   * @returns 卡片窗口配置数组
   */
  getCardWindows(): CardWindowConfig[] {
    const uiStore = this.getUIStore();
    return uiStore.cardWindows;
  }

  /**
   * 获取所有工具窗口
   * @returns 工具窗口配置数组
   */
  getToolWindows(): ToolWindowConfig[] {
    const uiStore = this.getUIStore();
    return uiStore.toolWindows;
  }

  /**
   * 获取焦点窗口
   * @returns 焦点窗口配置或 null
   */
  getFocusedWindow(): WindowConfig | null {
    const uiStore = this.getUIStore();
    return uiStore.focusedWindow;
  }

  /**
   * 检查窗口是否存在
   * @param windowId - 窗口 ID
   * @returns 是否存在
   */
  hasWindow(windowId: string): boolean {
    const uiStore = this.getUIStore();
    return uiStore.getWindow(windowId) !== undefined;
  }

  /**
   * 获取下一个窗口位置（级联排列）
   * @returns 窗口位置
   */
  private getNextWindowPosition(): WindowPosition {
    const uiStore = this.getUIStore();
    const windows = uiStore.windowList;
    const offset = (windows.length % 10) * 30;
    return {
      x: 100 + offset,
      y: 100 + offset,
    };
  }

  /**
   * 平铺所有窗口
   * @param options - 平铺选项
   */
  tileWindows(options?: {
    windowWidth?: number;
    windowHeight?: number;
    gap?: number;
    startX?: number;
    startY?: number;
  }): void {
    const uiStore = this.getUIStore();
    const windows = uiStore.windowList.filter((w) => w.state === 'normal');

    if (windows.length === 0) return;

    const {
      windowWidth = 400,
      windowHeight = 300,
      gap = 20,
      startX = 50,
      startY = 50,
    } = options ?? {};

    const cols = Math.ceil(Math.sqrt(windows.length));

    windows.forEach((window, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      this.moveWindow(window.id, {
        x: col * (windowWidth + gap) + startX,
        y: row * (windowHeight + gap) + startY,
      });

      this.resizeWindow(window.id, {
        width: windowWidth,
        height: windowHeight,
      });
    });
  }

  /**
   * 层叠所有窗口
   * @param options - 层叠选项
   */
  cascadeWindows(options?: {
    startX?: number;
    startY?: number;
    offsetX?: number;
    offsetY?: number;
  }): void {
    const uiStore = this.getUIStore();
    const windows = uiStore.windowList.filter((w) => w.state === 'normal');

    if (windows.length === 0) return;

    const {
      startX = 50,
      startY = 50,
      offsetX = 30,
      offsetY = 30,
    } = options ?? {};

    windows.forEach((window, index) => {
      this.moveWindow(window.id, {
        x: startX + index * offsetX,
        y: startY + index * offsetY,
      });
      // 同时聚焦窗口以更新 z-index
      this.focusWindow(window.id);
    });
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    const uiStore = this.getUIStore();
    const windows = [...uiStore.windowList];
    windows.forEach((window) => {
      this.closeWindow(window.id);
    });
  }

  /**
   * 最小化所有窗口
   */
  minimizeAllWindows(): void {
    const uiStore = this.getUIStore();
    const windows = uiStore.windowList.filter((w) => w.state === 'normal');
    windows.forEach((window) => {
      this.minimizeWindow(window.id);
    });
  }

  /**
   * 恢复所有窗口
   */
  restoreAllWindows(): void {
    const uiStore = this.getUIStore();
    const windows = uiStore.windowList.filter((w) => w.state === 'minimized');
    windows.forEach((window) => {
      this.restoreWindow(window.id);
    });
  }

  /**
   * 根据卡片 ID 查找窗口
   * @param cardId - 卡片 ID
   * @returns 窗口配置或 undefined
   */
  findWindowByCardId(cardId: string): CardWindowConfig | undefined {
    const cardWindows = this.getCardWindows();
    return cardWindows.find((w) => w.cardId === cardId);
  }

  /**
   * 根据组件名称查找工具窗口
   * @param component - 组件名称
   * @returns 窗口配置数组
   */
  findWindowsByComponent(component: string): ToolWindowConfig[] {
    const toolWindows = this.getToolWindows();
    return toolWindows.filter((w) => w.component === component);
  }

  /**
   * 重置窗口管理器状态
   */
  reset(): void {
    const uiStore = this.getUIStore();
    uiStore.clearWindows();
  }
}

// 单例实例
let windowManager: WindowManager | null = null;

/**
 * 获取窗口管理器实例
 * @returns WindowManager 实例
 *
 * @example
 * ```typescript
 * const manager = useWindowManager();
 * manager.createCardWindow('card-123');
 * ```
 */
export function useWindowManager(): WindowManager {
  if (!windowManager) {
    windowManager = new WindowManager();
  }
  return windowManager;
}

/**
 * 重置窗口管理器（主要用于测试）
 */
export function resetWindowManager(): void {
  if (windowManager) {
    windowManager.reset();
  }
  windowManager = null;
}
