<script setup lang="ts">
/**
 * 文件管理方式设置面板
 * @module components/engine-settings/panels/FileModeSettingsPanel
 *
 * 选择卡片文件的资源管理方式：
 * - 链接模式：引用本地文件路径
 * - 复制模式：复制文件到卡片目录
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { computed } from 'vue';
import { useSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { FileModeSettingsData } from '@/types';

const CATEGORY_ID = 'fileMode';

const settingsStore = useSettingsStore();

/** 当前文件模式数据 */
const fileModeData = computed<FileModeSettingsData>(
  () => settingsStore.getData<FileModeSettingsData>(CATEGORY_ID) ?? {
    fileMode: 'link',
  },
);

/** 文件模式选项 */
const fileModes = [
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
];

/**
 * 选择文件模式
 */
function handleSelectMode(mode: 'link' | 'copy'): void {
  settingsStore.updateData<FileModeSettingsData>(CATEGORY_ID, {
    fileMode: mode,
  });
}
</script>

<template>
  <div class="file-mode-settings-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.file_mode_title') }}
      </h3>
      <p class="settings-panel-header__desc">
        {{ t('engine_settings.file_mode_description') }}
      </p>
    </div>

    <!-- 模式选择 -->
    <div class="file-mode-options">
      <button
        v-for="mode in fileModes"
        :key="mode.id"
        type="button"
        :class="[
          'file-mode-option',
          { 'file-mode-option--selected': fileModeData.fileMode === mode.id },
        ]"
        @click="handleSelectMode(mode.id)"
      >
        <div class="file-mode-option__header">
          <span class="file-mode-option__icon">{{ mode.icon }}</span>
          <span class="file-mode-option__name">{{ t(mode.labelKey) }}</span>
          <span
            v-if="fileModeData.fileMode === mode.id"
            class="settings-option-card__check"
            aria-hidden="true"
          >
            ✓
          </span>
        </div>
        <p class="file-mode-option__desc">{{ t(mode.descKey) }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';

.file-mode-options {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-md, 16px);
}

.file-mode-option {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  border: 2px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-lg, 12px);
  background: var(--chips-color-surface, #ffffff);
  cursor: pointer;
  text-align: left;
  position: relative;
  transition:
    border-color var(--chips-duration-fast, 100ms) ease,
    box-shadow var(--chips-duration-fast, 100ms) ease;
}

.file-mode-option:hover {
  border-color: color-mix(
    in srgb,
    var(--chips-color-primary, #3b82f6) 50%,
    transparent
  );
}

.file-mode-option--selected {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 1px var(--chips-color-primary, #3b82f6);
}

.file-mode-option__header {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
}

.file-mode-option__icon {
  font-size: 20px;
}

.file-mode-option__name {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-semibold, 600);
  color: var(--chips-color-text, #111827);
}

.file-mode-option__desc {
  margin: 0;
  font-size: 13px;
  color: var(--chips-color-text-secondary, #6b7280);
  line-height: var(--chips-line-height-relaxed, 1.625);
}
</style>
