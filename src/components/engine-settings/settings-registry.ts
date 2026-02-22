/**
 * 设置注册中心
 * @module components/engine-settings/settings-registry
 *
 * 集中声明所有内置设置面板定义。
 * 每个面板定义包含分类元数据、Vue 组件、默认数据和变更处理器。
 *
 * 新增设置分类的步骤：
 * 1. 创建面板组件 XxxPanel.vue
 * 2. 在本文件中声明 SettingsPanelDefinition
 * 3. 将其添加到 builtinPanelDefinitions 数组
 * 4. 完成。菜单自动出现，数据自动管理。
 */

import type {
  SettingsPanelDefinition,
  LanguageSettingsData,
  ThemeSettingsData,
  LayoutSettingsData,
  ToolsSettingsData,
  FileModeSettingsData,
  AboutSettingsData,
} from '@/types';

import {
  handleLanguageChange,
  handleThemeChange,
  handleLayoutChange,
  handleFileModeChange,
} from '@/services/settings-service';

import {
  LanguageSettingsPanel,
  ThemeSettingsPanel,
  LayoutSettingsPanel,
  ToolsSettingsPanel,
  FileModeSettingsPanel,
  AboutPanel,
} from './panels';

// ============================================================
// 菜单分组常量
// ============================================================

/** 外观与交互 */
const GROUP_APPEARANCE = 'appearance';
/** 引擎核心 */
const GROUP_ENGINE = 'engine';
/** 系统 */
const GROUP_SYSTEM = 'system';

// ============================================================
// 面板定义
// ============================================================

/**
 * 语言与文字设置
 */
const languagePanel: SettingsPanelDefinition<LanguageSettingsData> = {
  category: {
    id: 'language',
    labelKey: 'engine_settings.category_language',
    icon: '🌐',
    order: 100,
    group: GROUP_APPEARANCE,
  },
  component: LanguageSettingsPanel,
  defaultData: {
    locale: 'zh-CN',
    fontSize: 14,
    contentScale: 1.0,
  },
  onChange: handleLanguageChange,
};

/**
 * 主题设置
 */
const themePanel: SettingsPanelDefinition<ThemeSettingsData> = {
  category: {
    id: 'theme',
    labelKey: 'engine_settings.category_theme',
    icon: '🎨',
    order: 200,
    group: GROUP_APPEARANCE,
  },
  component: ThemeSettingsPanel,
  defaultData: {
    currentThemeId: 'default-light',
    followSystem: false,
    installedThemeIds: [],
  },
  onChange: handleThemeChange,
};

/**
 * 引擎模式（布局）设置
 */
const layoutPanel: SettingsPanelDefinition<LayoutSettingsData> = {
  category: {
    id: 'layout',
    labelKey: 'engine_settings.category_layout',
    icon: '📐',
    order: 300,
    group: GROUP_ENGINE,
  },
  component: LayoutSettingsPanel,
  defaultData: {
    currentLayout: 'infinite-canvas',
  },
  onChange: handleLayoutChange,
};

/**
 * 工具管理设置
 */
const toolsPanel: SettingsPanelDefinition<ToolsSettingsData> = {
  category: {
    id: 'tools',
    labelKey: 'engine_settings.category_tools',
    icon: '🧩',
    order: 400,
    group: GROUP_ENGINE,
  },
  component: ToolsSettingsPanel,
  defaultData: {
    disabledToolIds: [],
  },
};

/**
 * 文件管理方式设置
 */
const fileModePanel: SettingsPanelDefinition<FileModeSettingsData> = {
  category: {
    id: 'fileMode',
    labelKey: 'engine_settings.category_file_mode',
    icon: '📁',
    order: 500,
    group: GROUP_ENGINE,
  },
  component: FileModeSettingsPanel,
  defaultData: {
    fileMode: 'link',
  },
  onChange: handleFileModeChange,
};

/**
 * 关于面板
 */
const aboutPanel: SettingsPanelDefinition<AboutSettingsData> = {
  category: {
    id: 'about',
    labelKey: 'engine_settings.category_about',
    icon: 'ℹ️',
    order: 900,
    group: GROUP_SYSTEM,
  },
  component: AboutPanel,
  defaultData: {},
};

// ============================================================
// 导出
// ============================================================

/**
 * 所有内置面板定义
 *
 * 按 order 排序。在 App 初始化时通过
 * `settingsStore.registerPanels(builtinPanelDefinitions)` 注册。
 */
export const builtinPanelDefinitions: SettingsPanelDefinition[] = [
  languagePanel,
  themePanel,
  layoutPanel,
  toolsPanel,
  fileModePanel,
  aboutPanel,
];
