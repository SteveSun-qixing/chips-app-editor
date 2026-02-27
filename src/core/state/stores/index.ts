/**
 * 状态管理 Store 统一导出
 * @module core/state/stores
 *
 * 每个域 Store 提供两种调用接口：
 * - `get*Store()` — 非组件调用（服务层、初始化逻辑）
 * - `use*Store(selector)` — React 组件调用（自动订阅 + 精细化重渲染）
 */

// Editor Store
export { getEditorStore, useEditorStore } from './editor';
export type { EditorStoreState, EditorStore } from './editor';

// Card Store
export { getCardStore, useCardStore } from './card';
export type {
  CardStoreState,
  CardStore,
  CardInfo,
  CardMetadata,
  BaseCardInfo,
  Card,
} from './card';

// UI Store
export { getUIStore, useUIStore } from './ui';
export type { UIStoreState, UIStore, DockPosition } from './ui';

// Settings Store
export { getSettingsStore, useSettingsStore } from './settings';
export type { SettingsStoreState, SettingsStore } from './settings';
