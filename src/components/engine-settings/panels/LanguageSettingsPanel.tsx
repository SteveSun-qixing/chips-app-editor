import React, { useMemo, useCallback } from 'react';
import { ChipsSelect } from '@chips/component-library';
import { useSettingsStore, getSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { LanguageSettingsData } from '@/types';
import '../styles/settings-panel.css';

const CATEGORY_ID = 'language';

/**
 * 语言与文字设置面板
 * 管理编辑引擎的语言、字号和内容缩放比例。
 */
export function LanguageSettingsPanel() {
  const settingsState = useSettingsStore();
  const settingsStoreActions = getSettingsStore();

  /** 当前语言数据 */
  const langData = useMemo<LanguageSettingsData>(
    () => settingsStoreActions.getData<LanguageSettingsData>(CATEGORY_ID) ?? {
      locale: 'zh-CN',
      fontSize: 14,
      contentScale: 1.0,
    },
    [settingsStoreActions],
  );

  /** 可用语言列表 */
  const availableLocales = useMemo(() => [
    { value: 'zh-CN', label: t('engine_settings.language_locale_zh_cn') },
    { value: 'en-US', label: t('engine_settings.language_locale_en_us') },
  ], []);

  /** 内容缩放百分比（滑块用） */
  const contentScalePercent = useMemo(
    () => Math.round(langData.contentScale * 100),
    [langData.contentScale],
  );

  /**
   * 更新语言
   */
  const handleLocaleChange = useCallback((locale: string) => {
    settingsStoreActions.updateData<LanguageSettingsData>(CATEGORY_ID, { locale });
  }, [settingsStoreActions]);

  /**
   * 更新字号
   */
  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fontSize = Number(e.target.value);
    settingsStoreActions.updateData<LanguageSettingsData>(CATEGORY_ID, { fontSize });
  }, [settingsStoreActions]);

  /**
   * 更新内容缩放
   */
  const handleContentScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const scale = Number(e.target.value);
    settingsStoreActions.updateData<LanguageSettingsData>(CATEGORY_ID, {
      contentScale: scale / 100,
    });
  }, [settingsStoreActions]);

  return (
    <div className="language-settings-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.language_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('engine_settings.language_description')}
        </p>
      </div>

      {/* 界面语言 */}
      <div className="settings-field">
        <div className="settings-field__header">
          <label className="settings-field__label">
            {t('engine_settings.language_locale')}
          </label>
          <span className="settings-field__desc">
            {t('engine_settings.language_locale_desc')}
          </span>
        </div>
        <div className="settings-field__control">
          <ChipsSelect
            value={langData.locale}
            options={availableLocales}
            onChange={handleLocaleChange}
          />
        </div>
      </div>

      {/* 基础字号 */}
      <div className="settings-field">
        <div className="settings-field__header">
          <label className="settings-field__label">
            {t('engine_settings.language_font_size')}
          </label>
          <span className="settings-field__desc">
            {t('engine_settings.language_font_size_desc')}
          </span>
        </div>
        <div className="settings-field__control settings-field__control--with-value">
          <input
            type="range"
            className="chips-slider"
            value={langData.fontSize}
            min={12}
            max={24}
            step={1}
            onChange={handleFontSizeChange}
          />
          <span className="settings-field__value">
            {langData.fontSize}{t('engine_settings.language_font_size_unit')}
          </span>
        </div>
      </div>

      {/* 内容比例 */}
      <div className="settings-field">
        <div className="settings-field__header">
          <label className="settings-field__label">
            {t('engine_settings.language_content_scale')}
          </label>
          <span className="settings-field__desc">
            {t('engine_settings.language_content_scale_desc')}
          </span>
        </div>
        <div className="settings-field__control settings-field__control--with-value">
          <input
            type="range"
            className="chips-slider"
            value={contentScalePercent}
            min={50}
            max={200}
            step={10}
            onChange={handleContentScaleChange}
          />
          <span className="settings-field__value">{contentScalePercent}%</span>
        </div>
      </div>
    </div>
  );
}
