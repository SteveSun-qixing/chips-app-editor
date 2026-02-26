/**
 * 编辑引擎设置服务
 * @module services/settings-service
 *
 * 设置系统的协调层，负责：
 * - 初始化设置系统（注册面板、恢复持久化数据）
 * - 提供各分类的副作用处理器（onChange handlers）
 * - 协调 SDK/Foundation 层的交互
 *
 * 每个设置分类的 onChange 处理器定义在此模块中，
 * 通过 SettingsPanelDefinition.onChange 引用。
 */

import type { ThemeMetadata } from '@chips/sdk';
import { getEditorSdk } from './sdk-service';
import { invokeEditorRuntime } from './editor-runtime-gateway';
import { setLocale as setEditorLocale } from './i18n-service';
import { useSettingsStore } from '@/core/state';
import { useUIStore, useEditorStore } from '@/core/state';
import type {
  ThemeSettingsData,
  LanguageSettingsData,
  LayoutSettingsData,
  FileModeSettingsData,
  ThemeOption,
} from '@/types';

/** 系统主题变化监听器清理函数 */
let systemThemeCleanup: (() => void) | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const SETTINGS_CONFIG_KEY = 'engine.settings';

/** 服务是否已初始化 */
let initialized = false;

// ============================================================
// 初始化与销毁
// ============================================================

/**
 * 初始化设置服务
 *
 * 在编辑器启动、面板注册完成后调用。
 * 1. 从持久化存储恢复设置数据
 * 2. 应用当前设置到各个子系统
 * 3. 启动必要的监听器
 */
export async function initializeSettingsService(): Promise<void> {
  if (initialized) return;

  const settingsStore = useSettingsStore();

  await restorePersistedSettings(settingsStore);

  // 应用当前主题
  const themeData = settingsStore.getData<ThemeSettingsData>('theme');
  if (themeData) {
    await applyThemeToSDK(themeData.currentThemeId);

    // 启动系统主题监听（如果开启）
    if (themeData.followSystem) {
      startSystemThemeWatcher();
    }
  }

  // 应用当前语言设置
  const langData = settingsStore.getData<LanguageSettingsData>('language');
  if (langData) {
    applyLanguageToUI(langData);
  }

  settingsStore.markInitialized();
  initialized = true;
}

/**
 * 销毁设置服务
 *
 * 清理监听器等资源，在编辑器销毁时调用。
 */
export function destroySettingsService(): void {
  stopSystemThemeWatcher();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  initialized = false;
}

// ============================================================
// onChange 处理器 —— 供 settings-registry 引用
// ============================================================

/**
 * 语言设置变更处理器
 */
export function handleLanguageChange(
  newData: LanguageSettingsData,
  _oldData: LanguageSettingsData,
): void {
  applyLanguageToUI(newData);
  schedulePersistSettings();
}

/**
 * 主题设置变更处理器
 */
export async function handleThemeChange(
  newData: ThemeSettingsData,
  oldData: ThemeSettingsData,
): Promise<void> {
  // 处理跟随系统主题的切换
  if (newData.followSystem !== oldData.followSystem) {
    if (newData.followSystem) {
      startSystemThemeWatcher();
      await detectAndApplySystemTheme();
      schedulePersistSettings();
      return;
    } else {
      stopSystemThemeWatcher();
    }
  }

  // 处理主题切换
  if (newData.currentThemeId !== oldData.currentThemeId) {
    await applyThemeToSDK(newData.currentThemeId);
  }
  schedulePersistSettings();
}

/**
 * 布局设置变更处理器
 */
export function handleLayoutChange(
  newData: LayoutSettingsData,
  oldData: LayoutSettingsData,
): void {
  if (newData.currentLayout !== oldData.currentLayout) {
    const editorStore = useEditorStore();
    editorStore.setLayout(newData.currentLayout as 'infinite-canvas' | 'workbench');
    schedulePersistSettings();
  }
}

/**
 * 文件模式设置变更处理器
 */
export function handleFileModeChange(
  _newData: FileModeSettingsData,
  _oldData: FileModeSettingsData,
): void {
  schedulePersistSettings();
}

// ============================================================
// 主题相关工具函数
// ============================================================

/**
 * 获取可用的主题列表
 *
 * 从 SDK ThemeManager 获取所有已注册的主题，
 * 转换为 UI 展示用的 ThemeOption 格式。
 */
export async function getAvailableThemes(): Promise<ThemeOption[]> {
  const settingsStore = useSettingsStore();
  const themeData = settingsStore.getData<ThemeSettingsData>('theme');
  const activeThemeId = themeData?.currentThemeId ?? 'default-light';

  try {
    const sdk = await getEditorSdk();
    const themeList: ThemeMetadata[] = sdk.themes.listThemes();

    if (themeList.length === 0) {
      return getDefaultThemeOptions(activeThemeId);
    }

    return themeList.map((meta) =>
      createThemeOptionFromMetadata(meta, activeThemeId),
    );
  } catch (error) {
    console.error('[SettingsService] Failed to load themes:', error);
    return getDefaultThemeOptions(activeThemeId);
  }
}

/**
 * 应用主题到 SDK ThemeManager 和 UI Store
 */
async function applyThemeToSDK(themeId: string): Promise<void> {
  const uiStore = useUIStore();

  try {
    const sdk = await getEditorSdk();

    if (sdk.themes.hasTheme(themeId)) {
      sdk.themes.setTheme(themeId);
      sdk.themes.applyToDOM();
    } else {
      console.warn(
        `[SettingsService] Theme "${themeId}" not found, falling back to default-light`,
      );
      sdk.themes.setTheme('default-light');
      sdk.themes.applyToDOM();
    }
  } catch (error) {
    console.error('[SettingsService] Failed to apply theme to SDK:', error);
  }

  // 同步到 UI Store
  uiStore.setTheme(themeId);
}

/**
 * 检测系统主题并应用
 */
async function detectAndApplySystemTheme(): Promise<void> {
  try {
    const sdk = await getEditorSdk();
    const systemPreference = sdk.themes.detectSystemTheme();
    const targetThemeId =
      systemPreference === 'dark' ? 'default-dark' : 'default-light';

    const settingsStore = useSettingsStore();
    settingsStore.updateData<ThemeSettingsData>('theme', {
      currentThemeId: targetThemeId,
    });
  } catch (error) {
    console.error(
      '[SettingsService] Failed to detect system theme:',
      error,
    );
  }
}

/**
 * 启动系统主题变化监听
 */
function startSystemThemeWatcher(): void {
  stopSystemThemeWatcher();

  if (typeof window === 'undefined' || !window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (): void => {
    const settingsStore = useSettingsStore();
    const themeData = settingsStore.getData<ThemeSettingsData>('theme');
    if (themeData?.followSystem) {
      detectAndApplySystemTheme();
    }
  };

  mediaQuery.addEventListener('change', handler);
  systemThemeCleanup = () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * 停止系统主题变化监听
 */
function stopSystemThemeWatcher(): void {
  if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }
}

// ============================================================
// 语言相关工具函数
// ============================================================

/**
 * 应用语言设置到 UI
 */
function applyLanguageToUI(langData: LanguageSettingsData): void {
  const editorStore = useEditorStore();

  // 更新语言
  if (langData.locale !== editorStore.locale) {
    editorStore.setLocale(langData.locale);
  }
  setEditorLocale(langData.locale);

  // 更新 CSS 变量：字号和缩放
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--chips-font-size-base', `${langData.fontSize}px`);
    root.style.setProperty(
      '--chips-content-scale',
      String(langData.contentScale),
    );
  }
}

async function restorePersistedSettings(
  settingsStore: ReturnType<typeof useSettingsStore>,
): Promise<void> {
  try {
    const response = await invokeEditorRuntime<{ value?: unknown }>(
      'config',
      'get',
      {
        key: SETTINGS_CONFIG_KEY,
        scope: 'user',
      }
    );
    if (response && typeof response.value === 'object' && response.value !== null) {
      settingsStore.importAll(response.value as Record<string, unknown>);
    }
  } catch {
    // 配置读取失败时使用默认设置
  }
}

function schedulePersistSettings(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    void persistSettings();
  }, 200);
}

async function persistSettings(): Promise<void> {
  try {
    const settingsStore = useSettingsStore();
    await invokeEditorRuntime('config', 'set', {
      key: SETTINGS_CONFIG_KEY,
      scope: 'user',
      value: settingsStore.exportAll(),
    });
  } catch {
    // 持久化失败不阻塞 UI
  }
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 获取默认主题选项（回退用）
 */
function getDefaultThemeOptions(activeThemeId: string): ThemeOption[] {
  return [
    createThemeOption('default-light', 'light', activeThemeId),
    createThemeOption('default-dark', 'dark', activeThemeId),
  ];
}

/**
 * 从 SDK 元数据创建主题选项
 */
function createThemeOptionFromMetadata(
  meta: ThemeMetadata,
  activeThemeId: string,
): ThemeOption {
  return {
    id: meta.id,
    name: meta.name,
    type: meta.type,
    isActive: meta.id === activeThemeId,
    previewPrimary: undefined,
    previewBackground: undefined,
    previewText: undefined,
  };
}

/**
 * 创建默认主题选项
 */
function createThemeOption(
  id: string,
  type: 'light' | 'dark',
  activeThemeId: string,
): ThemeOption {
  const isLight = type === 'light';
  return {
    id,
    name: isLight ? 'Default Light' : 'Default Dark',
    type,
    isActive: id === activeThemeId,
    previewPrimary: isLight ? '#3b82f6' : '#60a5fa',
    previewBackground: isLight ? '#ffffff' : '#0f172a',
    previewText: isLight ? '#1e293b' : '#f1f5f9',
  };
}
