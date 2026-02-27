import React, { useMemo, useCallback } from 'react';
import { useSettingsStore, getSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { LayoutSettingsData } from '@/types';
import '../styles/settings-panel.css';

const CATEGORY_ID = 'layout';

/**
 * 引擎模式设置面板
 * 切换编辑引擎的工作模式（无限画布、工作台等）。
 */
export function LayoutSettingsPanel() {
  const settingsState = useSettingsStore();
  const settingsStoreActions = getSettingsStore();

  /** 当前布局数据 */
  const layoutData = useMemo<LayoutSettingsData>(
    () => settingsStoreActions.getData<LayoutSettingsData>(CATEGORY_ID) ?? {
      currentLayout: 'infinite-canvas',
    },
    [settingsStoreActions],
  );

  /** 可用布局模式 */
  const layoutModes = useMemo(() => [
    {
      id: 'infinite-canvas',
      labelKey: 'engine_settings.layout_infinite_canvas',
      descKey: 'engine_settings.layout_infinite_canvas_desc',
      icon: '🖼️',
      available: true,
    },
    {
      id: 'workbench',
      labelKey: 'engine_settings.layout_workbench',
      descKey: 'engine_settings.layout_workbench_desc',
      icon: '📐',
      available: false,
    },
  ], []);

  /**
   * 选择布局模式
   */
  const handleSelectLayout = useCallback((layoutId: string) => {
    settingsStoreActions.updateData<LayoutSettingsData>(CATEGORY_ID, {
      currentLayout: layoutId,
    });
  }, [settingsStoreActions]);

  return (
    <div className="layout-settings-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.layout_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('engine_settings.layout_description')}
        </p>
      </div>

      {/* 模式选择卡片 */}
      <div className="settings-option-grid">
        {layoutModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`settings-option-card ${
              layoutData.currentLayout === mode.id ? 'settings-option-card--selected' : ''
            } ${!mode.available ? 'settings-option-card--disabled' : ''}`}
            disabled={!mode.available}
            onClick={() => mode.available && handleSelectLayout(mode.id)}
          >
            <div className="layout-card__icon">{mode.icon}</div>
            <span className="settings-option-card__name">
              {t(mode.labelKey)}
            </span>
            <span className="settings-option-card__desc">
              {t(mode.descKey)}
            </span>

            {/* 选中标记 */}
            {layoutData.currentLayout === mode.id && (
              <span
                className="settings-option-card__check"
                aria-hidden="true"
              >
                ✓
              </span>
            )}

            {/* 不可用提示 */}
            {!mode.available && (
              <span className="settings-badge settings-badge--warning">
                {t('engine_settings.layout_coming_soon')}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
