/**
 * Pinia Store 统一导出
 * @module core/state/stores
 */

export { useEditorStore } from './editor';
export type { EditorStoreState, EditorStore } from './editor';

export { useCardStore } from './card';
export type {
  CardStoreState,
  CardStore,
  CardInfo,
  CardMetadata,
  BaseCardInfo,
  Card,
} from './card';

export { useUIStore } from './ui';
export type { UIStoreState, UIStore, DockPosition } from './ui';

export { useSettingsStore } from './settings';
export type { SettingsStoreState, SettingsStore } from './settings';
