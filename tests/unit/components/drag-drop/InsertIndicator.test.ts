/**
 * 插入指示线组件测试
 * @module tests/unit/components/drag-drop/InsertIndicator
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InsertIndicator from '@/components/drag-drop/InsertIndicator.vue';

describe('InsertIndicator', () => {
  describe('visibility', () => {
    it('should not render when visible is false', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: false,
        },
      });

      expect(wrapper.find('.insert-indicator').exists()).toBe(false);
    });

    it('should render when visible is true', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
        },
      });

      expect(wrapper.find('.insert-indicator').exists()).toBe(true);
    });
  });

  describe('positioning', () => {
    it('should apply correct style for horizontal direction', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
          position: 100,
          direction: 'horizontal',
          length: 200,
          offset: 10,
        },
      });

      const indicator = wrapper.find('.insert-indicator');
      const style = indicator.attributes('style');

      expect(style).toContain('top: 100px');
      expect(style).toContain('left: 10px');
      expect(style).toContain('width: 200px');
      expect(style).toContain('height: 2px');
    });

    it('should apply correct style for vertical direction', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
          position: 50,
          direction: 'vertical',
          length: 150,
          offset: 5,
        },
      });

      const indicator = wrapper.find('.insert-indicator');
      const style = indicator.attributes('style');

      expect(style).toContain('left: 50px');
      expect(style).toContain('top: 5px');
      expect(style).toContain('height: 150px');
      expect(style).toContain('width: 2px');
    });

    it('should use 100% for length when length is 0', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
          position: 0,
          direction: 'horizontal',
          length: 0,
        },
      });

      const indicator = wrapper.find('.insert-indicator');
      const style = indicator.attributes('style');

      expect(style).toContain('width: 100%');
    });
  });

  describe('structure', () => {
    it('should render dots and line', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
        },
      });

      expect(wrapper.find('.insert-indicator__dot--start').exists()).toBe(true);
      expect(wrapper.find('.insert-indicator__dot--end').exists()).toBe(true);
      expect(wrapper.find('.insert-indicator__line').exists()).toBe(true);
    });
  });

  describe('default props', () => {
    it('should have correct default values', () => {
      const wrapper = mount(InsertIndicator, {
        props: {
          visible: true,
        },
      });

      const indicator = wrapper.find('.insert-indicator');
      const style = indicator.attributes('style');

      // 默认 position 是 0
      expect(style).toContain('top: 0px');
      // 默认 direction 是 horizontal，所以是 top
    });
  });
});
