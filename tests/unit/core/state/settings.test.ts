/**
 * Settings Store 测试
 * @module tests/unit/core/state/settings
 *
 * 测试重构后的「注册中心」架构 Settings Store：
 * - 面板注册与注销
 * - 通用数据操作（getData / updateData / setData）
 * - onChange 处理器自动触发
 * - 分类排序和分组
 * - 重置和持久化（export/import）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { useSettingsStore } from '@/core/state/stores/settings';
import type { SettingsPanelDefinition } from '@/types';

/** 创建一个空的 stub 组件 */
const StubComponent = defineComponent({
  name: 'StubPanel',
  setup() {
    return () => h('div', 'stub');
  },
});

/** 创建测试用的面板定义 */
function createTestPanel<T>(
  id: string,
  defaultData: T,
  options?: {
    order?: number;
    group?: string;
    onChange?: (newData: T, oldData: T) => void;
  },
): SettingsPanelDefinition<T> {
  return {
    category: {
      id,
      labelKey: `test.${id}`,
      icon: '🔧',
      order: options?.order ?? 100,
      group: options?.group,
    },
    component: StubComponent,
    defaultData,
    onChange: options?.onChange,
  };
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty registries', () => {
      const store = useSettingsStore();
      expect(Object.keys(store.panelRegistry)).toHaveLength(0);
      expect(Object.keys(store.settingsData)).toHaveLength(0);
      expect(store.initialized).toBe(false);
    });

    it('should have zero category count', () => {
      const store = useSettingsStore();
      expect(store.categoryCount).toBe(0);
    });
  });

  describe('panel registration', () => {
    it('should register a single panel', () => {
      const store = useSettingsStore();
      const panel = createTestPanel('theme', { color: 'blue' });

      store.registerPanel(panel);

      expect(store.hasPanel('theme')).toBe(true);
      expect(store.categoryCount).toBe(1);
    });

    it('should initialize data with defaultData on registration', () => {
      const store = useSettingsStore();
      const panel = createTestPanel('theme', { color: 'blue', size: 14 });

      store.registerPanel(panel);

      const data = store.getData<{ color: string; size: number }>('theme');
      expect(data).toEqual({ color: 'blue', size: 14 });
    });

    it('should not overwrite existing data on re-registration', () => {
      const store = useSettingsStore();
      const panel = createTestPanel('theme', { color: 'blue' });

      store.registerPanel(panel);
      store.updateData('theme', { color: 'red' });

      // Re-register with same ID
      store.registerPanel(panel);

      // Data should still be 'red', not reset to 'blue'
      const data = store.getData<{ color: string }>('theme');
      expect(data?.color).toBe('red');
    });

    it('should register multiple panels', () => {
      const store = useSettingsStore();
      const panels = [
        createTestPanel('a', {}, { order: 100 }),
        createTestPanel('b', {}, { order: 200 }),
        createTestPanel('c', {}, { order: 300 }),
      ];

      store.registerPanels(panels);

      expect(store.categoryCount).toBe(3);
      expect(store.hasPanel('a')).toBe(true);
      expect(store.hasPanel('b')).toBe(true);
      expect(store.hasPanel('c')).toBe(true);
    });

    it('should unregister panel and clear data', () => {
      const store = useSettingsStore();
      store.registerPanel(createTestPanel('theme', { color: 'blue' }));

      store.unregisterPanel('theme');

      expect(store.hasPanel('theme')).toBe(false);
      expect(store.getData('theme')).toBeUndefined();
      expect(store.categoryCount).toBe(0);
    });

    it('should return panel component', () => {
      const store = useSettingsStore();
      store.registerPanel(createTestPanel('theme', {}));

      const component = store.getPanelComponent('theme');
      expect(component).toBeDefined();
    });

    it('should return undefined for unregistered panel component', () => {
      const store = useSettingsStore();
      expect(store.getPanelComponent('nonexistent')).toBeUndefined();
    });
  });

  describe('data operations', () => {
    it('updateData should merge partial updates', () => {
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue', size: 14 }),
      );

      store.updateData('theme', { color: 'red' });

      const data = store.getData<{ color: string; size: number }>('theme');
      expect(data?.color).toBe('red');
      expect(data?.size).toBe(14);
    });

    it('updateData should trigger onChange', () => {
      const onChange = vi.fn();
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue' }, { onChange }),
      );

      store.updateData('theme', { color: 'red' });

      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith(
        { color: 'red' },
        { color: 'blue' },
      );
    });

    it('setData should replace entire data', () => {
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue', size: 14 }),
      );

      store.setData('theme', { color: 'green', size: 20 });

      const data = store.getData<{ color: string; size: number }>('theme');
      expect(data).toEqual({ color: 'green', size: 20 });
    });

    it('setData should trigger onChange', () => {
      const onChange = vi.fn();
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue' }, { onChange }),
      );

      store.setData('theme', { color: 'green' });

      expect(onChange).toHaveBeenCalledOnce();
    });

    it('should warn when updating unregistered category', () => {
      const store = useSettingsStore();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      store.updateData('nonexistent', { foo: 'bar' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('getData should return undefined for unregistered category', () => {
      const store = useSettingsStore();
      expect(store.getData('nonexistent')).toBeUndefined();
    });
  });

  describe('sorting and grouping', () => {
    it('sortedCategories should return categories sorted by order', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('c', {}, { order: 300 }),
        createTestPanel('a', {}, { order: 100 }),
        createTestPanel('b', {}, { order: 200 }),
      ]);

      const sorted = store.sortedCategories;
      expect(sorted.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });

    it('groupedCategories should group by group field', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('a', {}, { order: 100, group: 'g1' }),
        createTestPanel('b', {}, { order: 200, group: 'g1' }),
        createTestPanel('c', {}, { order: 300, group: 'g2' }),
        createTestPanel('d', {}, { order: 400, group: 'g2' }),
      ]);

      const groups = store.groupedCategories;
      expect(groups).toHaveLength(2);
      expect(groups[0]?.map((c) => c.id)).toEqual(['a', 'b']);
      expect(groups[1]?.map((c) => c.id)).toEqual(['c', 'd']);
    });

    it('groupedCategories should handle categories without group', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('a', {}, { order: 100, group: 'g1' }),
        createTestPanel('b', {}, { order: 200 }), // no group
        createTestPanel('c', {}, { order: 300, group: 'g1' }),
      ]);

      const groups = store.groupedCategories;
      expect(groups.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reset', () => {
    it('resetCategory should restore to defaultData', () => {
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue' }),
      );

      store.updateData('theme', { color: 'red' });
      store.resetCategory('theme');

      const data = store.getData<{ color: string }>('theme');
      expect(data?.color).toBe('blue');
    });

    it('resetCategory should trigger onChange', () => {
      const onChange = vi.fn();
      const store = useSettingsStore();
      store.registerPanel(
        createTestPanel('theme', { color: 'blue' }, { onChange }),
      );

      store.updateData('theme', { color: 'red' });
      onChange.mockClear();

      store.resetCategory('theme');

      expect(onChange).toHaveBeenCalledOnce();
    });

    it('resetAll should reset all categories', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('a', { val: 1 }),
        createTestPanel('b', { val: 2 }),
      ]);

      store.updateData('a', { val: 99 });
      store.updateData('b', { val: 99 });

      store.resetAll();

      expect(store.getData<{ val: number }>('a')?.val).toBe(1);
      expect(store.getData<{ val: number }>('b')?.val).toBe(2);
    });

    it('resetCategory should handle non-existent category gracefully', () => {
      const store = useSettingsStore();
      // Should not throw
      store.resetCategory('nonexistent');
    });
  });

  describe('persistence (export/import)', () => {
    it('exportAll should return deep copy of all data', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('a', { val: 1 }),
        createTestPanel('b', { val: 2 }),
      ]);

      const exported = store.exportAll();
      expect(exported['a']).toEqual({ val: 1 });
      expect(exported['b']).toEqual({ val: 2 });

      // Verify deep copy
      (exported['a'] as any).val = 999;
      expect(store.getData<{ val: number }>('a')?.val).toBe(1);
    });

    it('importAll should restore registered category data', () => {
      const store = useSettingsStore();
      store.registerPanels([
        createTestPanel('a', { val: 0 }),
        createTestPanel('b', { val: 0 }),
      ]);

      store.importAll({
        a: { val: 42 },
        b: { val: 99 },
      });

      expect(store.getData<{ val: number }>('a')?.val).toBe(42);
      expect(store.getData<{ val: number }>('b')?.val).toBe(99);
    });

    it('importAll should ignore unregistered categories', () => {
      const store = useSettingsStore();
      store.registerPanel(createTestPanel('a', { val: 0 }));

      store.importAll({
        a: { val: 42 },
        unknown: { val: 99 },
      });

      expect(store.getData('a')).toEqual({ val: 42 });
      expect(store.getData('unknown')).toBeUndefined();
    });

    it('markInitialized should set initialized flag', () => {
      const store = useSettingsStore();
      expect(store.initialized).toBe(false);

      store.markInitialized();

      expect(store.initialized).toBe(true);
    });
  });

  describe('onChange error handling', () => {
    it('should catch and log onChange errors without crashing', () => {
      const store = useSettingsStore();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      store.registerPanel(
        createTestPanel('broken', { val: 1 }, {
          onChange: () => {
            throw new Error('handler crashed');
          },
        }),
      );

      // Should not throw
      store.updateData('broken', { val: 2 });

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
