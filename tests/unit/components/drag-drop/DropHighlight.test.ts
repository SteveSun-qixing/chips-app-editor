/**
 * 放置高亮组件测试
 * @module tests/unit/components/drag-drop/DropHighlight
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DropHighlight from '@/components/drag-drop/DropHighlight.vue';

describe('DropHighlight', () => {
  describe('rendering', () => {
    it('should render slot content', () => {
      const wrapper = mount(DropHighlight, {
        slots: {
          default: '<div class="test-content">Content</div>',
        },
      });

      expect(wrapper.find('.test-content').exists()).toBe(true);
      expect(wrapper.find('.test-content').text()).toBe('Content');
    });

    it('should not show border when not active', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: false,
        },
      });

      expect(wrapper.find('.drop-highlight__border').exists()).toBe(false);
    });

    it('should show border when active', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
        },
      });

      expect(wrapper.find('.drop-highlight__border').exists()).toBe(true);
    });
  });

  describe('can drop state', () => {
    it('should apply can-drop class when canDrop is true', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
          canDrop: true,
        },
      });

      expect(wrapper.find('.drop-highlight--can-drop').exists()).toBe(true);
      expect(wrapper.find('.drop-highlight--cannot-drop').exists()).toBe(false);
    });

    it('should apply cannot-drop class when canDrop is false', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
          canDrop: false,
        },
      });

      expect(wrapper.find('.drop-highlight--cannot-drop').exists()).toBe(true);
      expect(wrapper.find('.drop-highlight--can-drop').exists()).toBe(false);
    });

    it('should show forbidden icon when cannot drop', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
          canDrop: false,
        },
      });

      expect(wrapper.find('.drop-highlight__forbidden').exists()).toBe(true);
    });

    it('should not show forbidden icon when can drop', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
          canDrop: true,
        },
      });

      expect(wrapper.find('.drop-highlight__forbidden').exists()).toBe(false);
    });
  });

  describe('type variants', () => {
    it('should apply default type class', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          type: 'default',
        },
      });

      expect(wrapper.find('.drop-highlight--default').exists()).toBe(true);
    });

    it('should apply nest type class', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          type: 'nest',
        },
      });

      expect(wrapper.find('.drop-highlight--nest').exists()).toBe(true);
    });

    it('should apply insert type class', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          type: 'insert',
        },
      });

      expect(wrapper.find('.drop-highlight--insert').exists()).toBe(true);
    });
  });

  describe('active state', () => {
    it('should apply active class when active', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: true,
        },
      });

      expect(wrapper.find('.drop-highlight--active').exists()).toBe(true);
    });

    it('should not apply active class when not active', () => {
      const wrapper = mount(DropHighlight, {
        props: {
          active: false,
        },
      });

      expect(wrapper.find('.drop-highlight--active').exists()).toBe(false);
    });
  });
});
