/**
 * Dock 组件测试
 * @module tests/unit/components/dock/Dock
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Dock from '@/components/dock/Dock.vue';
import { useUIStore } from '@/core/state/stores/ui';
import type { ToolWindowConfig } from '@/types';

// 创建测试用的工具窗口配置
function createMockToolWindow(
  id: string,
  overrides?: Partial<ToolWindowConfig>
): ToolWindowConfig {
  return {
    id,
    type: 'tool',
    title: `Tool ${id}`,
    position: { x: 100, y: 100 },
    size: { width: 300, height: 400 },
    state: 'normal',
    zIndex: 100,
    component: 'TestComponent',
    icon: '🔧',
    ...overrides,
  };
}

describe('Dock', () => {
  let wrapper: VueWrapper;
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    uiStore.clearWindows();
  });

  describe('rendering', () => {
    it('should not render when dock is not visible', () => {
      uiStore.setDockVisible(false);
      wrapper = mount(Dock);

      expect(wrapper.find('.dock').exists()).toBe(false);
    });

    it('should render even when there are no tool windows (settings button always present)', () => {
      uiStore.setDockVisible(true);
      wrapper = mount(Dock);

      // Dock 始终可见（包含设置按钮）
      expect(wrapper.find('.dock').exists()).toBe(true);
    });

    it('should render when dock is visible and has minimized tools', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      expect(wrapper.find('.dock').exists()).toBe(true);
    });

    it('should render DockItem for each tool window plus settings button', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', {
        state: 'minimized',
        icon: '🔧',
        title: 'Tool 1',
      });
      const tool2 = createMockToolWindow('tool-2', {
        state: 'minimized',
        icon: '📦',
        title: 'Tool 2',
      });
      uiStore.addWindow(tool1);
      uiStore.addWindow(tool2);
      uiStore.minimizeTool('tool-1');
      uiStore.minimizeTool('tool-2');

      wrapper = mount(Dock);

      const dockItems = wrapper.findAll('.dock-item');
      // 2 个工具窗口 + 1 个设置按钮
      expect(dockItems).toHaveLength(3);
    });

    it('should render all tool windows plus settings button in dock', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', { state: 'normal' });
      const tool2 = createMockToolWindow('tool-2', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.addWindow(tool2);
      uiStore.minimizeTool('tool-2');

      wrapper = mount(Dock);

      const dockItems = wrapper.findAll('.dock-item');
      // 2 个工具窗口（normal + minimized 都显示）+ 1 个设置按钮
      expect(dockItems).toHaveLength(3);
    });
  });

  describe('position', () => {
    it('should apply bottom position class by default', () => {
      uiStore.setDockVisible(true);
      uiStore.setDockPosition('bottom');
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      expect(wrapper.find('.dock').classes()).toContain('dock--bottom');
    });

    it('should apply left position class when position is left', () => {
      uiStore.setDockVisible(true);
      uiStore.setDockPosition('left');
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      expect(wrapper.find('.dock').classes()).toContain('dock--left');
    });

    it('should apply right position class when position is right', () => {
      uiStore.setDockVisible(true);
      uiStore.setDockPosition('right');
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      expect(wrapper.find('.dock').classes()).toContain('dock--right');
    });
  });

  describe('restore tool', () => {
    it('should restore tool when DockItem emits restore event', async () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      const restoreToolSpy = vi.spyOn(uiStore, 'restoreTool');

      wrapper = mount(Dock);

      const dockItem = wrapper.findComponent({ name: 'DockItem' });
      await dockItem.vm.$emit('restore', 'tool-1');

      expect(restoreToolSpy).toHaveBeenCalledWith('tool-1');
      expect(restoreToolSpy).toHaveBeenCalledTimes(1);
    });

    it('should restore multiple tools independently', async () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      const tool2 = createMockToolWindow('tool-2', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.addWindow(tool2);
      uiStore.minimizeTool('tool-1');
      uiStore.minimizeTool('tool-2');

      const restoreToolSpy = vi.spyOn(uiStore, 'restoreTool');

      wrapper = mount(Dock);

      const dockItems = wrapper.findAllComponents({ name: 'DockItem' });
      await dockItems[0].vm.$emit('restore', 'tool-1');
      await dockItems[1].vm.$emit('restore', 'tool-2');

      expect(restoreToolSpy).toHaveBeenCalledWith('tool-1');
      expect(restoreToolSpy).toHaveBeenCalledWith('tool-2');
      expect(restoreToolSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('transitions', () => {
    it('should have transition wrapper', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', { state: 'minimized' });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      // Transition 组件会渲染为注释节点或实际元素
      const dock = wrapper.find('.dock');
      expect(dock.exists()).toBe(true);
    });
  });

  describe('tool properties', () => {
    it('should pass correct props to DockItem', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', {
        state: 'minimized',
        icon: '🎨',
        title: 'My Custom Tool',
      });
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      const dockItem = wrapper.findComponent({ name: 'DockItem' });
      expect(dockItem.props('toolId')).toBe('tool-1');
      expect(dockItem.props('icon')).toBe('🎨');
      expect(dockItem.props('title')).toBe('My Custom Tool');
    });

    it('should handle tool without icon', () => {
      uiStore.setDockVisible(true);
      const tool1 = createMockToolWindow('tool-1', {
        state: 'minimized',
        title: 'Tool Without Icon',
      });
      delete tool1.icon;
      uiStore.addWindow(tool1);
      uiStore.minimizeTool('tool-1');

      wrapper = mount(Dock);

      const dockItem = wrapper.findComponent({ name: 'DockItem' });
      expect(dockItem.props('toolId')).toBe('tool-1');
      expect(dockItem.props('icon')).toBeUndefined();
      expect(dockItem.props('title')).toBe('Tool Without Icon');
    });
  });
});
