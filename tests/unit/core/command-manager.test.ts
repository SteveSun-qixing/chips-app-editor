/**
 * 命令管理器测试
 * @module tests/unit/core/command-manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CommandManager,
  useCommandManager,
  resetCommandManager,
} from '@/core/command-manager';
import type { Command, CommandHistory } from '@/core/command-manager';

// 创建一个简单的测试命令
class TestCommand implements Command {
  public executed = false;
  public undone = false;
  public redone = false;
  public desc: string;

  constructor(desc = 'test.command') {
    this.desc = desc;
  }

  async execute(): Promise<void> {
    this.executed = true;
  }

  async undo(): Promise<void> {
    this.undone = true;
  }

  async redo(): Promise<void> {
    this.redone = true;
  }

  get description(): string {
    return this.desc;
  }
}

// 可合并的测试命令
class MergeableCommand implements Command {
  public value: number;
  public originalValue: number;

  constructor(value: number, original = 0) {
    this.value = value;
    this.originalValue = original;
  }

  async execute(): Promise<void> {}
  async undo(): Promise<void> {}
  async redo(): Promise<void> {}

  get description(): string {
    return 'test.mergeable';
  }

  canMergeWith(other: Command): boolean {
    return other instanceof MergeableCommand;
  }

  mergeWith(other: Command): void {
    if (other instanceof MergeableCommand) {
      this.originalValue = other.originalValue;
    }
  }
}

describe('CommandManager', () => {
  let manager: CommandManager;

  beforeEach(() => {
    manager = new CommandManager({ debug: false, maxHistory: 100 });
  });

  afterEach(() => {
    manager.clear();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const m = new CommandManager();
      const config = m.getConfig();
      expect(config.maxHistory).toBe(100);
      expect(config.mergeWindow).toBe(500);
      expect(config.debug).toBe(false);
    });

    it('should accept custom config', () => {
      const m = new CommandManager({ maxHistory: 50, debug: true });
      const config = m.getConfig();
      expect(config.maxHistory).toBe(50);
      expect(config.debug).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute command', async () => {
      const command = new TestCommand();
      await manager.execute(command);
      expect(command.executed).toBe(true);
    });

    it('should add command to undo stack', async () => {
      const command = new TestCommand();
      await manager.execute(command);
      expect(manager.undoStackSize).toBe(1);
    });

    it('should clear redo stack after execute', async () => {
      const command1 = new TestCommand();
      const command2 = new TestCommand();
      
      await manager.execute(command1);
      await manager.undo();
      expect(manager.redoStackSize).toBe(1);
      
      await manager.execute(command2);
      expect(manager.redoStackSize).toBe(0);
    });

    it('should emit command:executed event', async () => {
      const handler = vi.fn();
      manager.on('command:executed', handler);
      
      const command = new TestCommand();
      await manager.execute(command);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          command,
          history: expect.objectContaining({
            description: 'test.command',
          }),
        })
      );
    });

    it('should emit state:changed event', async () => {
      const handler = vi.fn();
      manager.on('state:changed', handler);
      
      await manager.execute(new TestCommand());
      
      expect(handler).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
      });
    });
  });

  describe('undo', () => {
    it('should undo command', async () => {
      const command = new TestCommand();
      await manager.execute(command);
      await manager.undo();
      expect(command.undone).toBe(true);
    });

    it('should move command to redo stack', async () => {
      await manager.execute(new TestCommand());
      await manager.undo();
      expect(manager.undoStackSize).toBe(0);
      expect(manager.redoStackSize).toBe(1);
    });

    it('should return true when undo succeeds', async () => {
      await manager.execute(new TestCommand());
      const result = await manager.undo();
      expect(result).toBe(true);
    });

    it('should return false when nothing to undo', async () => {
      const result = await manager.undo();
      expect(result).toBe(false);
    });

    it('should emit command:undone event', async () => {
      const handler = vi.fn();
      manager.on('command:undone', handler);
      
      const command = new TestCommand();
      await manager.execute(command);
      await manager.undo();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          command,
        })
      );
    });
  });

  describe('redo', () => {
    it('should redo command', async () => {
      const command = new TestCommand();
      await manager.execute(command);
      await manager.undo();
      await manager.redo();
      expect(command.redone).toBe(true);
    });

    it('should move command back to undo stack', async () => {
      await manager.execute(new TestCommand());
      await manager.undo();
      await manager.redo();
      expect(manager.undoStackSize).toBe(1);
      expect(manager.redoStackSize).toBe(0);
    });

    it('should return true when redo succeeds', async () => {
      await manager.execute(new TestCommand());
      await manager.undo();
      const result = await manager.redo();
      expect(result).toBe(true);
    });

    it('should return false when nothing to redo', async () => {
      const result = await manager.redo();
      expect(result).toBe(false);
    });

    it('should emit command:redone event', async () => {
      const handler = vi.fn();
      manager.on('command:redone', handler);
      
      const command = new TestCommand();
      await manager.execute(command);
      await manager.undo();
      await manager.redo();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          command,
        })
      );
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false initially', () => {
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });

    it('should return true for canUndo after execute', async () => {
      await manager.execute(new TestCommand());
      expect(manager.canUndo()).toBe(true);
    });

    it('should return true for canRedo after undo', async () => {
      await manager.execute(new TestCommand());
      await manager.undo();
      expect(manager.canRedo()).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      const history = manager.getHistory();
      expect(history).toEqual([]);
    });

    it('should return history in reverse order', async () => {
      await manager.execute(new TestCommand('cmd1'));
      await manager.execute(new TestCommand('cmd2'));
      await manager.execute(new TestCommand('cmd3'));
      
      const history = manager.getHistory();
      expect(history.length).toBe(3);
      expect(history[0]?.description).toBe('cmd3');
      expect(history[1]?.description).toBe('cmd2');
      expect(history[2]?.description).toBe('cmd1');
    });

    it('should respect limit parameter', async () => {
      await manager.execute(new TestCommand('cmd1'));
      await manager.execute(new TestCommand('cmd2'));
      await manager.execute(new TestCommand('cmd3'));
      
      const history = manager.getHistory(2);
      expect(history.length).toBe(2);
    });
  });

  describe('getRedoHistory', () => {
    it('should return redo history', async () => {
      await manager.execute(new TestCommand('cmd1'));
      await manager.execute(new TestCommand('cmd2'));
      await manager.undo();
      await manager.undo();
      
      const redoHistory = manager.getRedoHistory();
      expect(redoHistory.length).toBe(2);
    });
  });

  describe('goToHistory', () => {
    it('should go back to specific history', async () => {
      await manager.execute(new TestCommand('cmd1'));
      await manager.execute(new TestCommand('cmd2'));
      await manager.execute(new TestCommand('cmd3'));
      
      const history = manager.getHistory();
      const targetId = history[2]!.id; // cmd1
      
      const result = await manager.goToHistory(targetId);
      expect(result).toBe(true);
      expect(manager.undoStackSize).toBe(1);
      expect(manager.redoStackSize).toBe(2);
    });

    it('should go forward to redo history', async () => {
      await manager.execute(new TestCommand('cmd1'));
      await manager.execute(new TestCommand('cmd2'));
      await manager.undo();
      await manager.undo();
      
      const redoHistory = manager.getRedoHistory();
      const targetId = redoHistory[1]!.id; // cmd2
      
      const result = await manager.goToHistory(targetId);
      expect(result).toBe(true);
      expect(manager.undoStackSize).toBe(2);
    });

    it('should return false for non-existent history', async () => {
      const result = await manager.goToHistory('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all history', async () => {
      await manager.execute(new TestCommand());
      await manager.execute(new TestCommand());
      await manager.undo();
      
      manager.clear();
      
      expect(manager.undoStackSize).toBe(0);
      expect(manager.redoStackSize).toBe(0);
    });

    it('should emit history:cleared event', async () => {
      const handler = vi.fn();
      manager.on('history:cleared', handler);
      
      manager.clear();
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('history limit', () => {
    it('should enforce max history limit', async () => {
      const m = new CommandManager({ maxHistory: 3 });
      
      await m.execute(new TestCommand('cmd1'));
      await m.execute(new TestCommand('cmd2'));
      await m.execute(new TestCommand('cmd3'));
      await m.execute(new TestCommand('cmd4'));
      
      expect(m.undoStackSize).toBe(3);
      
      const history = m.getHistory();
      expect(history[2]?.description).toBe('cmd2'); // cmd1 was removed
    });
  });

  describe('command merging', () => {
    it('should merge commands within merge window', async () => {
      const m = new CommandManager({ mergeWindow: 1000 });
      
      const cmd1 = new MergeableCommand(1, 0);
      const cmd2 = new MergeableCommand(2, 0);
      
      await m.execute(cmd1);
      await m.execute(cmd2);
      
      // cmd2 should have merged with cmd1
      expect(m.undoStackSize).toBe(1);
    });

    it('should not merge non-mergeable commands', async () => {
      const m = new CommandManager({ mergeWindow: 1000 });
      
      await m.execute(new TestCommand('cmd1'));
      await m.execute(new TestCommand('cmd2'));
      
      expect(m.undoStackSize).toBe(2);
    });
  });

  describe('configuration', () => {
    it('should update config with setConfig', () => {
      manager.setConfig({ maxHistory: 50, debug: true });
      const config = manager.getConfig();
      expect(config.maxHistory).toBe(50);
      expect(config.debug).toBe(true);
    });

    it('should update max history with setMaxHistory', () => {
      manager.setMaxHistory(25);
      expect(manager.getConfig().maxHistory).toBe(25);
    });
  });

  describe('event system', () => {
    it('should subscribe and unsubscribe', async () => {
      const handler = vi.fn();
      manager.on('command:executed', handler);
      
      await manager.execute(new TestCommand());
      expect(handler).toHaveBeenCalledTimes(1);
      
      manager.off('command:executed', handler);
      await manager.execute(new TestCommand());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent execution protection', () => {
    it('should not allow concurrent executions', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      
      const slowCommand: Command = {
        execute: async () => {
          await firstPromise;
        },
        undo: async () => {},
        redo: async () => {},
        description: 'slow',
      };
      
      const fastCommand = new TestCommand();
      
      // Start slow command
      const slowExec = manager.execute(slowCommand);
      
      // Try to execute fast command while slow is running
      await manager.execute(fastCommand);
      
      // Fast command should not have been added
      expect(manager.undoStackSize).toBe(0);
      
      // Complete slow command
      resolveFirst!();
      await slowExec;
      
      expect(manager.undoStackSize).toBe(1);
    });
  });
});

describe('useCommandManager', () => {
  beforeEach(() => {
    resetCommandManager();
  });

  afterEach(() => {
    resetCommandManager();
  });

  it('should return singleton instance', () => {
    const m1 = useCommandManager();
    const m2 = useCommandManager();
    expect(m1).toBe(m2);
  });

  it('should accept config on first call', () => {
    const m = useCommandManager({ maxHistory: 50 });
    expect(m.getConfig().maxHistory).toBe(50);
  });
});

describe('resetCommandManager', () => {
  it('should reset singleton', () => {
    const m1 = useCommandManager({ maxHistory: 50 });
    resetCommandManager();
    const m2 = useCommandManager({ maxHistory: 100 });
    expect(m2.getConfig().maxHistory).toBe(100);
  });
});
