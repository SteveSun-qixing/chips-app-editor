<script setup lang="ts">
/**
 * 主题设置面板
 * @module components/engine-settings/panels/ThemeSettingsPanel
 *
 * 管理编辑引擎的主题包：选择、跟随系统、安装。
 * 每个主题包是独立的视觉方案（日间和夜间是不同的主题包，不存在模式切换）。
 * 注意：此处的主题仅影响编辑引擎本身，每个复合卡片有独立的主题管理。
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { ref, computed, onMounted, watch } from 'vue';
import { Button, Switch } from '@chips/components';
import { useSettingsStore } from '@/core/state';
import { getAvailableThemes } from '@/services/settings-service';
import { t } from '@/services/i18n-service';
import type { ThemeSettingsData, ThemeOption } from '@/types';

const CATEGORY_ID = 'theme';

/**
 * 主题名称多语言映射
 */
const THEME_NAME_KEY_MAP: Record<string, string> = {
  'default-light': 'engine_settings.theme_default_light',
  'default-dark': 'engine_settings.theme_default_dark',
};

const settingsStore = useSettingsStore();

/** 主题列表 */
const themes = ref<ThemeOption[]>([]);

/** 加载状态 */
const isLoading = ref(false);

/** 当前主题数据 */
const themeData = computed<ThemeSettingsData>(
  () => settingsStore.getData<ThemeSettingsData>(CATEGORY_ID) ?? {
    currentThemeId: 'default-light',
    followSystem: false,
    installedThemeIds: [],
  },
);

/** 监听 Store 数据变化，更新主题列表的选中状态 */
watch(
  () => themeData.value.currentThemeId,
  (newId) => {
    themes.value = themes.value.map((th) => ({
      ...th,
      isActive: th.id === newId,
    }));
  },
);

/**
 * 获取主题显示名称
 */
function getThemeName(theme: ThemeOption): string {
  const key = THEME_NAME_KEY_MAP[theme.id];
  if (key) return t(key);
  return theme.name;
}

/**
 * 获取主题类型标签
 */
function getThemeTypeLabel(type: string): string {
  if (type === 'light') return t('engine_settings.theme_light');
  if (type === 'dark') return t('engine_settings.theme_dark');
  return type;
}

/**
 * 选择主题
 */
function handleSelectTheme(themeId: string): void {
  settingsStore.updateData<ThemeSettingsData>(CATEGORY_ID, {
    currentThemeId: themeId,
    followSystem: false,
  });
}

/**
 * 切换跟随系统主题
 */
function handleToggleFollowSystem(value: boolean): void {
  settingsStore.updateData<ThemeSettingsData>(CATEGORY_ID, {
    followSystem: value,
  });
}

/**
 * 获取主题预览样式
 */
function getPreviewStyle(theme: ThemeOption): Record<string, string> {
  return {
    '--preview-bg': theme.previewBackground || (theme.type === 'dark' ? '#0f172a' : '#ffffff'),
    '--preview-primary': theme.previewPrimary || (theme.type === 'dark' ? '#60a5fa' : '#3b82f6'),
    '--preview-text': theme.previewText || (theme.type === 'dark' ? '#f1f5f9' : '#1e293b'),
  };
}

/**
 * 加载主题列表
 */
async function loadThemes(): Promise<void> {
  isLoading.value = true;
  try {
    themes.value = await getAvailableThemes();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadThemes();
});
</script>

<template>
  <div class="theme-settings-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.theme_title') }}
      </h3>
      <p class="settings-panel-header__desc">
        {{ t('engine_settings.theme_description') }}
      </p>
    </div>

    <!-- 跟随系统主题开关 -->
    <div class="settings-row">
      <div class="settings-row__info">
        <span class="settings-row__label">
          {{ t('engine_settings.theme_follow_system') }}
        </span>
        <span class="settings-row__desc">
          {{ t('engine_settings.theme_follow_system_desc') }}
        </span>
      </div>
      <Switch
        :model-value="themeData.followSystem"
        @update:model-value="handleToggleFollowSystem"
      />
    </div>

    <!-- 主题选择列表 -->
    <div class="settings-field">
      <div class="settings-field__header">
        <label class="settings-field__label">
          {{ t('engine_settings.theme_select') }}
        </label>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="settings-empty">
        <span class="chips-loading-spinner" aria-label="Loading" />
        <span class="settings-empty__text">
          {{ t('engine_settings.theme_loading') }}
        </span>
      </div>

      <!-- 主题卡片网格 -->
      <div v-else class="settings-option-grid">
        <button
          v-for="theme in themes"
          :key="theme.id"
          type="button"
          :class="[
            'settings-option-card',
            {
              'settings-option-card--selected': themeData.currentThemeId === theme.id,
              'settings-option-card--disabled': themeData.followSystem,
            },
          ]"
          :disabled="themeData.followSystem"
          :style="getPreviewStyle(theme)"
          @click="handleSelectTheme(theme.id)"
        >
          <!-- 预览色块 -->
          <div class="theme-preview">
            <div class="theme-preview__bar" />
            <div class="theme-preview__content">
              <div class="theme-preview__line" />
              <div class="theme-preview__line theme-preview__line--short" />
            </div>
          </div>

          <!-- 主题信息 -->
          <div class="theme-card-info">
            <span class="settings-option-card__name">
              {{ getThemeName(theme) }}
            </span>
            <span class="settings-badge settings-badge--info">
              {{ getThemeTypeLabel(theme.type) }}
            </span>
          </div>

          <!-- 选中标记 -->
          <span
            v-if="themeData.currentThemeId === theme.id"
            class="settings-option-card__check"
            aria-hidden="true"
          >
            ✓
          </span>
        </button>
      </div>
    </div>

    <!-- 安装主题包入口 -->
    <div class="settings-actions">
      <Button type="default" html-type="button">
        {{ t('engine_settings.theme_install') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';

/* 主题预览色块 */
.theme-preview {
  width: 100%;
  height: 80px;
  border-radius: var(--chips-radius-md, 8px);
  overflow: hidden;
  background: var(--preview-bg, #ffffff);
  display: flex;
  flex-direction: column;
}

.theme-preview__bar {
  height: 20px;
  background: var(--preview-primary, #3b82f6);
  flex-shrink: 0;
}

.theme-preview__content {
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.theme-preview__line {
  height: 6px;
  border-radius: 3px;
  background: var(--preview-text, #1e293b);
  opacity: 0.3;
}

.theme-preview__line--short {
  width: 60%;
}

.theme-card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--chips-spacing-xs, 4px) var(--chips-spacing-xs, 4px);
}
</style>
