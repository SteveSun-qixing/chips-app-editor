<script setup lang="ts">
/**
 * ThemePanel 主题设置面板
 * @module components/card-settings/panels/ThemePanel
 *
 * 负责卡片主题的选择和管理
 * 使用薯片组件库，遵循主题系统规范
 */

import { ref, watch } from 'vue';
import { Button } from '@chips/component-library';
import { invokeEditorRuntime } from '@/services/editor-runtime-gateway';
import { getAvailableThemes } from '@/services/settings-service';
import { t } from '@/services/i18n-service';

interface Props {
  /** 当前选中的主题 ID */
  modelValue: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 主题选择变更 */
  'update:modelValue': [value: string];
}>();

const DEFAULT_THEME_ID = 'default-light';

const THEME_NAME_KEY_MAP: Record<string, string> = {
  'default-light': 'card_settings.theme_default_light',
  'default-dark': 'card_settings.theme_default_dark',
};

// 主题列表
const themes = ref<Array<{ id: string; name: string }>>([]);
const isLoading = ref(false);
const selectedTheme = ref(props.modelValue || DEFAULT_THEME_ID);

// 同步外部 modelValue 到内部状态
watch(
  () => props.modelValue,
  (val) => {
    selectedTheme.value = val || DEFAULT_THEME_ID;
  }
);

// 选择主题时通知父组件
function selectTheme(themeId: string): void {
  selectedTheme.value = themeId;
  emit('update:modelValue', themeId);
}

interface FileWithPath extends File {
  path?: string;
}

async function selectThemeFile(): Promise<File | null> {
  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cpk,application/octet-stream';
    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null);
    });
    input.click();
  });
}

/**
 * 加载主题列表
 */
async function loadThemes(): Promise<void> {
  isLoading.value = true;
  try {
    const themeList = await getAvailableThemes();
    themes.value = themeList.length > 0
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
        ];

    // 确保选中的主题存在于列表中
    if (!themes.value.some((th) => th.id === selectedTheme.value)) {
      selectTheme(themes.value[0]?.id ?? DEFAULT_THEME_ID);
    }
  } catch (error) {
    console.error('Failed to load themes:', error);
    themes.value = [
      {
        id: DEFAULT_THEME_ID,
        name: t('card_settings.theme_default_light'),
      },
    ];
  } finally {
    isLoading.value = false;
  }
}

/**
 * 处理上传主题（Theme Package）
 */
async function handleUploadTheme(): Promise<void> {
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
}

// 组件挂载时加载主题列表
loadThemes();
</script>

<template>
  <div class="theme-panel">
    <!-- 头部：标签 + 上传按钮 -->
    <div class="theme-panel__header">
      <label class="theme-panel__label">
        {{ t('card_settings.theme_select') }}
      </label>
      <Button
        html-type="button"
        type="default"
        class="theme-panel__upload-btn"
        @click="handleUploadTheme"
      >
        📤 {{ t('card_settings.theme_upload') }}
      </Button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="theme-panel__loading">
      <span class="chips-loading-spinner" aria-label="Loading" />
      <span class="theme-panel__loading-text">
        {{ t('card_settings.theme_loading') }}
      </span>
    </div>

    <!-- 主题网格 -->
    <div v-else class="theme-panel__grid">
      <button
        v-for="theme in themes"
        :key="theme.id"
        type="button"
        :class="[
          'theme-panel__item',
          { 'theme-panel__item--selected': selectedTheme === theme.id },
        ]"
        @click="selectTheme(theme.id)"
      >
        <span class="theme-panel__item-preview" />
        <span class="theme-panel__item-name">{{ theme.name }}</span>
        <span
          v-if="selectedTheme === theme.id"
          class="theme-panel__item-check"
          aria-hidden="true"
        >
          ✓
        </span>
      </button>
    </div>

    <!-- 提示信息（仅当只有一个主题时显示） -->
    <div
      v-if="themes.length <= 1 && !isLoading"
      role="alert"
      class="chips-alert chips-alert--warning theme-panel__hint"
    >
      <span class="chips-alert__icon theme-panel__hint-icon">💡</span>
      <span class="chips-alert__message">{{ t('card_settings.theme_hint') }}</span>
    </div>
  </div>
</template>

<style scoped>
.theme-panel {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-lg, 20px);
}

.theme-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-panel__label {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

.theme-panel__upload-btn {
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 16px);
  border: 1px dashed var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text, #111827);
  cursor: pointer;
  transition: border-color var(--chips-transition-fast, 150ms ease),
    background-color var(--chips-transition-fast, 150ms ease);
}

.theme-panel__upload-btn:hover {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 5%, transparent);
}

/* 加载状态 */
.theme-panel__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
}

.theme-panel__loading-text {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
}

/* 主题网格 */
.theme-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--chips-spacing-md, 16px);
}

.theme-panel__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  border: 2px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
  cursor: pointer;
  position: relative;
  transition: border-color var(--chips-transition-fast, 150ms ease),
    background-color var(--chips-transition-fast, 150ms ease);
}

.theme-panel__item:hover {
  border-color: color-mix(in srgb, var(--chips-color-primary) 50%, transparent);
}

.theme-panel__item--selected {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 5%, transparent);
}

.theme-panel__item-preview {
  width: 64px;
  height: 44px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--chips-color-text) 8%, transparent),
    color-mix(in srgb, var(--chips-color-text) 4%, transparent)
  );
  border-radius: var(--chips-radius-sm, 4px);
}

.theme-panel__item-name {
  font-size: 13px;
  color: var(--chips-color-text, #111827);
  text-align: center;
}

.theme-panel__item-check {
  position: absolute;
  top: var(--chips-spacing-sm, 8px);
  right: var(--chips-spacing-sm, 8px);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--chips-color-primary, #3b82f6);
  color: #ffffff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--chips-font-weight-bold, 600);
}

/* Alert native replacement styles */
.theme-panel__hint.chips-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  background: color-mix(in srgb, var(--chips-color-warning) 8%, transparent);
  border-radius: var(--chips-radius-md, 8px);
  border: none;
}

.theme-panel__hint .chips-alert__message {
  font-size: 13px;
  color: var(--chips-color-text-secondary, #6b7280);
  line-height: 1.5;
}

.theme-panel__hint-icon {
  font-size: 16px;
  line-height: 1;
}
</style>
