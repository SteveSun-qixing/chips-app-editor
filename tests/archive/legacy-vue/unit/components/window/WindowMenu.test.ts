/**
 * WindowMenu 组件测试
 * @module tests/unit/components/window/WindowMenu
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import WindowMenu from '@/components/window/WindowMenu.vue';

describe('WindowMenu', () => {
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
    it('should render title', () => {
      wrapper = mount(WindowMenu, {
        props: { title: '测试标题' },
      });

      expect(wrapper.find('.window-menu__title').text()).toBe('测试标题');
    });

    it('should show lock button when showLock is true', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '🔒')).toBe(true);
    });

    it('should hide lock button when showLock is false', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: false },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '🔒' || b.text() === '🔓')).toBe(
        false
      );
    });

    it('should show settings button when showSettings is true', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showSettings: true },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '⚙️')).toBe(true);
    });

    it('should hide settings button when showSettings is false', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showSettings: false },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '⚙️')).toBe(false);
    });

    it('should show cover button when showCover is true', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showCover: true },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '🖼️')).toBe(true);
    });

    it('should hide cover button when showCover is false', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showCover: false },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '🖼️')).toBe(false);
    });
  });

  describe('lock button state', () => {
    it('should show locked icon when not editing', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true, isEditing: false },
      });

      const lockButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🔒' || b.text() === '🔓'
      );
      expect(lockButton?.text()).toBe('🔒');
    });

    it('should show unlocked icon when editing', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true, isEditing: true },
      });

      const lockButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🔒' || b.text() === '🔓'
      );
      expect(lockButton?.text()).toBe('🔓');
    });

    it('should have active class when editing', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true, isEditing: true },
      });

      const lockButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🔓'
      );
      expect(lockButton?.classes()).toContain('window-menu__button--active');
    });
  });

  describe('events', () => {
    it('should emit toggleEdit when lock button clicked', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true },
      });

      const lockButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🔒'
      );
      await lockButton?.trigger('click');

      expect(wrapper.emitted('toggleEdit')).toBeTruthy();
      expect(wrapper.emitted('toggleEdit')).toHaveLength(1);
    });

    it('should emit switchToCover when cover button clicked', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showCover: true },
      });

      const coverButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🖼️'
      );
      await coverButton?.trigger('click');

      expect(wrapper.emitted('switchToCover')).toBeTruthy();
      expect(wrapper.emitted('switchToCover')).toHaveLength(1);
    });

    it('should emit settings when settings button clicked', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showSettings: true },
      });

      const settingsButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '⚙️'
      );
      await settingsButton?.trigger('click');

      expect(wrapper.emitted('settings')).toBeTruthy();
      expect(wrapper.emitted('settings')).toHaveLength(1);
    });
  });

  describe('title editing', () => {
    it('should enter edit mode on double click', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      expect(wrapper.find('.window-menu__title-input').exists()).toBe(true);
      expect(wrapper.find('.window-menu__title').exists()).toBe(false);
    });

    it('should show input with current title value', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find<HTMLInputElement>('.window-menu__title-input');
      expect(input.element.value).toBe('原始标题');
    });

    it('should emit update:title on Enter', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find('.window-menu__title-input');
      await input.setValue('新标题');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('update:title')).toBeTruthy();
      expect(wrapper.emitted('update:title')?.[0]).toEqual(['新标题']);
    });

    it('should emit update:title on blur', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find('.window-menu__title-input');
      await input.setValue('新标题');
      await input.trigger('blur');

      expect(wrapper.emitted('update:title')).toBeTruthy();
      expect(wrapper.emitted('update:title')?.[0]).toEqual(['新标题']);
    });

    it('should cancel edit on Escape', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find('.window-menu__title-input');
      await input.setValue('新标题');
      await input.trigger('keydown', { key: 'Escape' });

      expect(wrapper.emitted('update:title')).toBeFalsy();
      expect(wrapper.find('.window-menu__title').exists()).toBe(true);
    });

    it('should not emit update:title if empty after trim', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find('.window-menu__title-input');
      await input.setValue('   ');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('update:title')).toBeFalsy();
    });

    it('should trim title before emitting', async () => {
      wrapper = mount(WindowMenu, {
        props: { title: '原始标题' },
      });

      await wrapper.find('.window-menu__title').trigger('dblclick');

      const input = wrapper.find('.window-menu__title-input');
      await input.setValue('  新标题  ');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('update:title')?.[0]).toEqual(['新标题']);
    });
  });

  describe('accessibility', () => {
    it('should have correct aria-labels on buttons', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true, showCover: true, showSettings: true },
      });

      const buttons = wrapper.findAll('.window-menu__button');
      const ariaLabels = buttons.map((b) => b.attributes('aria-label'));

      expect(ariaLabels).toContain('切换到编辑模式');
      expect(ariaLabels).toContain('切换到封面');
      expect(ariaLabels).toContain('设置');
    });

    it('should update aria-label when editing', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test', showLock: true, isEditing: true },
      });

      const lockButton = wrapper.findAll('.window-menu__button').find(
        (b) => b.text() === '🔓'
      );
      expect(lockButton?.attributes('aria-label')).toBe('切换到查看模式');
    });
  });

  describe('default props', () => {
    it('should have correct default values', () => {
      wrapper = mount(WindowMenu, {
        props: { title: 'Test' },
      });

      // Default showSettings is true
      const buttons = wrapper.findAll('.window-menu__button');
      expect(buttons.some((b) => b.text() === '⚙️')).toBe(true);

      // Default showCover is true
      expect(buttons.some((b) => b.text() === '🖼️')).toBe(true);

      // Default showLock is false
      expect(buttons.some((b) => b.text() === '🔒' || b.text() === '🔓')).toBe(
        false
      );

      // Default isEditing is false (can't directly test, but we tested the lock icon above)
    });
  });
});
