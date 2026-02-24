<script setup lang="ts">
/**
 * 工具窗口基础组件
 * @module components/window/BaseWindow
 * @description 提供工具窗口的基础功能（固定大小，收起时只显示标题栏）
 */

import { ref, computed, onUnmounted } from 'vue';
import { Button } from '@chips/components';
import type { WindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';

interface Props {
  /** 窗口配置 */
  config: WindowConfig;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可缩放 */
  resizable?: boolean;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  draggable: true,
  resizable: true,
  minWidth: 200,
  minHeight: 100,
});

const emit = defineEmits<{
  /** 位置更新 */
  'update:position': [position: WindowPosition];
  /** 大小更新 */
  'update:size': [size: WindowSize];
  /** 窗口聚焦 */
  focus: [];
  /** 窗口关闭 */
  close: [];
  /** 窗口最小化 */
  minimize: [];
  /** 窗口收起/展开 */
  collapse: [];
}>();

// 拖拽状态
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const initialPosition = ref({ x: 0, y: 0 });

// 缩放状态
const isResizing = ref(false);
const resizeStart = ref({ x: 0, y: 0 });
const initialSize = ref({ width: 0, height: 0 });

/**
 * 计算窗口样式（工具窗口）
 * - normal: 固定大小
 * - collapsed: 只显示标题栏（高度自动）
 */
const windowStyle = computed(() => ({
  transform: `translate(${props.config.position.x}px, ${props.config.position.y}px)`,
  width: `${props.config.size.width}px`,
  height: props.config.state === 'collapsed' ? 'auto' : `${props.config.size.height}px`,
  zIndex: props.config.zIndex,
}));

/**
 * 窗口类名计算
 */
const windowClass = computed(() => ({
  'base-window': true,
  'base-window--dragging': isDragging.value,
  'base-window--resizing': isResizing.value,
  'base-window--minimized': props.config.state === 'minimized',
  'base-window--collapsed': props.config.state === 'collapsed',
  'base-window--focused': true, // TODO: 从 store 获取焦点状态
}));

/**
 * 开始拖拽
 */
function handleDragStart(e: MouseEvent): void {
  // 忽略来自按钮的点击
  if ((e.target as HTMLElement).closest('.base-window__action')) {
    return;
  }
  
  if (!props.draggable) return;

  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  initialPosition.value = { ...props.config.position };

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  
  // 防止文本选择
  e.preventDefault();
}

/**
 * 拖拽移动
 */
function handleDragMove(e: MouseEvent): void {
  if (!isDragging.value) return;

  const deltaX = e.clientX - dragStart.value.x;
  const deltaY = e.clientY - dragStart.value.y;

  emit('update:position', {
    x: initialPosition.value.x + deltaX,
    y: initialPosition.value.y + deltaY,
  });
}

/**
 * 拖拽结束
 */
function handleDragEnd(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
}

/**
 * 开始缩放
 */
function handleResizeStart(e: MouseEvent): void {
  if (!props.resizable) return;

  e.stopPropagation();
  isResizing.value = true;
  resizeStart.value = { x: e.clientX, y: e.clientY };
  initialSize.value = { ...props.config.size };

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  
  // 防止文本选择
  e.preventDefault();
}

/**
 * 缩放移动
 */
function handleResizeMove(e: MouseEvent): void {
  if (!isResizing.value) return;

  const deltaX = e.clientX - resizeStart.value.x;
  const deltaY = e.clientY - resizeStart.value.y;

  emit('update:size', {
    width: Math.max(props.minWidth, initialSize.value.width + deltaX),
    height: Math.max(props.minHeight, initialSize.value.height + deltaY),
  });
}

/**
 * 缩放结束
 */
function handleResizeEnd(): void {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
}

/**
 * 聚焦窗口
 */
function handleFocus(): void {
  emit('focus');
}

/**
 * 处理关闭
 */
function handleClose(): void {
  emit('close');
}

/**
 * 处理最小化
 */
function handleMinimize(): void {
  emit('minimize');
}

/**
 * 处理收起/展开
 */
function handleCollapse(): void {
  emit('collapse');
}

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
});

// 暴露方法给父组件
defineExpose({
  isDragging,
  isResizing,
});
</script>

<template>
  <div
    :class="windowClass"
    :style="windowStyle"
    @mousedown="handleFocus"
  >
    <!-- 标题栏 -->
    <div
      class="base-window__header"
      @mousedown="handleDragStart"
    >
      <slot name="header">
        <span class="base-window__title">{{ config.title }}</span>
      </slot>

      <div class="base-window__actions">
        <slot name="actions">
          <Button
            v-if="config.minimizable !== false"
            class="base-window__action base-window__action--minimize"
            html-type="button"
            type="text"
            :aria-label="t('window.minimize')"
            @click.stop="handleMinimize"
          >
            <span class="base-window__action-icon">−</span>
          </Button>
          <Button
            class="base-window__action base-window__action--collapse"
            html-type="button"
            type="text"
            :aria-label="config.state === 'collapsed' ? t('window.expand') : t('window.collapse')"
            @click.stop="handleCollapse"
          >
            <span class="base-window__action-icon">{{ config.state === 'collapsed' ? '▽' : '△' }}</span>
          </Button>
          <Button
            v-if="config.closable !== false"
            class="base-window__action base-window__action--close"
            html-type="button"
            type="text"
            :aria-label="t('window.close')"
            @click.stop="handleClose"
          >
            <span class="base-window__action-icon">×</span>
          </Button>
        </slot>
      </div>
    </div>

    <!-- 内容区（收起时隐藏） -->
    <div
      v-show="config.state !== 'collapsed'"
      class="base-window__content"
    >
      <slot></slot>
    </div>

    <!-- 缩放手柄 -->
    <div
      v-if="resizable && config.state === 'normal'"
      class="base-window__resize-handle"
      @mousedown="handleResizeStart"
    ></div>
  </div>
</template>

<style scoped>
.base-window {
  position: absolute;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-md, 8px);
  border: 1px solid var(--chips-color-border-light, #e5e7eb);
  box-shadow: var(--chips-shadow-window, 0 8px 24px -4px rgba(0, 0, 0, 0.14));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow var(--chips-transition-fast, 0.15s) ease,
              border-color var(--chips-transition-fast, 0.15s) ease;
}

.base-window--dragging {
  cursor: grabbing;
  user-select: none;
  box-shadow: var(--chips-shadow-xl, 0 20px 30px -5px rgba(0, 0, 0, 0.18));
  border-color: var(--chips-color-primary-light, #3b82f6);
}

.base-window--resizing {
  user-select: none;
}

.base-window--minimized {
  display: none;
}

.base-window--focused {
  box-shadow: var(--chips-shadow-window-focused, 0 12px 32px -4px rgba(0, 0, 0, 0.18));
}

.base-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background: var(--chips-color-surface-variant, #f7f8fa);
  border-bottom: 1px solid var(--chips-color-border-light, #e5e7eb);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}

.base-window--dragging .base-window__header {
  cursor: grabbing;
}

.base-window__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.base-window__actions {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  margin-left: var(--chips-spacing-sm, 8px);
  flex-shrink: 0;
}

.base-window__action {
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
  transition: background-color var(--chips-transition-fast, 0.15s) ease,
              color var(--chips-transition-fast, 0.15s) ease;
}

.base-window__action-icon {
  font-size: var(--chips-font-size-md, 16px);
  line-height: 1;
  color: var(--chips-color-text-secondary, #475569);
}

.base-window__action:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.06));
}

.base-window__action:hover .base-window__action-icon {
  color: var(--chips-color-text, #0f172a);
}

.base-window__action--close:hover {
  background: var(--chips-color-error, #ef4444);
}

.base-window__action--close:hover .base-window__action-icon {
  color: var(--chips-color-on-error, #ffffff);
}

.base-window__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.base-window__resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
}

.base-window__resize-handle::after {
  content: '';
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--chips-color-border, #e0e0e0);
  border-bottom: 2px solid var(--chips-color-border, #e0e0e0);
}

.base-window__resize-handle:hover::after {
  border-color: var(--chips-color-primary, #3b82f6);
}
</style>
