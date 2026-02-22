/**
 * 类型定义导出
 * @module types
 */

// 编辑器类型
export type {
  ChipsSDK,
  EditorConfig,
  EditorState,
  EditorEvents,
  EditorEventCallback,
  EditorPlugin,
  EditorInstance,
} from './editor';

// 窗口类型
export type {
  WindowType,
  WindowState,
  WindowPosition,
  WindowSize,
  WindowConfig,
  CardWindowConfig,
  ToolWindowConfig,
  ModalWindowConfig,
  WindowManagerEvents,
  WindowInstance,
} from './window';

// 布局类型
export type {
  LayoutType,
  LayoutConfig,
  InfiniteCanvasConfig,
  WorkbenchConfig,
  CanvasState,
  CanvasViewport,
  LayoutManager,
  CanvasManager,
} from './layout';

// 设置类型
export type {
  SettingsCategoryId,
  SettingsCategoryGroup,
  SettingsCategory,
  SettingsPanelDefinition,
  LanguageSettingsData,
  ThemeSettingsData,
  LayoutSettingsData,
  ToolsSettingsData,
  FileModeSettingsData,
  AboutSettingsData,
  ThemeOption,
  SettingsChangeEvent,
} from './settings';
