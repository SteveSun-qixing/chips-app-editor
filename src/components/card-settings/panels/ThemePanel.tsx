import React, { useState, useEffect, useCallback } from 'react';
import { ChipsButton } from '@chips/component-library';
import { invokeEditorRuntime } from '@/services/editor-runtime-gateway';
import { getAvailableThemes } from '@/services/settings-service';
import { t } from '@/services/i18n-service';
import './ThemePanel.css';

export interface ThemePanelProps {
  /** 当前选中的主题 ID */
  modelValue?: string;
  /** 主题选择变更回调 */
  onUpdateModelValue?: (value: string) => void;
}

interface Theme {
  id: string;
  name: string;
}

interface FileWithPath extends File {
  path?: string;
}

/**
 * ThemePanel 主题设置面板
 * 负责卡片主题的选择和管理
 */
export function ThemePanel({
  modelValue,
  onUpdateModelValue,
}: ThemePanelProps) {
  const DEFAULT_THEME_ID = 'default-light';

  const THEME_NAME_KEY_MAP: Record<string, string> = {
    'default-light': 'card_settings.theme_default_light',
    'default-dark': 'card_settings.theme_default_dark',
  };

  // 主题列表
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(modelValue || DEFAULT_THEME_ID);

  // 同步外部 modelValue 到内部状态
  useEffect(() => {
    if (modelValue) {
      setSelectedTheme(modelValue);
    }
  }, [modelValue]);

  // 选择主题时通知父组件
  const selectTheme = useCallback((themeId: string) => {
    setSelectedTheme(themeId);
    onUpdateModelValue?.(themeId);
  }, [onUpdateModelValue]);

  // 选择主题文件
  const selectThemeFile = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.cpk,application/octet-stream';
      input.addEventListener('change', () => {
        resolve(input.files?.[0] ?? null);
      });
      input.click();
    });
  }, []);

  // 加载主题列表
  const loadThemes = useCallback(async () => {
    setIsLoading(true);
    try {
      const themeList = await getAvailableThemes();
      setThemes(
        themeList.length > 0
          ? themeList.map((theme) => ({
              id: theme.id,
              name: (() => {
                const nameKey = THEME_NAME_KEY_MAP[theme.id];
                return nameKey ? t(nameKey) : theme.name;
              })(),
            }))
          : [
              {
                id: DEFAULT_THEME_ID,
                name: t('card_settings.theme_default_light'),
              },
            ]
      );

      // 确保选中的主题存在于列表中
      if (!themes.some((th) => th.id === selectedTheme)) {
        selectTheme(themes[0]?.id ?? DEFAULT_THEME_ID);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
      setThemes([
        {
          id: DEFAULT_THEME_ID,
          name: t('card_settings.theme_default_light'),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTheme, themes, selectTheme]);

  // 处理上传主题（Theme Package）
  const handleUploadTheme = useCallback(async () => {
    const file = await selectThemeFile();
    if (!file) {
      return;
    }

    try {
      const packagePath = (file as FileWithPath).path;
      if (!packagePath || packagePath.trim().length === 0) {
        throw new Error('Theme package path is unavailable');
      }

      const result = await invokeEditorRuntime<{ themeId?: string; installed?: boolean }>('theme', 'install', {
        packagePath,
        overwrite: true,
      });

      await loadThemes();

      if (typeof result?.themeId === 'string' && result.themeId.trim().length > 0) {
        selectTheme(result.themeId);
      }
    } catch (error) {
      console.error('Failed to upload theme:', error);
    }
  }, [selectThemeFile, loadThemes, selectTheme]);

  // 组件挂载时加载主题列表
  useEffect(() => {
    loadThemes();
  }, []);

  return (
    <div className="theme-panel">
      {/* 头部：标签 + 上传按钮 */}
      <div className="theme-panel__header">
        <label className="theme-panel__label">
          {t('card_settings.theme_select')}
        </label>
        <ChipsButton
          htmlType="button"
          variant="default"
          className="theme-panel__upload-btn"
          onClick={handleUploadTheme}
        >
          📤 {t('card_settings.theme_upload')}
        </ChipsButton>
      </div>

      {/* 加载状态 */}
      {isLoading ? (
        <div className="theme-panel__loading">
          <span className="chips-loading-spinner" aria-label="Loading" />
          <span className="theme-panel__loading-text">
            {t('card_settings.theme_loading')}
          </span>
        </div>
      ) : (
        /* 主题网格 */
        <div className="theme-panel__grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-panel__item ${selectedTheme === theme.id ? 'theme-panel__item--selected' : ''}`}
              onClick={() => selectTheme(theme.id)}
            >
              <span className="theme-panel__item-preview" />
              <span className="theme-panel__item-name">{theme.name}</span>
              {selectedTheme === theme.id && (
                <span
                  className="theme-panel__item-check"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 提示信息（仅当只有一个主题时显示） */}
      {themes.length <= 1 && !isLoading && (
        <div
          role="alert"
          className="chips-alert chips-alert--warning theme-panel__hint"
        >
          <span className="chips-alert__icon theme-panel__hint-icon">💡</span>
          <span className="chips-alert__message">{t('card_settings.theme_hint')}</span>
        </div>
      )}
    </div>
  );
}
