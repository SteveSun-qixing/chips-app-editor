<script setup lang="ts">
/**
 * 语言与文字设置面板
 * @module components/engine-settings/panels/LanguageSettingsPanel
 *
 * 管理编辑引擎的语言、字号和内容缩放比例。
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { computed } from 'vue';
import { Select } from '@chips/component-library';
import { useSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { LanguageSettingsData } from '@/types';

const CATEGORY_ID = 'language';

const settingsStore = useSettingsStore();

/** 当前语言数据 */
const langData = computed<LanguageSettingsData>(
  () => settingsStore.getData<LanguageSettingsData>(CATEGORY_ID) ?? {
    locale: 'zh-CN',
    fontSize: 14,
    contentScale: 1.0,
  },
);

/** 可用语言列表 */
const availableLocales = computed(() => [
  { value: 'zh-CN', label: t('engine_settings.language_locale_zh_cn') },
  { value: 'en-US', label: t('engine_settings.language_locale_en_us') },
]);

/**
 * 更新语言
 */
function handleLocaleChange(locale: string): void {
  settingsStore.updateData<LanguageSettingsData>(CATEGORY_ID, { locale });
}

/**
 * 更新字号
 */
function handleFontSizeChange(fontSize: number): void {
  settingsStore.updateData<LanguageSettingsData>(CATEGORY_ID, { fontSize });
}

/**
 * 更新内容缩放
 */
function handleContentScaleChange(scale: number): void {
  settingsStore.updateData<LanguageSettingsData>(CATEGORY_ID, {
    contentScale: scale / 100,
  });
}

/** 内容缩放百分比（滑块用） */
const contentScalePercent = computed(() =>
  Math.round(langData.value.contentScale * 100),
);
</script>

<template>
  <div class="language-settings-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.language_title') }}
      </h3>
      <p class="settings-panel-header__desc">
        {{ t('engine_settings.language_description') }}
      </p>
    </div>

    <!-- 界面语言 -->
    <div class="settings-field">
      <div class="settings-field__header">
        <label class="settings-field__label">
          {{ t('engine_settings.language_locale') }}
        </label>
        <span class="settings-field__desc">
          {{ t('engine_settings.language_locale_desc') }}
        </span>
      </div>
      <div class="settings-field__control">
        <Select
          :model-value="langData.locale"
          :options="availableLocales"
          @update:model-value="handleLocaleChange"
        />
      </div>
    </div>

    <!-- 基础字号 -->
    <div class="settings-field">
      <div class="settings-field__header">
        <label class="settings-field__label">
          {{ t('engine_settings.language_font_size') }}
        </label>
        <span class="settings-field__desc">
          {{ t('engine_settings.language_font_size_desc') }}
        </span>
      </div>
      <div class="settings-field__control settings-field__control--with-value">
        <input
          type="range"
          class="chips-slider"
          :value="langData.fontSize"
          :min="12"
          :max="24"
          :step="1"
          @input="handleFontSizeChange(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="settings-field__value">
          {{ langData.fontSize }}{{ t('engine_settings.language_font_size_unit') }}
        </span>
      </div>
    </div>

    <!-- 内容比例 -->
    <div class="settings-field">
      <div class="settings-field__header">
        <label class="settings-field__label">
          {{ t('engine_settings.language_content_scale') }}
        </label>
        <span class="settings-field__desc">
          {{ t('engine_settings.language_content_scale_desc') }}
        </span>
      </div>
      <div class="settings-field__control settings-field__control--with-value">
        <input
          type="range"
          class="chips-slider"
          :value="contentScalePercent"
          :min="50"
          :max="200"
          :step="10"
          @input="handleContentScaleChange(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="settings-field__value">{{ contentScalePercent }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';
</style>
