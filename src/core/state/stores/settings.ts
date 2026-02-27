/**
 * 编辑引擎设置 Store
 * @module core/state/stores/settings
 * @description 通用的设置数据容器，基于「注册中心」架构（框架无关实现）
 *
 * Store 本身不知道具体有哪些设置分类，
 * 所有分类信息通过 SettingsPanelDefinition 注册。
 *
 * 职责：
 * - 管理面板注册表（panelRegistry）
 * - 管理设置数据（settingsData Record）
 * - 提供通用的 get/set/reset/export/import 操作
 * - 在数据更新时自动触发对应面板定义的 onChange 处理器
 */

import { createStore } from '../store-core';
import { useStore } from '../use-store';
import type {
  SettingsCategory,
  SettingsCategoryId,
  SettingsPanelDefinition,
} from '@/types';

/**
 * 深拷贝辅助函数
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// Store 状态类型
// ============================================================

/**
 * Settings Store 内部状态
 */
export interface SettingsStoreState {
  /** 面板定义注册表：categoryId -> SettingsPanelDefinition */
  panelRegistry: Record<string, SettingsPanelDefinition>;
  /** 设置数据存储：categoryId -> 该分类的数据（深拷贝） */
  settingsData: Record<string, unknown>;
  /** 是否已完成初始化 */
  initialized: boolean;
}

// ─── Store 实例 ───────────────────────────────────────────

const settingsStore = createStore<SettingsStoreState>({
  panelRegistry: {},
  settingsData: {},
  initialized: false,
});

// ─── Getters ──────────────────────────────────────────────

function _sortedCategories(s: SettingsStoreState): SettingsCategory[] {
  return Object.values(s.panelRegistry)
    .map((def) => def.category)
    .sort((a, b) => a.order - b.order);
}

function _groupedCategories(s: SettingsStoreState): SettingsCategory[][] {
  const sorted = _sortedCategories(s);
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
}

function _categoryCount(s: SettingsStoreState): number {
  return Object.keys(s.panelRegistry).length;
}

// ─── Actions ──────────────────────────────────────────────

function registerPanel(definition: SettingsPanelDefinition): void {
  const s = settingsStore.getState();
  const newPanelRegistry = { ...s.panelRegistry, [definition.category.id]: definition };
  const newSettingsData = { ...s.settingsData };

  // 如果该分类尚无数据，使用默认值初始化
  if (!(definition.category.id in newSettingsData)) {
    newSettingsData[definition.category.id] = deepClone(definition.defaultData);
  }

  settingsStore.setState({ panelRegistry: newPanelRegistry, settingsData: newSettingsData });
}

function registerPanels(definitions: SettingsPanelDefinition[]): void {
  for (const def of definitions) {
    registerPanel(def);
  }
}

function unregisterPanel(categoryId: SettingsCategoryId): void {
  const s = settingsStore.getState();
  const newPanelRegistry = { ...s.panelRegistry };
  delete newPanelRegistry[categoryId];
  const newSettingsData = { ...s.settingsData };
  delete newSettingsData[categoryId];
  settingsStore.setState({ panelRegistry: newPanelRegistry, settingsData: newSettingsData });
}

function hasPanel(categoryId: SettingsCategoryId): boolean {
  return categoryId in settingsStore.getState().panelRegistry;
}

function getPanelComponent(categoryId: SettingsCategoryId): unknown | undefined {
  return settingsStore.getState().panelRegistry[categoryId]?.component;
}

function getData<T = unknown>(categoryId: SettingsCategoryId): T | undefined {
  const data = settingsStore.getState().settingsData[categoryId];
  if (data === undefined) return undefined;
  return data as T;
}

function updateData<T = unknown>(
  categoryId: SettingsCategoryId,
  updates: Partial<T>,
): void {
  const s = settingsStore.getState();
  const definition = s.panelRegistry[categoryId];
  if (!definition) {
    console.warn(`[SettingsStore] Cannot update unregistered category: ${categoryId}`);
    return;
  }

  const oldData = deepClone(s.settingsData[categoryId]);
  const currentData = s.settingsData[categoryId];
  const newSettingsData = { ...s.settingsData };

  if (currentData !== null && currentData !== undefined && typeof currentData === 'object') {
    newSettingsData[categoryId] = { ...(currentData as Record<string, unknown>), ...updates };
  } else {
    newSettingsData[categoryId] = updates;
  }

  settingsStore.setState({ settingsData: newSettingsData });

  // 触发 onChange 处理器
  if (definition.onChange) {
    const newData = newSettingsData[categoryId];
    try {
      definition.onChange(newData as T, oldData as T);
    } catch (error) {
      console.error(`[SettingsStore] onChange error for category "${categoryId}":`, error);
    }
  }
}

function setData<T = unknown>(categoryId: SettingsCategoryId, data: T): void {
  const s = settingsStore.getState();
  const definition = s.panelRegistry[categoryId];
  if (!definition) {
    console.warn(`[SettingsStore] Cannot set data for unregistered category: ${categoryId}`);
    return;
  }

  const oldData = deepClone(s.settingsData[categoryId]);
  const newSettingsData = { ...s.settingsData, [categoryId]: deepClone(data) };
  settingsStore.setState({ settingsData: newSettingsData });

  if (definition.onChange) {
    try {
      definition.onChange(data, oldData as T);
    } catch (error) {
      console.error(`[SettingsStore] onChange error for category "${categoryId}":`, error);
    }
  }
}

function resetCategory(categoryId: SettingsCategoryId): void {
  const s = settingsStore.getState();
  const definition = s.panelRegistry[categoryId];
  if (!definition) return;

  const oldData = deepClone(s.settingsData[categoryId]);
  const newSettingsData = {
    ...s.settingsData,
    [categoryId]: deepClone(definition.defaultData),
  };
  settingsStore.setState({ settingsData: newSettingsData });

  if (definition.onChange) {
    try {
      definition.onChange(definition.defaultData, oldData);
    } catch (error) {
      console.error(`[SettingsStore] onChange error during reset for "${categoryId}":`, error);
    }
  }
}

function resetAll(): void {
  const s = settingsStore.getState();
  for (const categoryId of Object.keys(s.panelRegistry)) {
    resetCategory(categoryId);
  }
}

function exportAll(): Record<string, unknown> {
  return deepClone(settingsStore.getState().settingsData);
}

function importAll(data: Record<string, unknown>): void {
  const s = settingsStore.getState();
  const newSettingsData = { ...s.settingsData };
  for (const [categoryId, categoryData] of Object.entries(data)) {
    if (categoryId in s.panelRegistry) {
      newSettingsData[categoryId] = deepClone(categoryData);
    }
  }
  settingsStore.setState({ settingsData: newSettingsData });
}

function markInitialized(): void {
  settingsStore.setState({ initialized: true });
}

// ─── 导出 ─────────────────────────────────────────────────

/**
 * 获取 Settings Store 实例（非组件调用）
 */
export function getSettingsStore() {
  return {
    getState: settingsStore.getState,
    registerPanel,
    registerPanels,
    unregisterPanel,
    hasPanel,
    getPanelComponent,
    getData,
    updateData,
    setData,
    resetCategory,
    resetAll,
    exportAll,
    importAll,
    markInitialized,
    // Getters
    sortedCategories: _sortedCategories,
    groupedCategories: _groupedCategories,
    categoryCount: _categoryCount,
  };
}

/**
 * React Hook：使用 Settings Store（组件调用）
 * 
 * 支持两种调用方式：
 * - useSettingsStore() - 返回整个 state
 * - useSettingsStore(selector) - 返回选择器选中的状态片段
 */
export function useSettingsStore(): Readonly<SettingsStoreState>;
export function useSettingsStore<U>(selector: (state: Readonly<SettingsStoreState>) => U): U;
export function useSettingsStore<U>(selector?: (state: Readonly<SettingsStoreState>) => U): U | Readonly<SettingsStoreState> {
  if (!selector) {
    return useStore(settingsStore, (state) => state);
  }
  return useStore(settingsStore, selector);
}

export type SettingsStore = ReturnType<typeof getSettingsStore>;

/** 暴露内部 store 用于测试 */
export const __settingsStoreInternal = settingsStore;
