/**
 * 窗口操作命令
 * @module core/commands/window-commands
 * @description 实现窗口相关的可撤销操作命令
 */

import type { Command } from '../command-manager';
import type { WindowConfig, WindowPosition, WindowSize } from '@/types';
import { getUIStore } from '../state';
import { deepClone } from '@/utils';

/**
 * 创建窗口命令
 * 
 * @example
 * ```typescript
 * const command = new CreateWindowCommand(windowConfig);
 * await commandManager.execute(command);
 * ```
 */
export class CreateWindowCommand implements Command {
  private windowConfig: WindowConfig;

  /**
   * 创建创建窗口命令
   * @param config - 窗口配置
   */
  constructor(config: WindowConfig) {
    this.windowConfig = deepClone(config);
  }

  async execute(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.addWindow(this.windowConfig);
  }

  async undo(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.removeWindow(this.windowConfig.id);
  }

  async redo(): Promise<void> {
    await this.execute();
  }

  get description(): string {
    return 'command.create_window';
  }
}

/**
 * 关闭窗口命令
 * 
 * @example
 * ```typescript
 * const command = new CloseWindowCommand(windowId);
 * await commandManager.execute(command);
 * ```
 */
export class CloseWindowCommand implements Command {
  private windowId: string;
  private savedConfig: WindowConfig | null = null;

  /**
   * 创建关闭窗口命令
   * @param windowId - 窗口 ID
   */
  constructor(windowId: string) {
    this.windowId = windowId;
  }

  async execute(): Promise<void> {
    const uiStore = getUIStore();
    const window = uiStore.getWindow(this.windowId);
    
    if (window) {
      // 保存窗口配置用于撤销
      this.savedConfig = deepClone(window);
    }
    
    uiStore.removeWindow(this.windowId);
  }

  async undo(): Promise<void> {
    if (this.savedConfig) {
      const uiStore = getUIStore();
      uiStore.addWindow(this.savedConfig);
    }
  }

  async redo(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.removeWindow(this.windowId);
  }

  get description(): string {
    return 'command.close_window';
  }
}

/**
 * 移动窗口命令
 * 
 * @example
 * ```typescript
 * const command = new MoveWindowCommand(windowId, { x: 100, y: 200 });
 * await commandManager.execute(command);
 * ```
 */
export class MoveWindowCommand implements Command {
  private windowId: string;
  private newPosition: WindowPosition;
  private oldPosition: WindowPosition | null = null;

  /**
   * 创建移动窗口命令
   * @param windowId - 窗口 ID
   * @param newPosition - 新位置
   */
  constructor(windowId: string, newPosition: WindowPosition) {
    this.windowId = windowId;
    this.newPosition = { ...newPosition };
  }

  async execute(): Promise<void> {
    const uiStore = getUIStore();
    const window = uiStore.getWindow(this.windowId);
    
    if (window) {
      // 保存旧位置
      this.oldPosition = { ...window.position };
      uiStore.moveWindow(this.windowId, this.newPosition.x, this.newPosition.y);
    }
  }

  async undo(): Promise<void> {
    if (this.oldPosition) {
      const uiStore = getUIStore();
      uiStore.moveWindow(this.windowId, this.oldPosition.x, this.oldPosition.y);
    }
  }

  async redo(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.moveWindow(this.windowId, this.newPosition.x, this.newPosition.y);
  }

  get description(): string {
    return 'command.move_window';
  }

  /**
   * 检查是否可以与另一个移动命令合并
   */
  canMergeWith(other: Command): boolean {
    if (other instanceof MoveWindowCommand) {
      return other.windowId === this.windowId;
    }
    return false;
  }

  /**
   * 与另一个移动命令合并
   */
  mergeWith(other: Command): void {
    if (other instanceof MoveWindowCommand) {
      // 保留最早的旧位置
      this.oldPosition = other.oldPosition;
    }
  }
}

/**
 * 调整窗口大小命令
 * 
 * @example
 * ```typescript
 * const command = new ResizeWindowCommand(windowId, { width: 400, height: 300 });
 * await commandManager.execute(command);
 * ```
 */
export class ResizeWindowCommand implements Command {
  private windowId: string;
  private newSize: WindowSize;
  private oldSize: WindowSize | null = null;

  /**
   * 创建调整窗口大小命令
   * @param windowId - 窗口 ID
   * @param newSize - 新大小
   */
  constructor(windowId: string, newSize: WindowSize) {
    this.windowId = windowId;
    this.newSize = { ...newSize };
  }

  async execute(): Promise<void> {
    const uiStore = getUIStore();
    const window = uiStore.getWindow(this.windowId);
    
    if (window) {
      // 保存旧大小
      this.oldSize = { ...window.size };
      uiStore.resizeWindow(this.windowId, this.newSize.width, this.newSize.height);
    }
  }

  async undo(): Promise<void> {
    if (this.oldSize) {
      const uiStore = getUIStore();
      uiStore.resizeWindow(this.windowId, this.oldSize.width, this.oldSize.height);
    }
  }

  async redo(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.resizeWindow(this.windowId, this.newSize.width, this.newSize.height);
  }

  get description(): string {
    return 'command.resize_window';
  }

  /**
   * 检查是否可以与另一个调整大小命令合并
   */
  canMergeWith(other: Command): boolean {
    if (other instanceof ResizeWindowCommand) {
      return other.windowId === this.windowId;
    }
    return false;
  }

  /**
   * 与另一个调整大小命令合并
   */
  mergeWith(other: Command): void {
    if (other instanceof ResizeWindowCommand) {
      // 保留最早的旧大小
      this.oldSize = other.oldSize;
    }
  }
}

/**
 * 设置窗口状态命令
 * 
 * @example
 * ```typescript
 * const command = new SetWindowStateCommand(windowId, 'minimized');
 * await commandManager.execute(command);
 * ```
 */
export class SetWindowStateCommand implements Command {
  private windowId: string;
  private newState: WindowConfig['state'];
  private oldState: WindowConfig['state'] | null = null;

  /**
   * 创建设置窗口状态命令
   * @param windowId - 窗口 ID
   * @param newState - 新状态
   */
  constructor(windowId: string, newState: WindowConfig['state']) {
    this.windowId = windowId;
    this.newState = newState;
  }

  async execute(): Promise<void> {
    const uiStore = getUIStore();
    const window = uiStore.getWindow(this.windowId);
    
    if (window) {
      // 保存旧状态
      this.oldState = window.state;
      uiStore.setWindowState(this.windowId, this.newState);
    }
  }

  async undo(): Promise<void> {
    if (this.oldState) {
      const uiStore = getUIStore();
      uiStore.setWindowState(this.windowId, this.oldState);
    }
  }

  async redo(): Promise<void> {
    const uiStore = getUIStore();
    uiStore.setWindowState(this.windowId, this.newState);
  }

  get description(): string {
    return 'command.set_window_state';
  }
}

/**
 * 批量窗口操作命令
 * 用于将多个窗口命令作为一个原子操作执行
 * 
 * @example
 * ```typescript
 * const command = new BatchWindowCommand([
 *   new MoveWindowCommand(windowId, { x: 100, y: 100 }),
 *   new ResizeWindowCommand(windowId, { width: 400, height: 300 }),
 * ], 'command.batch_window_operation');
 * await commandManager.execute(command);
 * ```
 */
export class BatchWindowCommand implements Command {
  private commands: Command[];
  private batchDescription: string;

  /**
   * 创建批量窗口操作命令
   * @param commands - 命令列表
   * @param description - 批量操作描述
   */
  constructor(commands: Command[], description = 'command.batch_window_operation') {
    this.commands = commands;
    this.batchDescription = description;
  }

  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i];
      if (command) {
        await command.undo();
      }
    }
  }

  async redo(): Promise<void> {
    for (const command of this.commands) {
      await command.redo();
    }
  }

  get description(): string {
    return this.batchDescription;
  }
}
