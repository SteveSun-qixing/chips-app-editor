<script setup lang="ts">
/**
 * 侧边面板组件
 * @module layouts/workbench/SidePanel
 * @description 可调整宽度、支持收起/展开的侧边面板
 */

import { ref, computed, watch, onUnmounted } from 'vue';
import { Button } from '@chips/components';
import { t } from '@/services/i18n-service';

/** 面板位置类型 */
export type SidePanelPosition = 'left' | 'right';

interface Props {
  /** 面板位置 */
  position?: SidePanelPosition;
  /** 面板宽度 */
  width?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 是否展开 */
  expanded?: boolean;
  /** 面板标题 */
  title?: string;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 收起后的宽度 */
  collapsedWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'left',
  width: 280,
  minWidth: 180,
  maxWidth: 480,
  expanded: true,
  title: '',
  resizable: true,
  collapsedWidth: 40,
});

const emit = defineEmits<{
  /** 宽度变化 */
  'update:width': [width: number];
  /** 展开状态变化 */
  'update:expanded': [expanded: boolean];
  /** 调整大小开始 */
  'resize-start': [];
  /** 调整大小结束 */
  'resize-end': [width: number];
}>();

/** 当前宽度 */
const currentWidth = ref(props.width);

/** 是否正在调整大小 */
const isResizing = ref(false);

/** 调整大小时的起始位置 */
const resizeStartX = ref(0);

/** 调整大小时的起始宽度 */
const resizeStartWidth = ref(0);

/** 面板是否展开 */
const isExpanded = ref(props.expanded);

/** 面板容器引用 */
const panelRef = ref<HTMLElement | null>(null);

/** 计算实际显示宽度 */
const displayWidth = computed(() => {
  return isExpanded.value ? currentWidth.value : props.collapsedWidth;
});

/** 面板样式 */
const panelStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  '--panel-width': `${displayWidth.value}px`,
}));

/** 面板类名 */
const panelClass = computed(() => ({
  'side-panel': true,
  [`side-panel--${props.position}`]: true,
  'side-panel--expanded': isExpanded.value,
  'side-panel--collapsed': !isExpanded.value,
  'side-panel--resizing': isResizing.value,
}));

/** 调整手柄类名 */
const handleClass = computed(() => ({
  'side-panel__resize-handle': true,
  [`side-panel__resize-handle--${props.position === 'left' ? 'right' : 'left'}`]: true,
}));

/**
 * 切换展开状态
 */
function toggleExpand(): void {
  isExpanded.value = !isExpanded.value;
  emit('update:expanded', isExpanded.value);
}

/**
 * 展开面板
 */
function expand(): void {
  if (!isExpanded.value) {
    isExpanded.value = true;
    emit('update:expanded', true);
  }
}

/**
 * 收起面板
 */
function collapse(): void {
  if (isExpanded.value) {
    isExpanded.value = false;
    emit('update:expanded', false);
  }
}

/**
 * 设置宽度
 * @param width - 新宽度
 */
function setWidth(width: number): void {
  const clampedWidth = Math.max(props.minWidth, Math.min(props.maxWidth, width));
  currentWidth.value = clampedWidth;
  emit('update:width', clampedWidth);
}

/**
 * 开始调整大小
 * @param e - 鼠标事件
 */
function handleResizeStart(e: MouseEvent): void {
  if (!props.resizable || !isExpanded.value) return;

  e.preventDefault();
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = currentWidth.value;

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';

  emit('resize-start');
}

/**
 * 调整大小中
 * @param e - 鼠标事件
 */
function handleResizeMove(e: MouseEvent): void {
  if (!isResizing.value) return;

  const deltaX = e.clientX - resizeStartX.value;
  const newWidth = props.position === 'left'
    ? resizeStartWidth.value + deltaX
    : resizeStartWidth.value - deltaX;

  setWidth(newWidth);
}

/**
 * 结束调整大小
 */
function handleResizeEnd(): void {
  if (!isResizing.value) return;

  isResizing.value = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  emit('resize-end', currentWidth.value);
}

/**
 * 处理双击调整手柄（重置为默认宽度）
 */
function handleResizeDoubleClick(): void {
  setWidth(props.width);
}

// 监听 props.width 变化
watch(() => props.width, (newWidth) => {
  if (!isResizing.value) {
    currentWidth.value = newWidth;
  }
});

// 监听 props.expanded 变化
watch(() => props.expanded, (newExpanded) => {
  isExpanded.value = newExpanded;
});

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
});

// 暴露方法
defineExpose({
  isExpanded,
  currentWidth,
  expand,
  collapse,
  toggleExpand,
  setWidth,
});
</script>

<template>
  <aside
    ref="panelRef"
    :class="panelClass"
    :style="panelStyle"
    role="complementary"
    :aria-expanded="isExpanded"
    :aria-label="title || t(position === 'left' ? 'side_panel.left' : 'side_panel.right')"
  >
    <!-- 面板头部 -->
    <header v-if="title || $slots.header" class="side-panel__header">
      <slot name="header">
        <span class="side-panel__title">{{ title }}</span>
      </slot>
      <Button
        html-type="button"
        type="text"
        class="side-panel__toggle"
        :aria-label="isExpanded ? t('side_panel.collapse') : t('side_panel.expand')"
        @click="toggleExpand"
      >
        <span class="side-panel__toggle-icon">
          {{ isExpanded ? (position === 'left' ? '◀' : '▶') : (position === 'left' ? '▶' : '◀') }}
        </span>
      </Button>
    </header>

    <!-- 面板内容 -->
    <div v-show="isExpanded" class="side-panel__content">
      <slot></slot>
    </div>

    <!-- 收起状态时的触发区域 -->
    <div
      v-if="!isExpanded"
      class="side-panel__collapsed-trigger"
      role="button"
      tabindex="0"
      :aria-label="t('side_panel.expand')"
      @click="expand"
      @keydown.enter="expand"
      @keydown.space.prevent="expand"
    >
      <span class="side-panel__collapsed-icon">
        {{ position === 'left' ? '▶' : '◀' }}
      </span>
    </div>

    <!-- 调整大小手柄 -->
    <div
      v-if="resizable && isExpanded"
      :class="handleClass"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="currentWidth"
      :aria-valuemin="minWidth"
      :aria-valuemax="maxWidth"
      tabindex="0"
      @mousedown="handleResizeStart"
      @dblclick="handleResizeDoubleClick"
    ></div>
  </aside>
</template>

<style scoped>
/* ==================== 面板容器 ==================== */
.side-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--chips-color-surface, #ffffff);
  transition: width var(--chips-transition-medium, 0.25s) ease;
  overflow: hidden;
  flex-shrink: 0;
}

.side-panel--left {
  border-right: 1px solid var(--chips-color-border, #e0e0e0);
}

.side-panel--right {
  border-left: 1px solid var(--chips-color-border, #e0e0e0);
}

.side-panel--resizing {
  transition: none;
  user-select: none;
}

.side-panel--collapsed {
  cursor: pointer;
}

/* ==================== 头部 ==================== */
.side-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
  flex-shrink: 0;
  min-height: 40px;
}

.side-panel__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-semibold, 600);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-panel__toggle {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
  flex-shrink: 0;
}

.side-panel__toggle:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.side-panel__toggle:focus-visible {
  outline: 2px solid var(--chips-color-primary, #3b82f6);
  outline-offset: 2px;
}

.side-panel__toggle-icon {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666666);
}

/* ==================== 内容区 ==================== */
.side-panel__content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/* ==================== 收起状态 ==================== */
.side-panel__collapsed-trigger {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
}

.side-panel__collapsed-trigger:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.side-panel__collapsed-trigger:focus-visible {
  outline: 2px solid var(--chips-color-primary, #3b82f6);
  outline-offset: -2px;
}

.side-panel__collapsed-icon {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
}

/* ==================== 调整大小手柄 ==================== */
.side-panel__resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
  z-index: 10;
}

.side-panel__resize-handle--right {
  right: -2px;
}

.side-panel__resize-handle--left {
  left: -2px;
}

.side-panel__resize-handle:hover,
.side-panel--resizing .side-panel__resize-handle {
  background: var(--chips-color-primary, #3b82f6);
}

.side-panel__resize-handle:focus-visible {
  background: var(--chips-color-primary, #3b82f6);
  outline: none;
}
</style>
