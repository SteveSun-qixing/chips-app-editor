/**
 * 窗口命令测试
 * @module tests/unit/core/commands/window-commands
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '@/core/state';
import type { WindowConfig } from '@/types';
import {
  CreateWindowCommand,
  CloseWindowCommand,
  MoveWindowCommand,
  ResizeWindowCommand,
  SetWindowStateCommand,
  BatchWindowCommand,
} from '@/core/commands/window-commands';

// 创建测试用的窗口配置
function createTestWindowConfig(id: string): WindowConfig {
  return {
    id,
    type: 'card',
    title: `Test Window ${id}`,
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    state: 'normal',
    zIndex: 100,
  };
}

describe('CreateWindowCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should create window on execute', async () => {
    const config = createTestWindowConfig('win-1');
    const command = new CreateWindowCommand(config);
    
    await command.execute();
    
    expect(uiStore.windows.has('win-1')).toBe(true);
  });

  it('should remove window on undo', async () => {
    const config = createTestWindowConfig('win-1');
    const command = new CreateWindowCommand(config);
    
    await command.execute();
    await command.undo();
    
    expect(uiStore.windows.has('win-1')).toBe(false);
  });

  it('should recreate window on redo', async () => {
    const config = createTestWindowConfig('win-1');
    const command = new CreateWindowCommand(config);
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    expect(uiStore.windows.has('win-1')).toBe(true);
  });

  it('should have correct description', () => {
    const command = new CreateWindowCommand(createTestWindowConfig('win-1'));
    expect(command.description).toBe('command.create_window');
  });
});

describe('CloseWindowCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    uiStore.addWindow(createTestWindowConfig('win-1'));
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should close window on execute', async () => {
    const command = new CloseWindowCommand('win-1');
    
    await command.execute();
    
    expect(uiStore.windows.has('win-1')).toBe(false);
  });

  it('should restore window on undo', async () => {
    const command = new CloseWindowCommand('win-1');
    
    await command.execute();
    await command.undo();
    
    expect(uiStore.windows.has('win-1')).toBe(true);
  });

  it('should preserve window config on restore', async () => {
    const command = new CloseWindowCommand('win-1');
    
    await command.execute();
    await command.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.title).toBe('Test Window win-1');
    expect(window?.position.x).toBe(100);
  });

  it('should close window again on redo', async () => {
    const command = new CloseWindowCommand('win-1');
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    expect(uiStore.windows.has('win-1')).toBe(false);
  });

  it('should have correct description', () => {
    const command = new CloseWindowCommand('win-1');
    expect(command.description).toBe('command.close_window');
  });
});

describe('MoveWindowCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    uiStore.addWindow(createTestWindowConfig('win-1'));
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should move window on execute', async () => {
    const command = new MoveWindowCommand('win-1', { x: 200, y: 300 });
    
    await command.execute();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(200);
    expect(window?.position.y).toBe(300);
  });

  it('should restore position on undo', async () => {
    const command = new MoveWindowCommand('win-1', { x: 200, y: 300 });
    
    await command.execute();
    await command.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(100);
    expect(window?.position.y).toBe(100);
  });

  it('should move again on redo', async () => {
    const command = new MoveWindowCommand('win-1', { x: 200, y: 300 });
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(200);
    expect(window?.position.y).toBe(300);
  });

  it('should support merging with same window move', () => {
    const command1 = new MoveWindowCommand('win-1', { x: 150, y: 150 });
    const command2 = new MoveWindowCommand('win-1', { x: 200, y: 200 });
    
    expect(command2.canMergeWith!(command1)).toBe(true);
  });

  it('should not merge with different window move', () => {
    const command1 = new MoveWindowCommand('win-1', { x: 150, y: 150 });
    const command2 = new MoveWindowCommand('win-2', { x: 200, y: 200 });
    
    expect(command2.canMergeWith!(command1)).toBe(false);
  });

  it('should preserve original position when merging', async () => {
    // 模拟合并场景：先执行 command1，然后 command2 合并时应该保留 command1 的 oldPosition
    const command1 = new MoveWindowCommand('win-1', { x: 150, y: 150 });
    
    // 执行 command1，此时 oldPosition = 100，newPosition = 150
    await command1.execute();
    
    // 创建 command2，目标位置为 200
    const command2 = new MoveWindowCommand('win-1', { x: 200, y: 200 });
    
    // 在合并前先执行 command2 来获取其 oldPosition
    await command2.execute();
    
    // 此时 command2 的 oldPosition 是 150（command1 执行后的位置）
    // 合并后，command2 应该使用 command1 的 oldPosition (100)
    command2.mergeWith!(command1);
    
    // 撤销 command2 应该恢复到 command1 的原始位置
    await command2.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(100);
  });

  it('should have correct description', () => {
    const command = new MoveWindowCommand('win-1', { x: 0, y: 0 });
    expect(command.description).toBe('command.move_window');
  });
});

describe('ResizeWindowCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    uiStore.addWindow(createTestWindowConfig('win-1'));
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should resize window on execute', async () => {
    const command = new ResizeWindowCommand('win-1', { width: 600, height: 500 });
    
    await command.execute();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.size.width).toBe(600);
    expect(window?.size.height).toBe(500);
  });

  it('should restore size on undo', async () => {
    const command = new ResizeWindowCommand('win-1', { width: 600, height: 500 });
    
    await command.execute();
    await command.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.size.width).toBe(400);
    expect(window?.size.height).toBe(300);
  });

  it('should resize again on redo', async () => {
    const command = new ResizeWindowCommand('win-1', { width: 600, height: 500 });
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.size.width).toBe(600);
    expect(window?.size.height).toBe(500);
  });

  it('should support merging with same window resize', () => {
    const command1 = new ResizeWindowCommand('win-1', { width: 500, height: 400 });
    const command2 = new ResizeWindowCommand('win-1', { width: 600, height: 500 });
    
    expect(command2.canMergeWith!(command1)).toBe(true);
  });

  it('should not merge with different window resize', () => {
    const command1 = new ResizeWindowCommand('win-1', { width: 500, height: 400 });
    const command2 = new ResizeWindowCommand('win-2', { width: 600, height: 500 });
    
    expect(command2.canMergeWith!(command1)).toBe(false);
  });

  it('should have correct description', () => {
    const command = new ResizeWindowCommand('win-1', { width: 0, height: 0 });
    expect(command.description).toBe('command.resize_window');
  });
});

describe('SetWindowStateCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    uiStore.addWindow(createTestWindowConfig('win-1'));
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should set window state on execute', async () => {
    const command = new SetWindowStateCommand('win-1', 'minimized');
    
    await command.execute();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.state).toBe('minimized');
  });

  it('should restore state on undo', async () => {
    const command = new SetWindowStateCommand('win-1', 'minimized');
    
    await command.execute();
    await command.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.state).toBe('normal');
  });

  it('should set state again on redo', async () => {
    const command = new SetWindowStateCommand('win-1', 'minimized');
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.state).toBe('minimized');
  });

  it('should have correct description', () => {
    const command = new SetWindowStateCommand('win-1', 'minimized');
    expect(command.description).toBe('command.set_window_state');
  });
});

describe('BatchWindowCommand', () => {
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    uiStore.addWindow(createTestWindowConfig('win-1'));
  });

  afterEach(() => {
    uiStore.clearWindows();
  });

  it('should execute all commands', async () => {
    const command = new BatchWindowCommand([
      new MoveWindowCommand('win-1', { x: 200, y: 200 }),
      new ResizeWindowCommand('win-1', { width: 600, height: 500 }),
    ]);
    
    await command.execute();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(200);
    expect(window?.size.width).toBe(600);
  });

  it('should undo all commands in reverse order', async () => {
    const command = new BatchWindowCommand([
      new MoveWindowCommand('win-1', { x: 200, y: 200 }),
      new ResizeWindowCommand('win-1', { width: 600, height: 500 }),
    ]);
    
    await command.execute();
    await command.undo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(100);
    expect(window?.size.width).toBe(400);
  });

  it('should redo all commands', async () => {
    const command = new BatchWindowCommand([
      new MoveWindowCommand('win-1', { x: 200, y: 200 }),
      new ResizeWindowCommand('win-1', { width: 600, height: 500 }),
    ]);
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const window = uiStore.getWindow('win-1');
    expect(window?.position.x).toBe(200);
    expect(window?.size.width).toBe(600);
  });

  it('should use custom description', () => {
    const command = new BatchWindowCommand([], 'command.custom_batch');
    expect(command.description).toBe('command.custom_batch');
  });

  it('should use default description', () => {
    const command = new BatchWindowCommand([]);
    expect(command.description).toBe('command.batch_window_operation');
  });
});
