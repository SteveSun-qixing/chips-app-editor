<script setup lang="ts">
/**
 * 布局切换器组件
 * @module layouts/LayoutSwitcher
 * @description 提供布局切换的 UI 控件
 */

import { computed } from 'vue';
import { Button } from '@chips/components';
import { useLayoutSwitch } from './use-layout-switch';
import type { LayoutType } from '@/types';
import { t } from '@/services/i18n-service';

interface Props {
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showLabel: true,
  disabled: false,
});

const emit = defineEmits<{
  /** 布局切换前 */
  'before-switch': [from: LayoutType, to: LayoutType];
  /** 布局切换后 */
  'after-switch': [from: LayoutType, to: LayoutType];
}>();

const {
  currentLayout,
  isSwitching,
  isInfiniteCanvas,
  isWorkbench,
  toggleLayout,
} = useLayoutSwitch({
  enableTransition: true,
  transitionDuration: 300,
  preserveCardState: true,
  onBeforeSwitch: (from, to) => {
    emit('before-switch', from, to);
  },
  onAfterSwitch: (from, to) => {
    emit('after-switch', from, to);
  },
});

/** 按钮类名 */
const buttonClass = computed(() => ({
  'layout-switcher__button': true,
  [`layout-switcher__button--${props.size}`]: true,
  'layout-switcher__button--switching': isSwitching.value,
}));

/** 当前布局图标 */
const currentIcon = computed(() => {
  return isInfiniteCanvas.value ? '🎨' : '📋';
});

/** 当前布局标签 */
const currentLabel = computed(() => {
  return isInfiniteCanvas.value ? t('layout_switcher.canvas') : t('layout_switcher.workbench');
});

/** 目标布局标签 */
const targetLabel = computed(() => {
  return isInfiniteCanvas.value ? t('layout_switcher.to_workbench') : t('layout_switcher.to_canvas');
});

/**
 * 处理点击事件
 */
async function handleClick(): Promise<void> {
  if (props.disabled || isSwitching.value) return;
  await toggleLayout();
}

/**
 * 处理键盘事件
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
}
</script>

<template>
  <div class="layout-switcher">
    <!-- 布局切换按钮 -->
    <Button
      :class="buttonClass"
      :disabled="disabled || isSwitching"
      :aria-label="targetLabel"
      :aria-pressed="isWorkbench"
      :title="targetLabel"
      html-type="button"
      type="default"
      @click="handleClick"
      @keydown="handleKeyDown"
    >
      <span class="layout-switcher__icon">{{ currentIcon }}</span>
      <span v-if="showLabel" class="layout-switcher__label">{{ currentLabel }}</span>
      <span v-if="isSwitching" class="layout-switcher__spinner"></span>
    </Button>

    <!-- 布局选项（下拉） -->
    <div v-if="$slots.options" class="layout-switcher__options">
      <slot name="options" :current="currentLayout" :switching="isSwitching"></slot>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 切换器容器 ==================== */
.layout-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* ==================== 切换按钮 ==================== */
.layout-switcher__button {
  display: inline-flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-md, 6px);
  background: var(--chips-color-surface, #ffffff);
  cursor: pointer;
  transition: all var(--chips-transition-fast, 0.15s) ease;
  user-select: none;
}

.layout-switcher__button:hover:not(:disabled) {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
  border-color: var(--chips-color-primary, #3b82f6);
}

.layout-switcher__button:focus-visible {
  outline: 2px solid var(--chips-color-primary, #3b82f6);
  outline-offset: 2px;
}

.layout-switcher__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layout-switcher__button--switching {
  pointer-events: none;
}

/* 尺寸变体 */
.layout-switcher__button--small {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-xs, 4px);
  font-size: var(--chips-font-size-xs, 12px);
}

.layout-switcher__button--medium {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  font-size: var(--chips-font-size-sm, 14px);
}

.layout-switcher__button--large {
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-md, 16px);
}

/* ==================== 图标 ==================== */
.layout-switcher__icon {
  font-size: 1.2em;
  line-height: 1;
}

/* ==================== 标签 ==================== */
.layout-switcher__label {
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
}

/* ==================== 加载动画 ==================== */
.layout-switcher__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--chips-color-border, #e0e0e0);
  border-top-color: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  animation: layout-switcher-spin 0.6s linear infinite;
}

@keyframes layout-switcher-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==================== 选项下拉 ==================== */
.layout-switcher__options {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--chips-spacing-xs, 4px);
  z-index: 100;
}
</style>

<style>
/* 全局过渡样式 */
.layout-transitioning {
  overflow: hidden;
}

.layout-transitioning * {
  transition: opacity var(--chips-transition-medium, 0.25s) ease,
              transform var(--chips-transition-medium, 0.25s) ease !important;
}
</style>
