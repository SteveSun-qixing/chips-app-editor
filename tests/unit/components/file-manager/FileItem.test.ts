/**
 * FileItem 组件测试
 * @module tests/unit/components/file-manager/FileItem
 */

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FileItem from '@/components/file-manager/FileItem.vue';
import type { FileInfo } from '@/core/file-service';

describe('FileItem', () => {
  const mockCardFile: FileInfo = {
    id: 'card-123',
    name: 'test.card',
    path: '/workspace/test.card',
    type: 'card',
    size: 1024,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    isDirectory: false,
  };

  const mockBoxFile: FileInfo = {
    id: 'box-123',
    name: 'collection.box',
    path: '/workspace/collection.box',
    type: 'box',
    size: 2048,
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
    children: [mockCardFile],
    expanded: false,
  };

  describe('rendering', () => {
    it('should render card file with correct icon', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile },
      });

      expect(wrapper.find('.file-item__icon').text()).toBe('🃏');
      expect(wrapper.find('.file-item__name').text()).toBe('test.card');
    });

    it('should render box file with correct icon', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockBoxFile },
      });

      expect(wrapper.find('.file-item__icon').text()).toBe('📦');
    });

    it('should render folder with collapsed icon', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockFolder },
      });

      expect(wrapper.find('.file-item__icon').text()).toBe('📁');
    });

    it('should render folder with expanded icon when expanded', () => {
      const expandedFolder = { ...mockFolder, expanded: true };
      const wrapper = mount(FileItem, {
        props: { file: expandedFolder },
      });

      expect(wrapper.find('.file-item__icon').text()).toBe('📂');
    });

    it('should show toggle button for folders', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockFolder },
      });

      expect(wrapper.find('.file-item__toggle').exists()).toBe(true);
    });

    it('should not show toggle button for files', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile },
      });

      expect(wrapper.find('.file-item__toggle').exists()).toBe(false);
    });

    it('should show badge with children count for folders', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockFolder },
      });

      expect(wrapper.find('.file-item__badge').text()).toBe('1');
    });
  });

  describe('selection', () => {
    it('should apply selected class when selected', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, selected: true },
      });

      expect(wrapper.classes()).toContain('file-item--selected');
    });

    it('should not apply selected class when not selected', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, selected: false },
      });

      expect(wrapper.classes()).not.toContain('file-item--selected');
    });
  });

  describe('indentation', () => {
    it('should apply indentation based on level', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, level: 2 },
      });

      const style = wrapper.attributes('style');
      expect(style).toContain('padding-left');
    });

    it('should have no extra indentation at level 0', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, level: 0 },
      });

      const style = wrapper.attributes('style');
      expect(style).toContain('padding-left: 8px');
    });
  });

  describe('events', () => {
    it('should emit click event on click', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile },
      });

      await wrapper.trigger('click');

      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')![0]).toEqual([mockCardFile, expect.any(MouseEvent)]);
    });

    it('should emit dblclick event on double click', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile },
      });

      await wrapper.trigger('dblclick');

      expect(wrapper.emitted('dblclick')).toBeTruthy();
      expect(wrapper.emitted('dblclick')![0]).toEqual([mockCardFile]);
    });

    it('should emit contextmenu event on right click', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile },
      });

      await wrapper.trigger('contextmenu');

      expect(wrapper.emitted('contextmenu')).toBeTruthy();
    });

    it('should emit toggle event when toggle button clicked', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockFolder },
      });

      await wrapper.find('.file-item__toggle').trigger('click');

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')![0]).toEqual([mockFolder]);
    });
  });

  describe('renaming', () => {
    it('should show input when renaming', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, renaming: true },
      });

      expect(wrapper.find('.file-item__rename-input').exists()).toBe(true);
    });

    it('should hide name when renaming', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, renaming: true },
      });

      expect(wrapper.find('.file-item__name').exists()).toBe(false);
    });

    it('should emit rename event on Enter key', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, renaming: true },
      });

      const input = wrapper.find('.file-item__rename-input');
      await input.setValue('newname');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('rename')).toBeTruthy();
    });

    it('should emit rename-cancel event on Escape key', async () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, renaming: true },
      });

      const input = wrapper.find('.file-item__rename-input');
      await input.trigger('keydown', { key: 'Escape' });

      expect(wrapper.emitted('rename-cancel')).toBeTruthy();
    });
  });

  describe('search highlighting', () => {
    it('should highlight matching text', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, searchQuery: 'test' },
      });

      const nameHtml = wrapper.find('.file-item__name').html();
      expect(nameHtml).toContain('file-item__highlight');
    });

    it('should not highlight when no search query', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, searchQuery: '' },
      });

      const nameHtml = wrapper.find('.file-item__name').html();
      expect(nameHtml).not.toContain('file-item__highlight');
    });

    it('should be case insensitive highlighting', () => {
      const wrapper = mount(FileItem, {
        props: { file: mockCardFile, searchQuery: 'TEST' },
      });

      const nameHtml = wrapper.find('.file-item__name').html();
      expect(nameHtml).toContain('file-item__highlight');
    });
  });
});
