import React, { useMemo, useCallback } from 'react';
import { useSettingsStore, getSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { FileModeSettingsData } from '@/types';
import '../styles/settings-panel.css';

const CATEGORY_ID = 'fileMode';

/**
 * 文件管理方式设置面板
 * 选择卡片文件的资源管理方式：链接模式或复制模式
 */
export function FileModeSettingsPanel() {
  const settingsState = useSettingsStore();
  const settingsStoreActions = getSettingsStore();

  /** 当前文件模式数据 */
  const fileModeData = useMemo<FileModeSettingsData>(
    () => settingsStoreActions.getData<FileModeSettingsData>(CATEGORY_ID) ?? {
      fileMode: 'link',
    },
    [settingsStoreActions],
  );

  /** 文件模式选项 */
  const fileModes = useMemo(() => [
    {
      id: 'link' as const,
      labelKey: 'engine_settings.file_mode_link',
      descKey: 'engine_settings.file_mode_link_desc',
      icon: '🔗',
    },
    {
      id: 'copy' as const,
      labelKey: 'engine_settings.file_mode_copy',
      descKey: 'engine_settings.file_mode_copy_desc',
      icon: '📋',
    },
  ], []);

  /**
   * 选择文件模式
   */
  const handleSelectMode = useCallback((mode: 'link' | 'copy') => {
    settingsStoreActions.updateData<FileModeSettingsData>(CATEGORY_ID, {
      fileMode: mode,
    });
  }, [settingsStoreActions]);

  return (
    <div className="file-mode-settings-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.file_mode_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('engine_settings.file_mode_description')}
        </p>
      </div>

      {/* 模式选择 */}
      <div className="file-mode-options">
        {fileModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`file-mode-option ${
              fileModeData.fileMode === mode.id ? 'file-mode-option--selected' : ''
            }`}
            onClick={() => handleSelectMode(mode.id)}
          >
            <div className="file-mode-option__header">
              <span className="file-mode-option__icon">{mode.icon}</span>
              <span className="file-mode-option__name">{t(mode.labelKey)}</span>
              {fileModeData.fileMode === mode.id && (
                <span
                  className="settings-option-card__check"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </div>
            <p className="file-mode-option__desc">{t(mode.descKey)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
