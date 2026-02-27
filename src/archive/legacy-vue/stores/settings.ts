/**
 * 编辑引擎设置 Store
 * @module core/state/stores/settings
 *
 * 通用的设置数据容器，基于「注册中心」架构。
 * Store 本身不知道具体有哪些设置分类，
 * 所有分类信息通过 SettingsPanelDefinition 注册。
 *
 * 职责：
 * - 管理面板注册表（panelRegistry）
 * - 管理设置数据（settingsData Map）
 * - 提供通用的 get/set/reset/export/import 操作
 * - 在数据更新时自动触发对应面板定义的 onChange 处理器
 *
 * 不包含任何具体分类的业务逻辑。
 */

import { defineStore } from 'pinia';
import { markRaw, type Component } from 'vue';
import type {
  SettingsCategory,
  SettingsCategoryId,
  SettingsPanelDefinition,
} from '@/types';

/**
 * 深拷贝辅助函数
 *
 * 使用 JSON 序列化实现深拷贝，兼容 Pinia 响应式代理对象。
 * deepClone 无法克隆 Vue 响应式 Proxy 对象，因此使用此方式。
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// Store 状态类型
// ============================================================

/**
 * Settings Store 内部状态
 *
 * 注意：panelRegistry 和 settingsData 使用 Record 而非 Map，
 * 因为 Pinia 的响应式系统对 Record 的支持更好。
 */
export interface SettingsStoreState {
  /** 面板定义注册表：categoryId -> SettingsPanelDefinition */
  panelRegistry: Record<string, SettingsPanelDefinition>;
  /** 设置数据存储：categoryId -> 该分类的数据（深拷贝） */
  settingsData: Record<string, unknown>;
  /** 是否已完成初始化（包括面板注册和持久化数据恢复） */
  initialized: boolean;
}

// ============================================================
// Store 定义
// ============================================================

/**
 * 编辑引擎设置 Store
 *
 * @example
 * ```typescript
 * const settingsStore = useSettingsStore();
 *
 * // 注册面板（通常在 App 初始化时批量注册）
 * settingsStore.registerPanels(builtinPanelDefinitions);
 *
 * // 获取某个分类的数据
 * const themeData = settingsStore.getData<ThemeSettingsData>('theme');
 *
 * // 更新某个分类的数据
 * settingsStore.updateData('theme', { currentThemeId: 'dark-blue' });
 *
 * // 获取面板组件用于动态渲染
 * const panel = settingsStore.getPanelComponent('theme');
 * // <component :is="panel" />
 * ```
 */
export const useSettingsStore = defineStore('settings', {
  state: (): SettingsStoreState => ({
    panelRegistry: {},
    settingsData: {},
    initialized: false,
  }),

  getters: {
    /**
     * 获取按 order 排序的分类列表
     *
     * 从面板注册表中提取所有分类元数据并排序。
     */
    sortedCategories(): SettingsCategory[] {
      return Object.values(this.panelRegistry)
        .map((def) => def.category)
        .sort((a, b) => a.order - b.order);
    },

    /**
     * 获取按 group 分组后的排序分类列表
     *
     * 返回二维数组，每个子数组是一个分组，
     * 分组内按 order 排序，分组间按首个元素的 order 排序。
     */
    groupedCategories(): SettingsCategory[][] {
      const sorted = this.sortedCategories;
      const groups = new Map<string, SettingsCategory[]>();

      for (const category of sorted) {
        const groupKey = category.group ?? '__default__';
        const currentGroup = groups.get(groupKey);
        if (currentGroup) {
          currentGroup.push(category);
        } else {
          groups.set(groupKey, [category]);
        }
      }

      return Array.from(groups.values());
    },

    /**
     * 获取已注册的分类数量
     */
    categoryCount(): number {
      return Object.keys(this.panelRegistry).length;
    },
  },

  actions: {
    // ==================== 面板注册 ====================

    /**
     * 注册单个面板定义
     *
     * 注册时会用 defaultData 初始化该分类的数据（如果尚未存在）。
     * 组件使用 markRaw 标记以避免响应式代理。
     *
     * @param definition - 面板定义
     */
    registerPanel(definition: SettingsPanelDefinition): void {
      // markRaw 防止 Vue 对组件对象进行响应式代理
      const rawDef: SettingsPanelDefinition = {
        ...definition,
        component: markRaw(definition.component),
      };

      this.panelRegistry[definition.category.id] = rawDef;

      // 如果该分类尚无数据，使用默认值初始化
      if (!(definition.category.id in this.settingsData)) {
        this.settingsData[definition.category.id] = deepClone(
          definition.defaultData,
        );
      }
    },

    /**
     * 批量注册面板定义
     *
     * @param definitions - 面板定义数组
     */
    registerPanels(definitions: SettingsPanelDefinition[]): void {
      for (const def of definitions) {
        this.registerPanel(def);
      }
    },

    /**
     * 注销面板定义
     *
     * 同时清除该分类的数据。
     *
     * @param categoryId - 分类 ID
     */
    unregisterPanel(categoryId: SettingsCategoryId): void {
      delete this.panelRegistry[categoryId];
      delete this.settingsData[categoryId];
    },

    /**
     * 检查分类是否已注册
     *
     * @param categoryId - 分类 ID
     */
    hasPanel(categoryId: SettingsCategoryId): boolean {
      return categoryId in this.panelRegistry;
    },

    /**
     * 获取面板 Vue 组件
     *
     * @param categoryId - 分类 ID
     * @returns Vue 组件，如果分类未注册则返回 undefined
     */
    getPanelComponent(categoryId: SettingsCategoryId): Component | undefined {
      return this.panelRegistry[categoryId]?.component;
    },

    // ==================== 数据操作 ====================

    /**
     * 获取分类数据
     *
     * @template T - 数据类型
     * @param categoryId - 分类 ID
     * @returns 数据副本，如果分类不存在则返回 undefined
     */
    getData<T = unknown>(categoryId: SettingsCategoryId): T | undefined {
      const data = this.settingsData[categoryId];
      if (data === undefined) return undefined;
      return data as T;
    },

    /**
     * 更新分类数据（部分更新）
     *
     * 合并更新数据，并自动触发面板定义的 onChange 处理器。
     *
     * @template T - 数据类型
     * @param categoryId - 分类 ID
     * @param updates - 要合并的部分数据
     */
    updateData<T = unknown>(
      categoryId: SettingsCategoryId,
      updates: Partial<T>,
    ): void {
      const definition = this.panelRegistry[categoryId];
      if (!definition) {
        console.warn(
          `[SettingsStore] Cannot update unregistered category: ${categoryId}`,
        );
        return;
      }

      const oldData = deepClone(this.settingsData[categoryId]);
      const currentData = this.settingsData[categoryId];

      if (
        currentData !== null &&
        currentData !== undefined &&
        typeof currentData === 'object'
      ) {
        // 对象类型：合并更新
        this.settingsData[categoryId] = { ...currentData, ...updates };
      } else {
        // 原始类型：直接替换
        this.settingsData[categoryId] = updates;
      }

      // 触发 onChange 处理器
      if (definition.onChange) {
        const newData = this.settingsData[categoryId];
        try {
          definition.onChange(newData as T, oldData as T);
        } catch (error) {
          console.error(
            `[SettingsStore] onChange error for category "${categoryId}":`,
            error,
          );
        }
      }
    },

    /**
     * 替换分类数据（完整替换）
     *
     * 与 updateData 不同，此方法完全替换数据而非合并。
     *
     * @template T - 数据类型
     * @param categoryId - 分类 ID
     * @param data - 完整数据
     */
    setData<T = unknown>(categoryId: SettingsCategoryId, data: T): void {
      const definition = this.panelRegistry[categoryId];
      if (!definition) {
        console.warn(
          `[SettingsStore] Cannot set data for unregistered category: ${categoryId}`,
        );
        return;
      }

      const oldData = deepClone(this.settingsData[categoryId]);
      this.settingsData[categoryId] = deepClone(data);

      // 触发 onChange 处理器
      if (definition.onChange) {
        try {
          definition.onChange(data, oldData as T);
        } catch (error) {
          console.error(
            `[SettingsStore] onChange error for category "${categoryId}":`,
            error,
          );
        }
      }
    },

    // ==================== 重置 ====================

    /**
     * 重置指定分类到默认值
     *
     * @param categoryId - 分类 ID
     */
    resetCategory(categoryId: SettingsCategoryId): void {
      const definition = this.panelRegistry[categoryId];
      if (!definition) return;

      const oldData = deepClone(this.settingsData[categoryId]);
      this.settingsData[categoryId] = deepClone(definition.defaultData);

      // 触发 onChange
      if (definition.onChange) {
        try {
          definition.onChange(definition.defaultData, oldData);
        } catch (error) {
          console.error(
            `[SettingsStore] onChange error during reset for "${categoryId}":`,
            error,
          );
        }
      }
    },

    /**
     * 重置所有分类到默认值
     */
    resetAll(): void {
      for (const categoryId of Object.keys(this.panelRegistry)) {
        this.resetCategory(categoryId);
      }
    },

    // ==================== 持久化 ====================

    /**
     * 导出所有设置数据（用于持久化保存）
     *
     * @returns 深拷贝的设置数据对象
     */
    exportAll(): Record<string, unknown> {
      return deepClone(this.settingsData);
    },

    /**
     * 导入设置数据（从持久化恢复）
     *
     * 只恢复已注册分类的数据，忽略未注册的分类。
     * 恢复时不触发 onChange（因为是初始化阶段）。
     *
     * @param data - 之前导出的设置数据
     */
    importAll(data: Record<string, unknown>): void {
      for (const [categoryId, categoryData] of Object.entries(data)) {
        if (categoryId in this.panelRegistry) {
          this.settingsData[categoryId] = deepClone(categoryData);
        }
      }
    },

    /**
     * 标记初始化完成
     */
    markInitialized(): void {
      this.initialized = true;
    },
  },
});

/** 导出 Store 类型 */
export type SettingsStore = ReturnType<typeof useSettingsStore>;
