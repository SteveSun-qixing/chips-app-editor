/**
 * 状态管理模块导出
 * @module core/state
 *
 * 对外暴露统一的 Store 接口。
 * 非组件调用使用 get*Store()，React 组件调用使用 use*Store(selector)。
 */

// Store Core
export { createStore } from './store-core';
export type { Store, StoreListener } from './store-core';

// React Hook
export { useStore } from './use-store';

// Store 导出
export {
  getEditorStore,
  useEditorStore,
  getCardStore,
  useCardStore,
  getUIStore,
  useUIStore,
  getSettingsStore,
  useSettingsStore,
} from './stores';

// 类型导出
export type {
  EditorStoreState,
  EditorStore,
  CardStoreState,
  CardStore,
  CardInfo,
  CardMetadata,
  BaseCardInfo,
  Card,
  UIStoreState,
  UIStore,
  DockPosition,
  SettingsStoreState,
  SettingsStore,
} from './stores';
