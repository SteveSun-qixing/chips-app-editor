/**
 * DockItem 组件测试
 * @module tests/unit/components/dock/DockItem
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import DockItem from '@/components/dock/DockItem.vue';

describe('DockItem', () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('rendering', () => {
    it('should render with correct props', () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'test-tool-1',
          icon: '🔧',
          title: 'Test Tool',
        },
      });

      expect(wrapper.find('.dock-item').exists()).toBe(true);
      expect(wrapper.find('.dock-item__icon').text()).toBe('🔧');
      expect(wrapper.find('.dock-item').attributes('title')).toBe('Test Tool');
    });

    it('should use default icon when icon prop is not provided', () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'test-tool-1',
          title: 'Test Tool',
        },
      });

      expect(wrapper.find('.dock-item__icon').text()).toBe('📦');
    });

    it('should display tooltip with title', () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'test-tool-1',
          title: 'My Tool',
        },
      });

      const tooltip = wrapper.find('.dock-item__tooltip');
      expect(tooltip.exists()).toBe(true);
      expect(tooltip.text()).toBe('My Tool');
    });
  });

  describe('events', () => {
    it('should emit restore event when clicked', async () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'test-tool-1',
          title: 'Test Tool',
        },
      });

      await wrapper.find('.dock-item').trigger('click');

      expect(wrapper.emitted('restore')).toBeTruthy();
      expect(wrapper.emitted('restore')).toHaveLength(1);
      expect(wrapper.emitted('restore')?.[0]).toEqual(['test-tool-1']);
    });

    it('should emit restore event with correct toolId', async () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'another-tool-id',
          title: 'Another Tool',
        },
      });

      await wrapper.find('.dock-item').trigger('click');

      expect(wrapper.emitted('restore')?.[0]).toEqual(['another-tool-id']);
    });
  });

  describe('styles', () => {
    it('should have correct CSS classes', () => {
      wrapper = mount(DockItem, {
        props: {
          toolId: 'test-tool-1',
          title: 'Test Tool',
        },
      });

      expect(wrapper.find('.dock-item').classes()).toContain('dock-item');
      expect(wrapper.find('.dock-item__icon').exists()).toBe(true);
      expect(wrapper.find('.dock-item__tooltip').exists()).toBe(true);
    });
  });
});
