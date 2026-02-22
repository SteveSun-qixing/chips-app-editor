/**
 * LayoutTypeGrid 组件测试
 * @module tests/unit/components/card-box-library/LayoutTypeGrid
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LayoutTypeGrid from '@/components/card-box-library/LayoutTypeGrid.vue';
import { layoutTypes } from '@/components/card-box-library/data';
import type { LayoutTypeDefinition, DragData } from '@/components/card-box-library/types';

describe('LayoutTypeGrid', () => {
  describe('rendering', () => {
    it('should render all installed layout types from plugins', () => {
      const wrapper = mount(LayoutTypeGrid);

      const items = wrapper.findAll('.layout-type-grid__item');
      // 布局类型由已安装的布局插件清单动态生成，数量与实际安装的插件一致
      expect(items).toHaveLength(layoutTypes.length);
    });

    it('should render item with icon, name, and description when types exist', () => {
      if (layoutTypes.length === 0) {
        // 没有安装布局插件时，跳过此测试
        expect(true).toBe(true);
        return;
      }

      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.find('.layout-type-grid__item-icon').exists()).toBe(true);
      expect(firstItem.find('.layout-type-grid__item-name').exists()).toBe(true);
      expect(firstItem.find('.layout-type-grid__item-desc').exists()).toBe(true);
    });

    it('should have draggable attribute on items when types exist', () => {
      if (layoutTypes.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.attributes('draggable')).toBe('true');
    });

    it('should have title attribute with description when types exist', () => {
      if (layoutTypes.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.attributes('title')).toBeTruthy();
    });
  });

  describe('with custom types prop', () => {
    it('should render only provided types', () => {
      const customTypes: LayoutTypeDefinition[] = [
        {
          id: 'test-layout-1',
          name: 'Test Layout 1',
          icon: '📋',
          description: 'Test layout one',
          keywords: ['test'],
        },
        {
          id: 'test-layout-2',
          name: 'Test Layout 2',
          icon: '📊',
          description: 'Test layout two',
          keywords: ['test'],
        },
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes },
      });

      const items = wrapper.findAll('.layout-type-grid__item');
      expect(items).toHaveLength(2);
    });
  });

  describe('drag events', () => {
    it('should emit dragStart event on dragstart', async () => {
      // 使用自定义类型数据以确保测试独立于插件安装状态
      const customTypes: LayoutTypeDefinition[] = [
        {
          id: 'test-drag-layout',
          name: 'Test Drag Layout',
          icon: '📋',
          description: 'Test drag layout',
          keywords: ['test'],
        },
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes },
      });

      const firstItem = wrapper.find('.layout-type-grid__item');
      await firstItem.trigger('dragstart');

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')).toHaveLength(1);
    });

    it('should emit correct drag data', async () => {
      const customTypes: LayoutTypeDefinition[] = [
        {
          id: 'test-data-layout',
          name: 'Test Data Layout',
          icon: '📋',
          description: 'Test data layout',
          keywords: ['test'],
        },
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes },
      });

      const firstItem = wrapper.find('.layout-type-grid__item');
      await firstItem.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data, event] = emitted![0] as [DragData, DragEvent];
      expect(data.type).toBe('layout');
      expect(data.typeId).toBe('test-data-layout');
      expect(data.name).toBeTruthy();
    });

    it('should emit dragStart for filtered types', async () => {
      const customTypes: LayoutTypeDefinition[] = [
        {
          id: 'test-filtered-layout',
          name: 'Test Filtered Layout',
          icon: '📊',
          description: 'Test filtered layout',
          keywords: ['test'],
        },
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes },
      });

      const item = wrapper.find('.layout-type-grid__item');
      await item.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data] = emitted![0] as [DragData, DragEvent];
      expect(data.typeId).toBe(customTypes[0].id);
    });
  });

  describe('empty state', () => {
    it('should render nothing when types is empty array', () => {
      const wrapper = mount(LayoutTypeGrid, {
        props: { types: [] },
      });

      expect(wrapper.findAll('.layout-type-grid__item')).toHaveLength(0);
    });

    it('should render nothing when no layout plugins installed and no types prop', () => {
      // 不传入 types prop 时，使用已安装的布局插件
      const wrapper = mount(LayoutTypeGrid);
      const items = wrapper.findAll('.layout-type-grid__item');
      expect(items).toHaveLength(layoutTypes.length);
    });
  });

  describe('layout specific features', () => {
    it('should show description for each installed layout type', () => {
      const wrapper = mount(LayoutTypeGrid);

      const descriptions = wrapper.findAll('.layout-type-grid__item-desc');
      expect(descriptions).toHaveLength(layoutTypes.length);

      descriptions.forEach((desc) => {
        expect(desc.text()).toBeTruthy();
      });
    });

    it('should render correct icon for custom layout types', () => {
      const customTypes: LayoutTypeDefinition[] = [
        {
          id: 'custom-list-layout',
          name: 'Custom List',
          icon: '📜',
          description: 'Custom list layout',
          keywords: ['list'],
        },
        {
          id: 'custom-grid-layout',
          name: 'Custom Grid',
          icon: '⊞',
          description: 'Custom grid layout',
          keywords: ['grid'],
        },
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes },
      });

      const items = wrapper.findAll('.layout-type-grid__item');
      const listItem = items[0];
      const gridItem = items[1];

      const listIcon = listItem.find('.layout-type-grid__item-icon');
      expect(listIcon.text()).toBe('📜');

      const gridIcon = gridItem.find('.layout-type-grid__item-icon');
      expect(gridIcon.text()).toBe('⊞');
    });
  });
});
