/**
 * FileTree 组件测试
 * @module tests/unit/components/file-manager/FileTree
 */

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FileTree from '@/components/file-manager/FileTree.vue';
import FileItem from '@/components/file-manager/FileItem.vue';
import type { FileInfo } from '@/core/file-service';

describe('FileTree', () => {
  const mockFiles: FileInfo[] = [
    {
      id: 'folder-1',
      name: 'Documents',
      path: '/workspace/Documents',
      type: 'folder',
      size: 0,
      createdAt: '2026-01-01T00:00:00Z',
      modifiedAt: '2026-01-01T00:00:00Z',
      isDirectory: true,
      expanded: true,
      children: [
        {
          id: 'card-1',
          name: 'notes.card',
          path: '/workspace/Documents/notes.card',
          type: 'card',
          size: 1024,
          createdAt: '2026-01-01T00:00:00Z',
          modifiedAt: '2026-01-01T00:00:00Z',
          isDirectory: false,
        },
      ],
    },
    {
      id: 'card-2',
      name: 'readme.card',
      path: '/workspace/readme.card',
      type: 'card',
      size: 512,
      createdAt: '2026-01-01T00:00:00Z',
      modifiedAt: '2026-01-01T00:00:00Z',
      isDirectory: false,
    },
  ];

  describe('rendering', () => {
    it('should render file items', () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      const items = wrapper.findAllComponents(FileItem);
      // Should render folder + its child + root card = 3 items
      expect(items.length).toBe(3);
    });

    it('should show empty state when no files', () => {
      const wrapper = mount(FileTree, {
        props: { files: [] },
      });

      expect(wrapper.find('.file-tree__empty').exists()).toBe(true);
    });

    it('should not show empty state when files exist', () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      expect(wrapper.find('.file-tree__empty').exists()).toBe(false);
    });
  });

  describe('selection', () => {
    it('should emit select event on file click', async () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      const items = wrapper.findAllComponents(FileItem);
      await items[0]?.trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
    });

    it('should pass selected paths to FileItem', () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          selectedPaths: ['/workspace/readme.card'],
        },
      });

      const items = wrapper.findAllComponents(FileItem);
      const readmeItem = items.find((item) => 
        item.props('file').path === '/workspace/readme.card'
      );
      
      expect(readmeItem?.props('selected')).toBe(true);
    });
  });

  describe('expanding/collapsing', () => {
    it('should emit toggle event when folder is toggled', async () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      const folderItem = wrapper.findAllComponents(FileItem)[0];
      await folderItem?.vm.$emit('toggle', mockFiles[0]);

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')![0]).toEqual([mockFiles[0]]);
    });

    it('should not render children of collapsed folders', () => {
      const collapsedFiles: FileInfo[] = [
        {
          ...mockFiles[0]!,
          expanded: false,
        },
        mockFiles[1]!,
      ];

      const wrapper = mount(FileTree, {
        props: { files: collapsedFiles },
      });

      const items = wrapper.findAllComponents(FileItem);
      // Should only render folder + root card = 2 items (child hidden)
      expect(items.length).toBe(2);
    });
  });

  describe('opening files', () => {
    it('should emit open event on file double click', async () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      const items = wrapper.findAllComponents(FileItem);
      const fileItem = items.find((item) => !item.props('file').isDirectory);
      await fileItem?.vm.$emit('dblclick', fileItem.props('file'));

      expect(wrapper.emitted('open')).toBeTruthy();
    });
  });

  describe('context menu', () => {
    it('should emit contextmenu event on right click', async () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      const mockEvent = new MouseEvent('contextmenu');
      const items = wrapper.findAllComponents(FileItem);
      await items[0]?.vm.$emit('contextmenu', mockFiles[0], mockEvent);

      expect(wrapper.emitted('contextmenu')).toBeTruthy();
    });

    it('should select file if not already selected before showing context menu', async () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          selectedPaths: [],
        },
      });

      const mockEvent = new MouseEvent('contextmenu');
      const items = wrapper.findAllComponents(FileItem);
      await items[0]?.vm.$emit('contextmenu', mockFiles[0], mockEvent);

      const selectEmits = wrapper.emitted('select');
      expect(selectEmits).toBeTruthy();
    });
  });

  describe('renaming', () => {
    it('should pass renaming path to FileItem', () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          renamingPath: '/workspace/readme.card',
        },
      });

      const items = wrapper.findAllComponents(FileItem);
      const readmeItem = items.find((item) => 
        item.props('file').path === '/workspace/readme.card'
      );
      
      expect(readmeItem?.props('renaming')).toBe(true);
    });

    it('should emit rename event', async () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          renamingPath: '/workspace/readme.card',
        },
      });

      const items = wrapper.findAllComponents(FileItem);
      const readmeItem = items.find((item) => 
        item.props('file').path === '/workspace/readme.card'
      );
      
      await readmeItem?.vm.$emit('rename', readmeItem.props('file'), 'newname');

      expect(wrapper.emitted('rename')).toBeTruthy();
    });

    it('should emit rename-cancel event', async () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          renamingPath: '/workspace/readme.card',
        },
      });

      const items = wrapper.findAllComponents(FileItem);
      const readmeItem = items.find((item) => 
        item.props('file').path === '/workspace/readme.card'
      );
      
      await readmeItem?.vm.$emit('rename-cancel');

      expect(wrapper.emitted('rename-cancel')).toBeTruthy();
    });
  });

  describe('search', () => {
    it('should pass search query to FileItem', () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          searchQuery: 'notes',
        },
      });

      const items = wrapper.findAllComponents(FileItem);
      items.forEach((item) => {
        expect(item.props('searchQuery')).toBe('notes');
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should have tabindex for keyboard focus', () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      expect(wrapper.attributes('tabindex')).toBe('0');
    });

    it('should have tree role for accessibility', () => {
      const wrapper = mount(FileTree, {
        props: { files: mockFiles },
      });

      expect(wrapper.attributes('role')).toBe('tree');
    });
  });

  describe('multi-select', () => {
    it('should allow multi-select when enabled', async () => {
      const wrapper = mount(FileTree, {
        props: {
          files: mockFiles,
          multiSelect: true,
          selectedPaths: ['/workspace/Documents'],
        },
      });

      // Simulate Ctrl+click on another file
      const items = wrapper.findAllComponents(FileItem);
      const fileItem = items.find((item) => 
        item.props('file').path === '/workspace/readme.card'
      );

      const ctrlClickEvent = new MouseEvent('click', { ctrlKey: true });
      await fileItem?.vm.$emit('click', fileItem.props('file'), ctrlClickEvent);

      // Should emit select with multiple paths
      const selectEmits = wrapper.emitted('select');
      expect(selectEmits).toBeTruthy();
    });
  });
});
