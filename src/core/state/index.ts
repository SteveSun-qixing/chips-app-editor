/**
 * 状态管理模块导出
 * @module core/state
 */

// Store 导出
export {
  useEditorStore,
  useCardStore,
  useUIStore,
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
