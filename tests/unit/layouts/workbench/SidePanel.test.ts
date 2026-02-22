/**
 * SidePanel 组件测试
 * @module tests/unit/layouts/workbench/SidePanel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import SidePanel from '@/layouts/workbench/SidePanel.vue';

describe('SidePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(SidePanel);
      
      expect(wrapper.find('.side-panel').exists()).toBe(true);
      expect(wrapper.find('.side-panel--left').exists()).toBe(true);
      expect(wrapper.find('.side-panel--expanded').exists()).toBe(true);
    });

    it('should render with right position', () => {
      const wrapper = mount(SidePanel, {
        props: { position: 'right' },
      });
      
      expect(wrapper.find('.side-panel--right').exists()).toBe(true);
    });

    it('should render collapsed state', () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: false },
      });
      
      expect(wrapper.find('.side-panel--collapsed').exists()).toBe(true);
      expect(wrapper.find('.side-panel__collapsed-trigger').exists()).toBe(true);
    });

    it('should render with title', () => {
      const wrapper = mount(SidePanel, {
        props: { title: 'Test Panel' },
      });
      
      expect(wrapper.find('.side-panel__title').text()).toBe('Test Panel');
    });

    it('should render slot content', () => {
      const wrapper = mount(SidePanel, {
        slots: {
          default: '<div class="test-content">Content</div>',
        },
      });
      
      expect(wrapper.find('.test-content').exists()).toBe(true);
    });
  });

  describe('width control', () => {
    it('should apply custom width', () => {
      const wrapper = mount(SidePanel, {
        props: { width: 300 },
      });
      
      expect(wrapper.find('.side-panel').attributes('style')).toContain('width: 300px');
    });

    it('should show collapsed width when collapsed', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          expanded: false,
          collapsedWidth: 48,
        },
      });
      
      expect(wrapper.find('.side-panel').attributes('style')).toContain('width: 48px');
    });
  });

  describe('expand/collapse', () => {
    it('should toggle expand state on toggle button click', async () => {
      const wrapper = mount(SidePanel, {
        props: { 
          title: 'Test',
          expanded: true,
        },
      });
      
      const toggleButton = wrapper.find('.side-panel__toggle');
      await toggleButton.trigger('click');
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
      expect(wrapper.emitted('update:expanded')![0]).toEqual([false]);
    });

    it('should expand on collapsed trigger click', async () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: false },
      });
      
      const trigger = wrapper.find('.side-panel__collapsed-trigger');
      await trigger.trigger('click');
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
      expect(wrapper.emitted('update:expanded')![0]).toEqual([true]);
    });

    it('should expand on Enter key', async () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: false },
      });
      
      const trigger = wrapper.find('.side-panel__collapsed-trigger');
      await trigger.trigger('keydown', { key: 'Enter' });
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
    });

    it('should expand on Space key', async () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: false },
      });
      
      const trigger = wrapper.find('.side-panel__collapsed-trigger');
      await trigger.trigger('keydown', { key: ' ' });
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
    });
  });

  describe('resize handle', () => {
    it('should show resize handle when expanded and resizable', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          expanded: true,
          resizable: true,
        },
      });
      
      expect(wrapper.find('.side-panel__resize-handle').exists()).toBe(true);
    });

    it('should hide resize handle when collapsed', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          expanded: false,
          resizable: true,
        },
      });
      
      expect(wrapper.find('.side-panel__resize-handle').exists()).toBe(false);
    });

    it('should hide resize handle when not resizable', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          expanded: true,
          resizable: false,
        },
      });
      
      expect(wrapper.find('.side-panel__resize-handle').exists()).toBe(false);
    });

    it('should emit resize-start on mousedown', async () => {
      const wrapper = mount(SidePanel, {
        props: { 
          expanded: true,
          resizable: true,
        },
      });
      
      const handle = wrapper.find('.side-panel__resize-handle');
      await handle.trigger('mousedown', { clientX: 100 });
      
      expect(wrapper.emitted('resize-start')).toBeTruthy();
    });

    it('should reset width on double click', async () => {
      const wrapper = mount(SidePanel, {
        props: { 
          width: 280,
          expanded: true,
          resizable: true,
        },
      });
      
      const handle = wrapper.find('.side-panel__resize-handle');
      await handle.trigger('dblclick');
      
      expect(wrapper.emitted('update:width')).toBeTruthy();
      expect(wrapper.emitted('update:width')![0]).toEqual([280]);
    });
  });

  describe('expose', () => {
    it('should expose isExpanded', () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: true },
      });
      
      expect(wrapper.vm.isExpanded).toBe(true);
    });

    it('should expose expand method', async () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: false },
      });
      
      wrapper.vm.expand();
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
      expect(wrapper.emitted('update:expanded')![0]).toEqual([true]);
    });

    it('should expose collapse method', async () => {
      const wrapper = mount(SidePanel, {
        props: { expanded: true },
      });
      
      wrapper.vm.collapse();
      
      expect(wrapper.emitted('update:expanded')).toBeTruthy();
      expect(wrapper.emitted('update:expanded')![0]).toEqual([false]);
    });

    it('should expose setWidth method', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          width: 280,
          minWidth: 180,
          maxWidth: 480,
        },
      });
      
      wrapper.vm.setWidth(350);
      
      expect(wrapper.emitted('update:width')).toBeTruthy();
      expect(wrapper.emitted('update:width')![0]).toEqual([350]);
    });

    it('should clamp width to min/max', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          width: 280,
          minWidth: 180,
          maxWidth: 480,
        },
      });
      
      wrapper.vm.setWidth(100);
      expect(wrapper.emitted('update:width')![0]).toEqual([180]);
      
      wrapper.vm.setWidth(600);
      expect(wrapper.emitted('update:width')![1]).toEqual([480]);
    });
  });

  describe('accessibility', () => {
    it('should have correct aria attributes', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          title: 'Test Panel',
          expanded: true,
        },
      });
      
      const panel = wrapper.find('.side-panel');
      expect(panel.attributes('role')).toBe('complementary');
      expect(panel.attributes('aria-expanded')).toBe('true');
    });

    it('should have toggle button with aria-label', () => {
      const wrapper = mount(SidePanel, {
        props: { 
          title: 'Test',
          expanded: true,
        },
      });
      
      const toggle = wrapper.find('.side-panel__toggle');
      expect(toggle.attributes('aria-label')).toBe('收起面板');
    });
  });
});
