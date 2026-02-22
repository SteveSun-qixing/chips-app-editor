/**
 * 键盘快捷键组合式函数
 * @module composables/use-keyboard-shortcuts
 * @description 提供撤销/重做快捷键绑定
 */

import { onMounted, onUnmounted, ref, readonly } from 'vue';
import { useCommandManager } from '@/core/command-manager';

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 撤销快捷键 */
  undo: string;
  /** 重做快捷键 */
  redo: string;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 快捷键状态
 */
export interface ShortcutState {
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 撤销栈大小 */
  undoStackSize: number;
  /** 重做栈大小 */
  redoStackSize: number;
}

/**
 * 检测是否为 Mac 系统
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * 检测修饰键是否匹配
 * @param event - 键盘事件
 * @param requireCtrlOrCmd - 是否需要 Ctrl/Cmd
 * @param requireShift - 是否需要 Shift
 */
function checkModifiers(
  event: KeyboardEvent,
  requireCtrlOrCmd: boolean,
  requireShift: boolean
): boolean {
  const mac = isMac();
  const ctrlOrCmd = mac ? event.metaKey : event.ctrlKey;
  
  if (requireCtrlOrCmd && !ctrlOrCmd) return false;
  if (!requireCtrlOrCmd && ctrlOrCmd) return false;
  if (requireShift && !event.shiftKey) return false;
  if (!requireShift && event.shiftKey) return false;
  if (event.altKey) return false;
  
  return true;
}

/**
 * 键盘快捷键组合式函数
 * 
 * 提供撤销/重做快捷键绑定：
 * - Ctrl/Cmd+Z: 撤销
 * - Ctrl/Cmd+Shift+Z: 重做
 * 
 * @param config - 配置选项
 * @returns 快捷键状态和方法
 * 
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useKeyboardShortcuts } from '@/composables/use-keyboard-shortcuts';
 * 
 * const { state, undo, redo, setEnabled } = useKeyboardShortcuts();
 * </script>
 * 
 * <template>
 *   <button @click="undo" :disabled="!state.canUndo">撤销</button>
 *   <button @click="redo" :disabled="!state.canRedo">重做</button>
 * </template>
 * ```
 */
export function useKeyboardShortcuts(config: Partial<ShortcutConfig> = {}) {
  const commandManager = useCommandManager();
  
  // 配置
  const enabled = ref(config.enabled ?? true);
  
  // 状态
  const state = ref<ShortcutState>({
    canUndo: commandManager.canUndo(),
    canRedo: commandManager.canRedo(),
    undoStackSize: commandManager.undoStackSize,
    redoStackSize: commandManager.redoStackSize,
  });
  
  // 更新状态
  const updateState = () => {
    state.value = {
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
      undoStackSize: commandManager.undoStackSize,
      redoStackSize: commandManager.redoStackSize,
    };
  };
  
  // 撤销操作
  const undo = async (): Promise<boolean> => {
    if (!enabled.value || !state.value.canUndo) {
      return false;
    }
    
    const result = await commandManager.undo();
    updateState();
    return result;
  };
  
  // 重做操作
  const redo = async (): Promise<boolean> => {
    if (!enabled.value || !state.value.canRedo) {
      return false;
    }
    
    const result = await commandManager.redo();
    updateState();
    return result;
  };
  
  // 设置启用状态
  const setEnabled = (value: boolean) => {
    enabled.value = value;
  };
  
  // 键盘事件处理器
  const handleKeyDown = async (event: KeyboardEvent) => {
    if (!enabled.value) return;
    
    // 忽略输入框中的快捷键
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    // Ctrl/Cmd+Z: 撤销
    if (event.key === 'z' && checkModifiers(event, true, false)) {
      event.preventDefault();
      await undo();
      return;
    }
    
    // Ctrl/Cmd+Shift+Z: 重做
    if (event.key === 'z' && checkModifiers(event, true, true)) {
      event.preventDefault();
      await redo();
      return;
    }
    
    // Ctrl/Cmd+Y: 重做（Windows 风格）
    if (event.key === 'y' && checkModifiers(event, true, false)) {
      event.preventDefault();
      await redo();
      return;
    }
  };
  
  // 订阅状态变化
  const handleStateChange = () => {
    updateState();
  };
  
  onMounted(() => {
    // 注册键盘事件
    window.addEventListener('keydown', handleKeyDown);
    
    // 订阅命令管理器状态变化
    commandManager.on('state:changed', handleStateChange);
    commandManager.on('command:executed', handleStateChange);
    commandManager.on('command:undone', handleStateChange);
    commandManager.on('command:redone', handleStateChange);
    commandManager.on('history:cleared', handleStateChange);
  });
  
  onUnmounted(() => {
    // 注销键盘事件
    window.removeEventListener('keydown', handleKeyDown);
    
    // 取消订阅
    commandManager.off('state:changed', handleStateChange);
    commandManager.off('command:executed', handleStateChange);
    commandManager.off('command:undone', handleStateChange);
    commandManager.off('command:redone', handleStateChange);
    commandManager.off('history:cleared', handleStateChange);
  });
  
  return {
    /** 快捷键状态（只读） */
    state: readonly(state),
    /** 是否启用 */
    enabled: readonly(enabled),
    /** 执行撤销 */
    undo,
    /** 执行重做 */
    redo,
    /** 设置启用状态 */
    setEnabled,
    /** 手动更新状态 */
    updateState,
  };
}

/**
 * 全局快捷键钩子
 * 
 * 与 useKeyboardShortcuts 类似，但不需要在组件中挂载
 * 适用于非组件场景
 * 
 * @example
 * ```typescript
 * const { install, uninstall, undo, redo } = createKeyboardShortcuts();
 * install();
 * // ... 使用
 * uninstall();
 * ```
 */
export function createKeyboardShortcuts(config: Partial<ShortcutConfig> = {}) {
  const commandManager = useCommandManager();
  let enabled = config.enabled ?? true;
  let installed = false;
  
  const handleKeyDown = async (event: KeyboardEvent) => {
    if (!enabled) return;
    
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    // Ctrl/Cmd+Z: 撤销
    if (event.key === 'z' && checkModifiers(event, true, false)) {
      event.preventDefault();
      await commandManager.undo();
      return;
    }
    
    // Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y: 重做
    if (
      (event.key === 'z' && checkModifiers(event, true, true)) ||
      (event.key === 'y' && checkModifiers(event, true, false))
    ) {
      event.preventDefault();
      await commandManager.redo();
      return;
    }
  };
  
  return {
    /** 安装快捷键监听 */
    install: () => {
      if (!installed) {
        window.addEventListener('keydown', handleKeyDown);
        installed = true;
      }
    },
    /** 卸载快捷键监听 */
    uninstall: () => {
      if (installed) {
        window.removeEventListener('keydown', handleKeyDown);
        installed = false;
      }
    },
    /** 设置启用状态 */
    setEnabled: (value: boolean) => {
      enabled = value;
    },
    /** 执行撤销 */
    undo: () => commandManager.undo(),
    /** 执行重做 */
    redo: () => commandManager.redo(),
    /** 是否可以撤销 */
    canUndo: () => commandManager.canUndo(),
    /** 是否可以重做 */
    canRedo: () => commandManager.canRedo(),
  };
}
