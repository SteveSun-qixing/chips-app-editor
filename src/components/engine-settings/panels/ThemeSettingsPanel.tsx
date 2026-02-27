import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChipsButton, ChipsSwitch } from '@chips/component-library';
import { useSettingsStore, getSettingsStore } from '@/core/state';
import { getAvailableThemes } from '@/services/settings-service';
import { t } from '@/services/i18n-service';
import type { ThemeSettingsData, ThemeOption } from '@/types';
import '../styles/settings-panel.css';

const CATEGORY_ID = 'theme';

/**
 * 主题名称多语言映射
 */
const THEME_NAME_KEY_MAP: Record<string, string> = {
  'default-light': 'engine_settings.theme_default_light',
  'default-dark': 'engine_settings.theme_default_dark',
};

/**
 * 主题设置面板
 * 管理编辑引擎的主题包：选择、跟随系统、安装。
 */
export function ThemeSettingsPanel() {
  const settingsState = useSettingsStore();
  const settingsStoreActions = getSettingsStore();

  /** 主题列表 */
  const [themes, setThemes] = useState<ThemeOption[]>([]);

  /** 加载状态 */
  const [isLoading, setIsLoading] = useState(false);

  /** 当前主题数据 */
  const themeData = useMemo<ThemeSettingsData>(
    () => settingsStoreActions.getData<ThemeSettingsData>(CATEGORY_ID) ?? {
      currentThemeId: 'default-light',
      followSystem: false,
      installedThemeIds: [],
    },
    [settingsStoreActions],
  );

  /** 监听 Store 数据变化，更新主题列表的选中状态 */
  useEffect(() => {
    setThemes((prevThemes) =>
      prevThemes.map((th) => ({
        ...th,
        isActive: th.id === themeData.currentThemeId,
      }))
    );
  }, [themeData.currentThemeId]);

  /**
   * 获取主题显示名称
   */
  const getThemeName = useCallback((theme: ThemeOption): string => {
    const key = THEME_NAME_KEY_MAP[theme.id];
    if (key) return t(key);
    return theme.name;
  }, []);

  /**
   * 获取主题类型标签
   */
  const getThemeTypeLabel = useCallback((type: string): string => {
    if (type === 'light') return t('engine_settings.theme_light');
    if (type === 'dark') return t('engine_settings.theme_dark');
    return type;
  }, [t]);

  /**
   * 获取主题预览样式
   */
  const getPreviewStyle = useCallback((theme: ThemeOption): React.CSSProperties => {
    return {
      '--preview-bg': theme.previewBackground || (theme.type === 'dark' ? '#0f172a' : '#ffffff'),
      '--preview-primary': theme.previewPrimary || (theme.type === 'dark' ? '#60a5fa' : '#3b82f6'),
      '--preview-text': theme.previewText || (theme.type === 'dark' ? '#f1f5f9' : '#1e293b'),
    } as React.CSSProperties;
  }, []);

  /**
   * 加载主题列表
   */
  const loadThemes = useCallback(async () => {
    setIsLoading(true);
    try {
      const availableThemes = await getAvailableThemes();
      setThemes(availableThemes);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  /**
   * 选择主题
   */
  const handleSelectTheme = useCallback((themeId: string) => {
    settingsStoreActions.updateData<ThemeSettingsData>(CATEGORY_ID, {
      currentThemeId: themeId,
      followSystem: false,
    });
  }, [settingsStoreActions]);

  /**
   * 切换跟随系统主题
   */
  const handleToggleFollowSystem = useCallback((value: boolean) => {
    settingsStoreActions.updateData<ThemeSettingsData>(CATEGORY_ID, {
      followSystem: value,
    });
  }, [settingsStoreActions]);

  return (
    <div className="theme-settings-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.theme_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('engine_settings.theme_description')}
        </p>
      </div>

      {/* 跟随系统主题开关 */}
      <div className="settings-row">
        <div className="settings-row__info">
          <span className="settings-row__label">
            {t('engine_settings.theme_follow_system')}
          </span>
          <span className="settings-row__desc">
            {t('engine_settings.theme_follow_system_desc')}
          </span>
        </div>
        <ChipsSwitch
          checked={themeData.followSystem}
          onChange={handleToggleFollowSystem}
        />
      </div>

      {/* 主题选择列表 */}
      <div className="settings-field">
        <div className="settings-field__header">
          <label className="settings-field__label">
            {t('engine_settings.theme_select')}
          </label>
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="settings-empty">
            <span className="chips-loading-spinner" aria-label="Loading" />
            <span className="settings-empty__text">
              {t('engine_settings.theme_loading')}
            </span>
          </div>
        )}

        {/* 主题卡片网格 */}
        {!isLoading && (
          <div className="settings-option-grid">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`settings-option-card ${
                  themeData.currentThemeId === theme.id ? 'settings-option-card--selected' : ''
                } ${themeData.followSystem ? 'settings-option-card--disabled' : ''}`}
                disabled={themeData.followSystem}
                style={getPreviewStyle(theme)}
                onClick={() => handleSelectTheme(theme.id)}
              >
                {/* 预览色块 */}
                <div className="theme-preview">
                  <div className="theme-preview__bar" />
                  <div className="theme-preview__content">
                    <div className="theme-preview__line" />
                    <div className="theme-preview__line theme-preview__line--short" />
                  </div>
                </div>

                {/* 主题信息 */}
                <div className="theme-card-info">
                  <span className="settings-option-card__name">
                    {getThemeName(theme)}
                  </span>
                  <span className="settings-badge settings-badge--info">
                    {getThemeTypeLabel(theme.type)}
                  </span>
                </div>

                {/* 选中标记 */}
                {themeData.currentThemeId === theme.id && (
                  <span
                    className="settings-option-card__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 安装主题包入口 */}
      <div className="settings-actions">
        <ChipsButton variant="default" htmlType="button">
          {t('engine_settings.theme_install')}
        </ChipsButton>
      </div>
    </div>
  );
}
