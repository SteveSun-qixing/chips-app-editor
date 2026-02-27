<script setup lang="ts">
/**
 * 引擎模式设置面板
 * @module components/engine-settings/panels/LayoutSettingsPanel
 *
 * 切换编辑引擎的工作模式（无限画布、工作台等）。
 * 目前只有无限画布模式，预留工作台模式接口。
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { computed } from 'vue';
import { useSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { LayoutSettingsData } from '@/types';

const CATEGORY_ID = 'layout';

const settingsStore = useSettingsStore();

/** 当前布局数据 */
const layoutData = computed<LayoutSettingsData>(
  () => settingsStore.getData<LayoutSettingsData>(CATEGORY_ID) ?? {
    currentLayout: 'infinite-canvas',
  },
);

/** 可用布局模式 */
const layoutModes = [
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
];

/**
 * 选择布局模式
 */
function handleSelectLayout(layoutId: string): void {
  settingsStore.updateData<LayoutSettingsData>(CATEGORY_ID, {
    currentLayout: layoutId,
  });
}
</script>

<template>
  <div class="layout-settings-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.layout_title') }}
      </h3>
      <p class="settings-panel-header__desc">
        {{ t('engine_settings.layout_description') }}
      </p>
    </div>

    <!-- 模式选择卡片 -->
    <div class="settings-option-grid">
      <button
        v-for="mode in layoutModes"
        :key="mode.id"
        type="button"
        :class="[
          'settings-option-card',
          {
            'settings-option-card--selected': layoutData.currentLayout === mode.id,
            'settings-option-card--disabled': !mode.available,
          },
        ]"
        :disabled="!mode.available"
        @click="mode.available && handleSelectLayout(mode.id)"
      >
        <div class="layout-card__icon">{{ mode.icon }}</div>
        <span class="settings-option-card__name">
          {{ t(mode.labelKey) }}
        </span>
        <span class="settings-option-card__desc">
          {{ t(mode.descKey) }}
        </span>

        <!-- 选中标记 -->
        <span
          v-if="layoutData.currentLayout === mode.id"
          class="settings-option-card__check"
          aria-hidden="true"
        >
          ✓
        </span>

        <!-- 不可用提示 -->
        <span
          v-if="!mode.available"
          class="settings-badge settings-badge--warning"
        >
          {{ t('engine_settings.layout_coming_soon') }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';

.layout-card__icon {
  font-size: 32px;
  text-align: center;
  padding: var(--chips-spacing-md, 16px) 0 var(--chips-spacing-sm, 8px);
}
</style>
