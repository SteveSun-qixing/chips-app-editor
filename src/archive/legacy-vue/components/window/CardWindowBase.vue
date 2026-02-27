<script setup lang="ts">
/**
 * 卡片窗口基础组件
 * @module components/window/CardWindowBase
 * @description 提供复合卡片窗口的基础功能
 * 
 * 与工具窗口的区别：
 * - 展开状态：自适应内容高度（无限长）
 * - 收起状态：固定 9:16 比例，内容可滚动
 */

import { ref, computed, onUnmounted, inject, type Ref } from 'vue';
import { Button } from '@chips/component-library';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';

interface Props {
  /** 窗口配置 */
  config: CardWindowConfig;
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

// 从 InfiniteCanvas 注入画布上下文（获取缩放比例）
const canvasContext = inject<{
  zoom: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
} | null>('canvas', null);

// 拖拽状态
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const initialPosition = ref({ x: 0, y: 0 });

// 缩放状态
const isResizing = ref(false);
const resizeStart = ref({ x: 0, y: 0 });
const initialSize = ref({ width: 0, height: 0 });

/**
 * 计算窗口样式（复合卡片窗口）
 * - normal（展开）: 自适应内容高度
 * - collapsed（收起）: 固定 9:16 竖直比例
 */
const windowStyle = computed(() => {
  const width = props.config.size.width;
  // 收起状态使用 9:16 比例计算高度（竖直卡片）
  const collapsedHeight = Math.round(width * 16 / 9);
  
  return {
    transform: `translate(${props.config.position.x}px, ${props.config.position.y}px)`,
    width: `${width}px`,
    // 展开状态自适应内容，收起状态固定 9:16 比例
    height: props.config.state === 'collapsed' ? `${collapsedHeight}px` : 'auto',
    zIndex: props.config.zIndex,
  };
});

/**
 * 窗口类名计算
 */
const windowClass = computed(() => ({
  'card-window-base': true,
  'card-window-base--dragging': isDragging.value,
  'card-window-base--resizing': isResizing.value,
  'card-window-base--minimized': props.config.state === 'minimized',
  'card-window-base--collapsed': props.config.state === 'collapsed',
  'card-window-base--normal': props.config.state === 'normal',
  'card-window-base--focused': true,
}));

/**
 * 开始拖拽
 */
function handleDragStart(e: MouseEvent): void {
  // 忽略来自按钮的点击
  if ((e.target as HTMLElement).closest('.card-window-base__action')) {
    return;
  }
  
  if (!props.draggable) return;

  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  initialPosition.value = { ...props.config.position };

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  
  e.preventDefault();
}

/**
 * 拖拽移动
 * 需要考虑缩放比例：屏幕距离 / 缩放比例 = 世界距离
 */
function handleDragMove(e: MouseEvent): void {
  if (!isDragging.value) return;

  // 获取当前缩放比例（默认为 1）
  const zoom = canvasContext?.zoom.value ?? 1;

  // 将屏幕距离转换为世界距离
  const deltaX = (e.clientX - dragStart.value.x) / zoom;
  const deltaY = (e.clientY - dragStart.value.y) / zoom;

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
  
  e.preventDefault();
}

/**
 * 缩放移动
 * 需要考虑缩放比例：屏幕距离 / 缩放比例 = 世界距离
 */
function handleResizeMove(e: MouseEvent): void {
  if (!isResizing.value) return;

  // 获取当前缩放比例（默认为 1）
  const zoom = canvasContext?.zoom.value ?? 1;

  // 将屏幕距离转换为世界距离
  const deltaX = (e.clientX - resizeStart.value.x) / zoom;

  // 卡片窗口只调整宽度
  emit('update:size', {
    width: Math.max(props.minWidth, initialSize.value.width + deltaX),
    height: props.config.size.height, // 保持原高度（实际由内容决定）
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
      class="card-window-base__header"
      @mousedown="handleDragStart"
    >
      <slot name="header">
        <span class="card-window-base__title">{{ config.title }}</span>
      </slot>

      <div class="card-window-base__actions">
        <slot name="actions">
          <Button
            v-if="config.minimizable !== false"
            class="card-window-base__action card-window-base__action--minimize"
            html-type="button"
            type="text"
            :aria-label="t('window.minimize')"
            @click.stop="handleMinimize"
          >
            <span class="card-window-base__action-icon">−</span>
          </Button>
          <Button
            class="card-window-base__action card-window-base__action--collapse"
            html-type="button"
            type="text"
            :aria-label="config.state === 'collapsed' ? t('window.expand') : t('window.collapse')"
            @click.stop="handleCollapse"
          >
            <span class="card-window-base__action-icon">{{ config.state === 'collapsed' ? '▽' : '△' }}</span>
          </Button>
          <Button
            v-if="config.closable !== false"
            class="card-window-base__action card-window-base__action--close"
            html-type="button"
            type="text"
            :aria-label="t('window.close')"
            @click.stop="handleClose"
          >
            <span class="card-window-base__action-icon">×</span>
          </Button>
        </slot>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="card-window-base__content">
      <slot></slot>
    </div>

    <!-- 缩放手柄（仅水平方向） -->
    <div
      v-if="resizable"
      class="card-window-base__resize-handle"
      @mousedown="handleResizeStart"
    ></div>
  </div>
</template>

<style scoped>
.card-window-base {
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

.card-window-base--dragging {
  cursor: grabbing;
  user-select: none;
  box-shadow: var(--chips-shadow-xl, 0 20px 30px -5px rgba(0, 0, 0, 0.18));
  border-color: var(--chips-color-primary-light, #3b82f6);
}

.card-window-base--resizing {
  user-select: none;
}

.card-window-base--minimized {
  display: none;
}

/* 收起状态 - 内容区固定高度，可滚动 */
.card-window-base--collapsed .card-window-base__content {
  flex: 1;
  overflow-y: auto;
}

/* 展开状态 - 内容自适应高度 */
.card-window-base--normal .card-window-base__content {
  /* 自动高度 */
}

.card-window-base--focused {
  box-shadow: var(--chips-shadow-window-focused, 0 12px 32px -4px rgba(0, 0, 0, 0.18));
}

.card-window-base__header {
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

.card-window-base--dragging .card-window-base__header {
  cursor: grabbing;
}

.card-window-base__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.card-window-base__actions {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  margin-left: var(--chips-spacing-sm, 8px);
  flex-shrink: 0;
}

.card-window-base__action {
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

.card-window-base__action-icon {
  font-size: var(--chips-font-size-md, 16px);
  line-height: 1;
  color: var(--chips-color-text-secondary, #475569);
}

.card-window-base__action:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.06));
}

.card-window-base__action:hover .card-window-base__action-icon {
  color: var(--chips-color-text, #0f172a);
}

.card-window-base__action--close:hover {
  background: var(--chips-color-error, #ef4444);
}

.card-window-base__action--close:hover .card-window-base__action-icon {
  color: var(--chips-color-on-error, #ffffff);
}

.card-window-base__content {
  /* 默认自动高度 */
}

.card-window-base__resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: ew-resize;
}

.card-window-base__resize-handle::after {
  content: '';
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--chips-color-border, #e0e0e0);
  border-bottom: 2px solid var(--chips-color-border, #e0e0e0);
}

.card-window-base__resize-handle:hover::after {
  border-color: var(--chips-color-primary, #3b82f6);
}
</style>
