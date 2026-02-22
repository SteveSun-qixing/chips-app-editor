<script setup lang="ts">
/**
 * CoverPanel 封面设置面板
 * @module components/card-settings/panels/CoverPanel
 *
 * 负责卡片封面的设置和管理
 * 使用薯片组件库，遵循主题系统规范
 */

import { Button } from '@chips/components';
import { t } from '@/services/i18n-service';

const emit = defineEmits<{
  /** 打开封面制作器 */
  openCoverMaker: [];
}>();

/**
 * 打开封面制作器
 */
function handleOpenCoverMaker(): void {
  emit('openCoverMaker');
}
</script>

<template>
  <div class="cover-panel">
    <!-- 描述说明 -->
    <p class="cover-panel__desc">
      {{ t('card_settings.cover_description') }}
    </p>

    <!-- 封面操作选项 -->
    <div class="cover-panel__options">
      <Button
        html-type="button"
        type="default"
        class="cover-panel__option-card"
        @click="handleOpenCoverMaker"
      >
        <div class="cover-panel__option-inner">
          <span class="cover-panel__option-icon" aria-hidden="true">🎨</span>
          <div class="cover-panel__option-text">
            <span class="cover-panel__option-title">
              {{ t('card_settings.cover_maker') }}
            </span>
            <span class="cover-panel__option-desc">
              {{ t('card_settings.cover_maker_desc') }}
            </span>
          </div>
        </div>
      </Button>
    </div>

    <!-- 提示信息 -->
    <div
      role="alert"
      class="chips-alert chips-alert--info cover-panel__hint"
    >
      <span class="chips-alert__icon cover-panel__hint-icon">💡</span>
      <span class="chips-alert__message">{{ t('card_settings.cover_maker_hint') }}</span>
    </div>
  </div>
</template>

<style scoped>
.cover-panel {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-lg, 20px);
}

.cover-panel__desc {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
  margin: 0;
  line-height: 1.6;
}

.cover-panel__options {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.cover-panel__option-card {
  width: 100%;
  padding: 0;
  border: 2px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
  cursor: pointer;
  transition: border-color var(--chips-transition-fast, 150ms ease),
    background-color var(--chips-transition-fast, 150ms ease);
  text-align: left;
}

.cover-panel__option-card:hover {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 3%, transparent);
}

.cover-panel__option-inner {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 20px);
}

.cover-panel__option-icon {
  font-size: 28px;
  flex-shrink: 0;
  line-height: 1;
}

.cover-panel__option-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cover-panel__option-title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

.cover-panel__option-desc {
  font-size: 13px;
  color: var(--chips-color-text-secondary, #6b7280);
}

.cover-panel__hint {
  margin-top: var(--chips-spacing-xs, 4px);
}

.cover-panel__hint-icon {
  font-size: 16px;
  line-height: 1;
}

/* Alert native replacement styles */
.cover-panel__hint.chips-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  background: color-mix(in srgb, var(--chips-color-primary) 5%, transparent);
  border-radius: var(--chips-radius-md, 8px);
  border: none;
}

.cover-panel__hint .chips-alert__message {
  font-size: 13px;
  color: var(--chips-color-text-secondary, #6b7280);
  line-height: 1.5;
}
</style>
