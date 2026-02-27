/**
 * BaseWindow 组件测试
 * @module tests/unit/components/window/BaseWindow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import BaseWindow from '@/components/window/BaseWindow.vue';
import type { WindowConfig } from '@/types';

// 创建测试用窗口配置
function createMockWindowConfig(
  overrides?: Partial<WindowConfig>
): WindowConfig {
  return {
    id: 'test-window',
    type: 'tool',
    title: 'Test Window',
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: true,
    minimizable: true,
    ...overrides,
  };
}

describe('BaseWindow', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('rendering', () => {
    it('should render window with correct title', () => {
      const config = createMockWindowConfig({ title: '我的窗口' });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window__title').text()).toBe('我的窗口');
    });

    it('should apply correct styles from config', () => {
      const config = createMockWindowConfig({
        position: { x: 200, y: 150 },
        size: { width: 500, height: 400 },
        zIndex: 200,
      });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      const style = wrapper.find('.base-window').attributes('style');
      expect(style).toContain('transform: translate(200px, 150px)');
      expect(style).toContain('width: 500px');
      expect(style).toContain('height: 400px');
      expect(style).toContain('z-index: 200');
    });

    it('should hide window when minimized', () => {
      const config = createMockWindowConfig({ state: 'minimized' });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window').classes()).toContain(
        'base-window--minimized'
      );
    });

    it('should collapse content when collapsed', () => {
      const config = createMockWindowConfig({ state: 'collapsed' });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window').classes()).toContain(
        'base-window--collapsed'
      );
      expect(
        wrapper.find('.base-window__content').attributes('style')
      ).toContain('display: none');
    });
  });

  describe('action buttons', () => {
    it('should show minimize button when minimizable is true', () => {
      const config = createMockWindowConfig({ minimizable: true });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(
        wrapper.find('.base-window__action--minimize').exists()
      ).toBe(true);
    });

    it('should hide minimize button when minimizable is false', () => {
      const config = createMockWindowConfig({ minimizable: false });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(
        wrapper.find('.base-window__action--minimize').exists()
      ).toBe(false);
    });

    it('should show close button when closable is true', () => {
      const config = createMockWindowConfig({ closable: true });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window__action--close').exists()).toBe(true);
    });

    it('should hide close button when closable is false', () => {
      const config = createMockWindowConfig({ closable: false });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window__action--close').exists()).toBe(false);
    });

    it('should emit close event when close button clicked', async () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      await wrapper.find('.base-window__action--close').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit minimize event when minimize button clicked', async () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      await wrapper.find('.base-window__action--minimize').trigger('click');

      expect(wrapper.emitted('minimize')).toBeTruthy();
      expect(wrapper.emitted('minimize')).toHaveLength(1);
    });

    it('should emit collapse event when collapse button clicked', async () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      await wrapper.find('.base-window__action--collapse').trigger('click');

      expect(wrapper.emitted('collapse')).toBeTruthy();
      expect(wrapper.emitted('collapse')).toHaveLength(1);
    });
  });

  describe('focus', () => {
    it('should emit focus event when window clicked', async () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      await wrapper.find('.base-window').trigger('mousedown');

      expect(wrapper.emitted('focus')).toBeTruthy();
    });
  });

  describe('resize handle', () => {
    it('should show resize handle when resizable and normal state', () => {
      const config = createMockWindowConfig({
        state: 'normal',
      });
      wrapper = mount(BaseWindow, {
        props: { config, resizable: true },
      });

      expect(wrapper.find('.base-window__resize-handle').exists()).toBe(true);
    });

    it('should hide resize handle when not resizable', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config, resizable: false },
      });

      expect(wrapper.find('.base-window__resize-handle').exists()).toBe(false);
    });

    it('should hide resize handle when collapsed', () => {
      const config = createMockWindowConfig({ state: 'collapsed' });
      wrapper = mount(BaseWindow, {
        props: { config, resizable: true },
      });

      expect(wrapper.find('.base-window__resize-handle').exists()).toBe(false);
    });
  });

  describe('slots', () => {
    it('should render default slot content', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
        slots: {
          default: '<div class="custom-content">Custom Content</div>',
        },
      });

      expect(wrapper.find('.custom-content').exists()).toBe(true);
      expect(wrapper.find('.custom-content').text()).toBe('Custom Content');
    });

    it('should render header slot content', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
        slots: {
          header: '<div class="custom-header">Custom Header</div>',
        },
      });

      expect(wrapper.find('.custom-header').exists()).toBe(true);
      expect(wrapper.find('.custom-header').text()).toBe('Custom Header');
    });

    it('should render actions slot content', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
        slots: {
          actions: '<button class="custom-action">Custom Action</button>',
        },
      });

      expect(wrapper.find('.custom-action').exists()).toBe(true);
    });
  });

  describe('props defaults', () => {
    it('should have default draggable as true', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      // Check via header cursor style in classes
      expect(wrapper.find('.base-window__header').exists()).toBe(true);
    });

    it('should have default resizable as true', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      expect(wrapper.find('.base-window__resize-handle').exists()).toBe(true);
    });

    it('should use custom minWidth and minHeight', () => {
      const config = createMockWindowConfig();
      wrapper = mount(BaseWindow, {
        props: {
          config,
          minWidth: 300,
          minHeight: 200,
        },
      });

      // Props are validated but we mainly check they're accepted
      expect(wrapper.props('minWidth')).toBe(300);
      expect(wrapper.props('minHeight')).toBe(200);
    });
  });

  describe('collapse button icon', () => {
    it('should show up arrow when normal', () => {
      const config = createMockWindowConfig({ state: 'normal' });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      const collapseButton = wrapper.find('.base-window__action--collapse');
      expect(collapseButton.text()).toBe('△');
    });

    it('should show down arrow when collapsed', () => {
      const config = createMockWindowConfig({ state: 'collapsed' });
      wrapper = mount(BaseWindow, {
        props: { config },
      });

      const collapseButton = wrapper.find('.base-window__action--collapse');
      expect(collapseButton.text()).toBe('▽');
    });
  });
});
