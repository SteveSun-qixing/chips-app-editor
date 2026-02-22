/**
 * 键盘快捷键测试
 * @module tests/unit/composables/use-keyboard-shortcuts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { useKeyboardShortcuts, createKeyboardShortcuts } from '@/composables/use-keyboard-shortcuts';
import { useCommandManager, resetCommandManager } from '@/core/command-manager';
import type { Command } from '@/core/command-manager';

// 测试命令
class TestCommand implements Command {
  async execute(): Promise<void> {}
  async undo(): Promise<void> {}
  async redo(): Promise<void> {}
  get description(): string {
    return 'test.command';
  }
}

// 测试组件
const TestComponent = defineComponent({
  setup() {
    const { state, undo, redo, setEnabled, enabled } = useKeyboardShortcuts();
    return { state, undo, redo, setEnabled, enabled };
  },
  template: '<div>Test</div>',
});

describe('useKeyboardShortcuts', () => {
  let commandManager: ReturnType<typeof useCommandManager>;

  beforeEach(() => {
    setActivePinia(createPinia());
    resetCommandManager();
    commandManager = useCommandManager();
  });

  afterEach(() => {
    resetCommandManager();
  });

  describe('state', () => {
    it('should initialize with correct state', async () => {
      const wrapper = mount(TestComponent);
      
      expect(wrapper.vm.state.canUndo).toBe(false);
      expect(wrapper.vm.state.canRedo).toBe(false);
      expect(wrapper.vm.state.undoStackSize).toBe(0);
      expect(wrapper.vm.state.redoStackSize).toBe(0);
      
      wrapper.unmount();
    });

    it('should update state after command execution', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await nextTick();
      
      expect(wrapper.vm.state.canUndo).toBe(true);
      expect(wrapper.vm.state.undoStackSize).toBe(1);
      
      wrapper.unmount();
    });

    it('should update state after undo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await commandManager.undo();
      await nextTick();
      
      expect(wrapper.vm.state.canUndo).toBe(false);
      expect(wrapper.vm.state.canRedo).toBe(true);
      
      wrapper.unmount();
    });
  });

  describe('undo/redo methods', () => {
    it('should execute undo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      const result = await wrapper.vm.undo();
      
      expect(result).toBe(true);
      expect(wrapper.vm.state.canUndo).toBe(false);
      
      wrapper.unmount();
    });

    it('should return false when cannot undo', async () => {
      const wrapper = mount(TestComponent);
      
      const result = await wrapper.vm.undo();
      
      expect(result).toBe(false);
      
      wrapper.unmount();
    });

    it('should execute redo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await commandManager.undo();
      const result = await wrapper.vm.redo();
      
      expect(result).toBe(true);
      expect(wrapper.vm.state.canRedo).toBe(false);
      
      wrapper.unmount();
    });

    it('should return false when cannot redo', async () => {
      const wrapper = mount(TestComponent);
      
      const result = await wrapper.vm.redo();
      
      expect(result).toBe(false);
      
      wrapper.unmount();
    });
  });

  describe('enabled state', () => {
    it('should be enabled by default', async () => {
      const wrapper = mount(TestComponent);
      
      expect(wrapper.vm.enabled).toBe(true);
      
      wrapper.unmount();
    });

    it('should disable undo/redo when disabled', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      wrapper.vm.setEnabled(false);
      
      const result = await wrapper.vm.undo();
      
      expect(result).toBe(false);
      
      wrapper.unmount();
    });
  });

  describe('keyboard events', () => {
    it('should handle Ctrl+Z for undo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await nextTick();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      
      window.dispatchEvent(event);
      await flushPromises();
      
      expect(wrapper.vm.state.canUndo).toBe(false);
      expect(wrapper.vm.state.canRedo).toBe(true);
      
      wrapper.unmount();
    });

    it('should handle Ctrl+Shift+Z for redo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await commandManager.undo();
      await nextTick();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      
      window.dispatchEvent(event);
      await flushPromises();
      
      expect(wrapper.vm.state.canUndo).toBe(true);
      expect(wrapper.vm.state.canRedo).toBe(false);
      
      wrapper.unmount();
    });

    it('should handle Ctrl+Y for redo', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      await commandManager.undo();
      await nextTick();
      
      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
        bubbles: true,
      });
      
      window.dispatchEvent(event);
      await flushPromises();
      
      expect(wrapper.vm.state.canUndo).toBe(true);
      
      wrapper.unmount();
    });

    it('should ignore shortcuts when disabled', async () => {
      const wrapper = mount(TestComponent);
      
      await commandManager.execute(new TestCommand());
      wrapper.vm.setEnabled(false);
      await nextTick();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      
      window.dispatchEvent(event);
      await flushPromises();
      
      // Should still be able to undo (shortcut was ignored)
      expect(wrapper.vm.state.canUndo).toBe(true);
      
      wrapper.unmount();
    });

    it('should ignore shortcuts in input elements', async () => {
      const InputComponent = defineComponent({
        setup() {
          useKeyboardShortcuts();
          return {};
        },
        template: '<input id="test-input" type="text" />',
      });
      
      const wrapper = mount(InputComponent);
      
      await commandManager.execute(new TestCommand());
      await nextTick();
      
      const input = wrapper.find('#test-input').element;
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);
      await flushPromises();
      
      // Shortcut should be ignored, undo stack unchanged
      expect(commandManager.canUndo()).toBe(true);
      
      wrapper.unmount();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      const wrapper = mount(TestComponent);
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      wrapper.unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('createKeyboardShortcuts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetCommandManager();
  });

  afterEach(() => {
    resetCommandManager();
  });

  it('should create shortcut handler', () => {
    const shortcuts = createKeyboardShortcuts();
    
    expect(shortcuts.install).toBeDefined();
    expect(shortcuts.uninstall).toBeDefined();
    expect(shortcuts.undo).toBeDefined();
    expect(shortcuts.redo).toBeDefined();
  });

  it('should install and uninstall listeners', () => {
    const shortcuts = createKeyboardShortcuts();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    
    shortcuts.install();
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    shortcuts.uninstall();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should not install twice', () => {
    const shortcuts = createKeyboardShortcuts();
    const addSpy = vi.spyOn(window, 'addEventListener');
    
    shortcuts.install();
    shortcuts.install();
    
    expect(addSpy).toHaveBeenCalledTimes(1);
    
    shortcuts.uninstall();
    addSpy.mockRestore();
  });

  it('should provide canUndo/canRedo', async () => {
    const shortcuts = createKeyboardShortcuts();
    const commandManager = useCommandManager();
    
    expect(shortcuts.canUndo()).toBe(false);
    expect(shortcuts.canRedo()).toBe(false);
    
    await commandManager.execute(new TestCommand());
    
    expect(shortcuts.canUndo()).toBe(true);
    expect(shortcuts.canRedo()).toBe(false);
  });

  it('should respect enabled state', async () => {
    const shortcuts = createKeyboardShortcuts();
    const commandManager = useCommandManager();
    
    await commandManager.execute(new TestCommand());
    shortcuts.setEnabled(false);
    shortcuts.install();
    
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    
    window.dispatchEvent(event);
    
    // Undo should not have happened
    expect(commandManager.canUndo()).toBe(true);
    
    shortcuts.uninstall();
  });
});
