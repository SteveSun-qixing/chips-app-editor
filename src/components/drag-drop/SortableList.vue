<script setup lang="ts">
/**
 * 可排序列表组件
 * @module components/drag-drop/SortableList
 * @description 支持拖拽排序的列表容器
 */

import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue';
import { useCardSort, type BaseCardDragData } from '@/core';
import InsertIndicator from './InsertIndicator.vue';

interface SortableItem {
  /** 项目 ID */
  id: string;
  /** 项目类型 */
  type?: string;
  /** 附加数据 */
  data?: unknown;
}

const props = withDefaults(
  defineProps<{
    /** 项目列表 */
    items: SortableItem[];
    /** 容器 ID */
    containerId: string;
    /** 排列方向 */
    direction?: 'horizontal' | 'vertical';
    /** 是否禁用 */
    disabled?: boolean;
    /** 项目高度/宽度（用于计算插入位置） */
    itemSize?: number;
    /** 间距 */
    gap?: number;
  }>(),
  {
    direction: 'vertical',
    disabled: false,
    itemSize: 0,
    gap: 8,
  }
);

const emit = defineEmits<{
  /** 排序完成事件 */
  sort: [from: number, to: number];
  /** 开始拖动事件 */
  dragStart: [item: SortableItem, index: number];
  /** 结束拖动事件 */
  dragEnd: [success: boolean];
}>();

// 排序 Hook
const { isSorting, draggedCard, insertIndex, startSort, updateInsertIndex, endSort, cancelSort } =
  useCardSort();

// 容器引用
const containerRef = ref<HTMLElement | null>(null);

// 项目元素引用
const itemRefs = ref<Map<string, HTMLElement>>(new Map());

// 本地拖动状态
const localDragging = ref(false);
const localDragIndex = ref(-1);

/** 是否处于排序状态 */
const isActive = computed(() => {
  return (
    isSorting.value &&
    draggedCard.value?.cardId === props.containerId
  );
});

/** 指示线位置 */
const indicatorPosition = computed(() => {
  if (!isActive.value || insertIndex.value < 0) return 0;

  const idx = insertIndex.value;
  if (props.itemSize > 0) {
    return idx * (props.itemSize + props.gap);
  }

  // 动态计算位置
  const items = Array.from(itemRefs.value.values());
  if (items.length === 0) return 0;

  if (idx >= items.length) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      const rect = lastItem.getBoundingClientRect();
      const containerRect = containerRef.value?.getBoundingClientRect();
      if (containerRect) {
        return props.direction === 'vertical'
          ? rect.bottom - containerRect.top + props.gap / 2
          : rect.right - containerRect.left + props.gap / 2;
      }
    }
    return 0;
  }

  const targetItem = items[idx];
  if (targetItem) {
    const rect = targetItem.getBoundingClientRect();
    const containerRect = containerRef.value?.getBoundingClientRect();
    if (containerRect) {
      return props.direction === 'vertical'
        ? rect.top - containerRect.top - props.gap / 2
        : rect.left - containerRect.left - props.gap / 2;
    }
  }

  return 0;
});

/**
 * 注册项目元素
 */
function registerItemRef(id: string, el: HTMLElement | null): void {
  if (el) {
    itemRefs.value.set(id, el);
  } else {
    itemRefs.value.delete(id);
  }
}

/**
 * 计算插入索引
 */
function calculateInsertIndex(clientX: number, clientY: number): number {
  const items = Array.from(itemRefs.value.entries());
  if (items.length === 0) return 0;

  for (let i = 0; i < items.length; i++) {
    const [, el] = items[i] || [null, null];
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    const mid = props.direction === 'vertical'
      ? rect.top + rect.height / 2
      : rect.left + rect.width / 2;

    const pos = props.direction === 'vertical' ? clientY : clientX;

    if (pos < mid) {
      return i;
    }
  }

  return items.length;
}

/**
 * 开始拖动项目
 */
function handleDragStart(event: DragEvent, item: SortableItem, index: number): void {
  if (props.disabled) return;

  event.stopPropagation();

  // 设置拖动数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);

    // 设置透明拖动图片
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    event.dataTransfer.setDragImage(img, 0, 0);
  }

  // 开始排序
  const sortData: BaseCardDragData = {
    cardId: props.containerId,
    baseCardId: item.id,
    baseCardType: item.type || 'unknown',
    originalIndex: index,
  };

  startSort(sortData);
  localDragging.value = true;
  localDragIndex.value = index;

  emit('dragStart', item, index);
}

/**
 * 拖动悬停
 */
function handleDragOver(event: DragEvent): void {
  if (!isActive.value || props.disabled) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  // 计算插入位置
  const newIndex = calculateInsertIndex(event.clientX, event.clientY);
  updateInsertIndex(newIndex);
}

/**
 * 拖动离开
 */
function handleDragLeave(event: DragEvent): void {
  // 检查是否真的离开了容器
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget && containerRef.value?.contains(relatedTarget)) {
    return;
  }
}

/**
 * 拖动结束
 */
function handleDragEnd(event: DragEvent): void {
  event.stopPropagation();

  localDragging.value = false;
  localDragIndex.value = -1;

  const result = endSort();
  if (result) {
    emit('sort', result.from, result.to);
    emit('dragEnd', true);
  } else {
    emit('dragEnd', false);
  }
}

/**
 * 放置
 */
function handleDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();

  // 结束处理由 dragEnd 事件处理
}

// 键盘取消
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isActive.value) {
    cancelSort();
    localDragging.value = false;
    localDragIndex.value = -1;
    emit('dragEnd', false);
  }
}

// 注册键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// 提供给子组件
provide('sortable', {
  registerItemRef,
  isActive,
  localDragIndex,
});

// 监听排序完成
watch(isSorting, (newVal, oldVal) => {
  if (!newVal && oldVal) {
    localDragging.value = false;
    localDragIndex.value = -1;
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="sortable-list"
    :class="{
      'sortable-list--horizontal': direction === 'horizontal',
      'sortable-list--vertical': direction === 'vertical',
      'sortable-list--sorting': isActive,
      'sortable-list--disabled': disabled,
    }"
    :style="{ gap: `${gap}px` }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 项目插槽 -->
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="sortable-list__item"
      :class="{
        'sortable-list__item--dragging': localDragging && localDragIndex === index,
      }"
      draggable="true"
      @dragstart="(e) => handleDragStart(e, item, index)"
      @dragend="handleDragEnd"
    >
      <slot :item="item" :index="index" :is-dragging="localDragging && localDragIndex === index">
        {{ item.id }}
      </slot>
    </div>

    <!-- 插入指示线 -->
    <InsertIndicator
      :visible="isActive && insertIndex >= 0"
      :position="indicatorPosition"
      :direction="direction === 'vertical' ? 'horizontal' : 'vertical'"
    />
  </div>
</template>

<style scoped>
.sortable-list {
  position: relative;
  display: flex;
  flex-wrap: wrap;
}

.sortable-list--vertical {
  flex-direction: column;
}

.sortable-list--horizontal {
  flex-direction: row;
}

.sortable-list--disabled {
  pointer-events: none;
  opacity: 0.6;
}

.sortable-list__item {
  cursor: grab;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sortable-list__item:active {
  cursor: grabbing;
}

.sortable-list__item--dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.sortable-list--sorting .sortable-list__item:not(.sortable-list__item--dragging) {
  transition: transform 0.2s ease;
}
</style>
