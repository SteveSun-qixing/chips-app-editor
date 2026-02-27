/**
 * ContextMenu 组件测试
 * @module tests/unit/components/file-manager/ContextMenu
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ContextMenu } from '@/components/file-manager/ContextMenu';
import type { FileInfo } from '@/core/file-service';

describe('ContextMenu', () => {
  const mockFile: FileInfo = {
    id: 'card-123',
    name: 'test.card',
    path: '/workspace/test.card',
    type: 'card',
    size: 1024,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    isDirectory: false,
  };

  const mockFolder: FileInfo = {
    id: 'folder-123',
    name: 'Documents',
    path: '/workspace/Documents',
    type: 'folder',
    size: 0,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    isDirectory: true,
    children: [],
  };

  describe('visibility', () => {
    it('should not render when not visible', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: false,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(false);
    });

    it('should render when visible', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });
  });

  describe('positioning', () => {
    it('should position at specified coordinates', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 150,
          y: 200,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Wait for position adjustment
      await wrapper.vm.$nextTick();

      const style = wrapper.find('.context-menu').attributes('style');
      expect(style).toContain('left:');
      expect(style).toContain('top:');
    });
  });

  describe('menu items', () => {
    it('should show new menu items', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      const labels = items.map((item) => item.find('.context-menu__label').text());

      expect(labels).toContain('新建');
    });

    it('should show file operations when files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      const labels = items.map((item) => item.find('.context-menu__label').text());

      expect(labels).toContain('打开');
      expect(labels).toContain('剪切');
      expect(labels).toContain('复制');
      expect(labels).toContain('重命名');
      expect(labels).toContain('删除');
    });

    it('should disable open when multiple files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile, mockFolder],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const openItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '打开'
      );

      expect(openItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should disable rename when multiple files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile, mockFolder],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const renameItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '重命名'
      );

      expect(renameItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should disable paste when no clipboard', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: false,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '粘贴'
      );

      expect(pasteItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should enable paste when clipboard has content', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: true,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '粘贴'
      );

      expect(pasteItem?.classes()).not.toContain('context-menu__item--disabled');
    });
  });

  describe('events', () => {
    it('should emit action event when item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Find a non-disabled item without children
      const refreshItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '刷新'
      );

      await refreshItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeTruthy();
      expect(wrapper.emitted('action')![0][0]).toBe('refresh');
    });

    it('should emit close event when item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const refreshItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '刷新'
      );

      await refreshItem?.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not emit action for disabled items', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: false,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '粘贴'
      );

      await pasteItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeFalsy();
    });
  });

  describe('submenu', () => {
    it('should show submenu on hover', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const newItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '新建'
      );

      await newItem?.trigger('mouseenter');

      expect(wrapper.find('.context-menu__submenu').exists()).toBe(true);
    });

    it('should emit action when submenu item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Hover to show submenu
      const newItem = wrapper.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '新建'
      );
      await newItem?.trigger('mouseenter');

      // Click submenu item
      const submenu = wrapper.find('.context-menu__submenu');
      const newCardItem = submenu.findAll('.context-menu__item').find((item) =>
        item.find('.context-menu__label').text() === '新建卡片'
      );
      await newCardItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeTruthy();
      expect(wrapper.emitted('action')![0][0]).toBe('new-card');
    });
  });

  describe('dividers', () => {
    it('should render dividers', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.findAll('.context-menu__divider').length).toBeGreaterThan(0);
    });
  });

  describe('keyboard interaction', () => {
    it('should have menu role for accessibility', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').attributes('role')).toBe('menu');
    });

    it('menu items should have menuitem role', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      items.forEach((item) => {
        expect(item.attributes('role')).toBe('menuitem');
      });
    });
  });
});
