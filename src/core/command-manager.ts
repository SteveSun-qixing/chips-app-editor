/**
 * 命令管理器
 * @module core/command-manager
 * @description 实现撤销/重做系统的命令模式管理器
 */

import { generateScopedId } from '@/utils';

/**
 * 命令历史记录
 */
export interface CommandHistory {
  /** 历史记录 ID */
  id: string;
  /** 命令描述 */
  description: string;
  /** 执行时间 */
  timestamp: number;
  /** 是否可撤销 */
  undoable: boolean;
}

/**
 * 命令接口
 * 
 * 所有可撤销的操作都需要实现此接口
 * 
 * @example
 * ```typescript
 * class AddCardCommand implements Command {
 *   private cardId: string;
 *   private cardData: BaseCardInfo;
 *   
 *   constructor(cardId: string, cardData: BaseCardInfo) {
 *     this.cardId = cardId;
 *     this.cardData = cardData;
 *   }
 *   
 *   async execute() {
 *     await cardStore.addBaseCard(this.cardId, this.cardData);
 *   }
 *   
 *   async undo() {
 *     await cardStore.removeBaseCard(this.cardId, this.cardData.id);
 *   }
 *   
 *   async redo() {
 *     await this.execute();
 *   }
 *   
 *   get description() {
 *     return 'command.add_card';
 *   }
 * }
 * ```
 */
export interface Command {
  /**
   * 执行命令
   */
  execute(): Promise<void>;
  
  /**
   * 撤销命令
   */
  undo(): Promise<void>;
  
  /**
   * 重做命令
   */
  redo(): Promise<void>;
  
  /**
   * 命令描述（用于历史记录显示，使用 i18n key）
   */
  description: string;
  
  /**
   * 是否可以与前一个命令合并
   * 用于连续相同操作的合并（如连续移动）
   */
  canMergeWith?(other: Command): boolean;
  
  /**
   * 与另一个命令合并
   * @param other - 要合并的命令
   */
  mergeWith?(other: Command): void;
}

/**
 * 命令管理器配置
 */
export interface CommandManagerConfig {
  /** 最大历史记录数量 */
  maxHistory: number;
  /** 合并命令的时间窗口（毫秒） */
  mergeWindow: number;
  /** 是否启用调试日志 */
  debug: boolean;
}

/**
 * 命令管理器事件
 */
export interface CommandManagerEvents {
  /** 命令执行后 */
  'command:executed': { command: Command; history: CommandHistory };
  /** 命令撤销后 */
  'command:undone': { command: Command; history: CommandHistory };
  /** 命令重做后 */
  'command:redone': { command: Command; history: CommandHistory };
  /** 历史记录清空 */
  'history:cleared': Record<string, never>;
  /** 状态变化 */
  'state:changed': { canUndo: boolean; canRedo: boolean };
}

/** 命令管理器事件回调类型 */
export type CommandManagerEventCallback<K extends keyof CommandManagerEvents> = (
  data: CommandManagerEvents[K]
) => void;

/**
 * 命令管理器类
 * 
 * 负责：
 * - 命令的执行、撤销、重做
 * - 维护撤销/重做栈
 * - 历史记录管理
 * - 命令合并
 * 
 * @example
 * ```typescript
 * const manager = new CommandManager({ maxHistory: 100 });
 * 
 * // 执行命令
 * await manager.execute(new AddCardCommand(cardId, cardData));
 * 
 * // 撤销
 * await manager.undo();
 * 
 * // 重做
 * await manager.redo();
 * 
 * // 获取历史记录
 * const history = manager.getHistory();
 * ```
 */
export class CommandManager {
  /** 撤销栈 */
  private undoStack: Array<{ command: Command; history: CommandHistory }> = [];
  /** 重做栈 */
  private redoStack: Array<{ command: Command; history: CommandHistory }> = [];
  /** 配置 */
  private config: CommandManagerConfig;
  /** 事件监听器 */
  private listeners: Map<keyof CommandManagerEvents, Set<(data: unknown) => void>> = new Map();
  /** 上次执行时间 */
  private lastExecuteTime = 0;
  /** 是否正在执行命令 */
  private isExecuting = false;

  /**
   * 创建命令管理器
   * @param config - 配置选项
   */
  constructor(config: Partial<CommandManagerConfig> = {}) {
    this.config = {
      maxHistory: config.maxHistory ?? 100,
      mergeWindow: config.mergeWindow ?? 500,
      debug: config.debug ?? false,
    };
  }

  // ==================== 命令执行 ====================

  /**
   * 执行命令
   * @param command - 要执行的命令
   * @throws {Error} 当命令执行失败时抛出错误
   */
  async execute(command: Command): Promise<void> {
    if (this.isExecuting) {
      this.log('Command execution skipped: another command is executing');
      return;
    }

    this.isExecuting = true;

    try {
      // 执行命令
      await command.execute();

      // 尝试与上一个命令合并
      const merged = this.tryMergeWithLast(command);

      if (!merged) {
        // 创建历史记录
        const history: CommandHistory = {
          id: generateScopedId('cmd'),
          description: command.description,
          timestamp: Date.now(),
          undoable: true,
        };

        // 添加到撤销栈
        this.undoStack.push({ command, history });

        // 检查历史记录限制
        this.enforceHistoryLimit();

        // 清空重做栈（新操作会使重做栈失效）
        this.redoStack = [];

        this.emit('command:executed', { command, history });
        this.log(`Command executed: ${command.description}`);
      }

      this.lastExecuteTime = Date.now();
      this.emitStateChange();
    } catch (error) {
      this.log('Command execution failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 撤销上一个命令
   * @returns 是否成功撤销
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      this.log('Cannot undo: no commands in undo stack');
      return false;
    }

    if (this.isExecuting) {
      this.log('Undo skipped: command is executing');
      return false;
    }

    this.isExecuting = true;

    try {
      const item = this.undoStack.pop();
      if (!item) {
        return false;
      }
      await item.command.undo();

      // 移动到重做栈
      this.redoStack.push(item);

      this.emit('command:undone', { command: item.command, history: item.history });
      this.emitStateChange();
      this.log(`Command undone: ${item.command.description}`);

      return true;
    } catch (error) {
      this.log('Undo failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 重做上一个撤销的命令
   * @returns 是否成功重做
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      this.log('Cannot redo: no commands in redo stack');
      return false;
    }

    if (this.isExecuting) {
      this.log('Redo skipped: command is executing');
      return false;
    }

    this.isExecuting = true;

    try {
      const item = this.redoStack.pop();
      if (!item) {
        return false;
      }
      await item.command.redo();

      // 移动回撤销栈
      this.undoStack.push(item);

      this.emit('command:redone', { command: item.command, history: item.history });
      this.emitStateChange();
      this.log(`Command redone: ${item.command.description}`);

      return true;
    } catch (error) {
      this.log('Redo failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  // ==================== 状态查询 ====================

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  get undoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  get redoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 是否正在执行命令
   */
  get executing(): boolean {
    return this.isExecuting;
  }

  // ==================== 历史记录 ====================

  /**
   * 获取历史记录列表
   * @param limit - 限制数量（可选）
   * @returns 历史记录列表（从最新到最旧）
   */
  getHistory(limit?: number): CommandHistory[] {
    const history = this.undoStack.map((item) => item.history).reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取可重做的历史记录
   * @returns 可重做的历史记录（从最近撤销到最早撤销）
   */
  getRedoHistory(): CommandHistory[] {
    return this.redoStack.map((item) => item.history).reverse();
  }

  /**
   * 跳转到特定历史记录
   * @param historyId - 历史记录 ID
   * @returns 是否成功跳转
   */
  async goToHistory(historyId: string): Promise<boolean> {
    // 先在撤销栈中查找
    const undoIndex = this.undoStack.findIndex((item) => item.history.id === historyId);
    if (undoIndex !== -1) {
      // 需要撤销 undoIndex 之后的所有命令
      const stepsToUndo = this.undoStack.length - 1 - undoIndex;
      for (let i = 0; i < stepsToUndo; i++) {
        await this.undo();
      }
      return true;
    }

    // 在重做栈中查找
    const redoIndex = this.redoStack.findIndex((item) => item.history.id === historyId);
    if (redoIndex !== -1) {
      // 需要重做到这个位置
      const stepsToRedo = this.redoStack.length - redoIndex;
      for (let i = 0; i < stepsToRedo; i++) {
        await this.redo();
      }
      return true;
    }

    return false;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emit('history:cleared', {});
    this.emitStateChange();
    this.log('History cleared');
  }

  // ==================== 事件系统 ====================

  /**
   * 订阅事件
   * @param event - 事件类型
   * @param callback - 回调函数
   */
  on<K extends keyof CommandManagerEvents>(
    event: K,
    callback: CommandManagerEventCallback<K>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.add(callback as (data: unknown) => void);
      return;
    }
    this.listeners.set(event, new Set([callback as (data: unknown) => void]));
  }

  /**
   * 取消订阅事件
   * @param event - 事件类型
   * @param callback - 回调函数
   */
  off<K extends keyof CommandManagerEvents>(
    event: K,
    callback: CommandManagerEventCallback<K>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as (data: unknown) => void);
    }
  }

  // ==================== 配置 ====================

  /**
   * 获取配置
   */
  getConfig(): Readonly<CommandManagerConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config - 新配置
   */
  setConfig(config: Partial<CommandManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.enforceHistoryLimit();
  }

  /**
   * 设置最大历史记录数量
   * @param maxHistory - 最大数量
   */
  setMaxHistory(maxHistory: number): void {
    this.config.maxHistory = maxHistory;
    this.enforceHistoryLimit();
  }

  // ==================== 私有方法 ====================

  /**
   * 尝试与上一个命令合并
   * @param command - 当前命令
   * @returns 是否合并成功
   */
  private tryMergeWithLast(command: Command): boolean {
    if (this.undoStack.length === 0) return false;

    const now = Date.now();
    if (now - this.lastExecuteTime > this.config.mergeWindow) return false;

    const lastItem = this.undoStack[this.undoStack.length - 1];
    if (!lastItem) return false;

    if (command.canMergeWith && command.canMergeWith(lastItem.command)) {
      if (command.mergeWith) {
        command.mergeWith(lastItem.command);
        // 更新历史记录时间
        lastItem.history.timestamp = now;
        this.log(`Command merged: ${command.description}`);
        return true;
      }
    }

    return false;
  }

  /**
   * 强制执行历史记录限制
   */
  private enforceHistoryLimit(): void {
    while (this.undoStack.length > this.config.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * 发出事件
   * @param event - 事件类型
   * @param data - 事件数据
   */
  private emit<K extends keyof CommandManagerEvents>(
    event: K,
    data: CommandManagerEvents[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * 发出状态变化事件
   */
  private emitStateChange(): void {
    this.emit('state:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * 日志输出
   * @param args - 日志参数
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.warn('[CommandManager]', ...args);
    }
  }
}

// 单例实例
let commandManager: CommandManager | null = null;

/**
 * 获取命令管理器实例
 * @param config - 配置选项（仅首次调用有效）
 * @returns CommandManager 实例
 * 
 * @example
 * ```typescript
 * const manager = useCommandManager();
 * await manager.execute(new AddCardCommand(cardId, cardData));
 * ```
 */
export function useCommandManager(config?: Partial<CommandManagerConfig>): CommandManager {
  if (!commandManager) {
    commandManager = new CommandManager(config);
  }
  return commandManager;
}

/**
 * 重置命令管理器（主要用于测试）
 */
export function resetCommandManager(): void {
  if (commandManager) {
    commandManager.clear();
  }
  commandManager = null;
}
