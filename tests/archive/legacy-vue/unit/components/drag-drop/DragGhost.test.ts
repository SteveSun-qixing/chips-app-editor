/**
 * 拖动幽灵组件测试
 * @module tests/unit/components/drag-drop/DragGhost
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DragGhost from '@/components/drag-drop/DragGhost.vue';

describe('DragGhost', () => {
  // 需要 stub Teleport
  const mountOptions = {
    global: {
      stubs: {
        teleport: true,
      },
    },
  };

  describe('visibility', () => {
    it('should not render when visible is false', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: false,
        },
      });

      expect(wrapper.find('.drag-ghost').exists()).toBe(false);
    });

    it('should render when visible is true', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
        },
      });

      expect(wrapper.find('.drag-ghost').exists()).toBe(true);
    });
  });

  describe('positioning', () => {
    it('should apply correct position style', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          x: 150,
          y: 250,
        },
      });

      const ghost = wrapper.find('.drag-ghost');
      const style = ghost.attributes('style');

      expect(style).toContain('left: 150px');
      expect(style).toContain('top: 250px');
    });
  });

  describe('content', () => {
    it('should render title', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          title: 'Test Title',
        },
      });

      expect(wrapper.find('.drag-ghost__title').text()).toBe('Test Title');
    });

    it('should render icon', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          icon: '🎨',
        },
      });

      expect(wrapper.find('.drag-ghost__icon').text()).toBe('🎨');
    });

    it('should render type hint when provided', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          typeHint: 'Image file',
        },
      });

      expect(wrapper.find('.drag-ghost__hint').exists()).toBe(true);
      expect(wrapper.find('.drag-ghost__hint').text()).toBe('Image file');
    });

    it('should not render type hint when not provided', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          typeHint: '',
        },
      });

      expect(wrapper.find('.drag-ghost__hint').exists()).toBe(false);
    });
  });

  describe('can drop state', () => {
    it('should show ok status icon when canDrop is true', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          canDrop: true,
        },
      });

      expect(wrapper.find('.drag-ghost__status-icon--ok').exists()).toBe(true);
      expect(wrapper.find('.drag-ghost__status-icon--no').exists()).toBe(false);
    });

    it('should show no status icon when canDrop is false', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          canDrop: false,
        },
      });

      expect(wrapper.find('.drag-ghost__status-icon--no').exists()).toBe(true);
      expect(wrapper.find('.drag-ghost__status-icon--ok').exists()).toBe(false);
    });

    it('should apply cannot-drop class when canDrop is false', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
          canDrop: false,
        },
      });

      expect(wrapper.find('.drag-ghost--cannot-drop').exists()).toBe(true);
    });
  });

  describe('default props', () => {
    it('should have correct default values', () => {
      const wrapper = mount(DragGhost, {
        ...mountOptions,
        props: {
          visible: true,
        },
      });

      // 默认 icon
      expect(wrapper.find('.drag-ghost__icon').text()).toBe('📄');
      // 默认 canDrop 是 true
      expect(wrapper.find('.drag-ghost__status-icon--ok').exists()).toBe(true);
    });
  });
});
