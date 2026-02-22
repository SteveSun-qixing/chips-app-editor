<script setup lang="ts">
/**
 * 布局类型网格组件
 * @module components/card-box-library/LayoutTypeGrid
 * @description 箱子布局类型网格，支持拖放
 */

import { computed } from 'vue';
import type { LayoutTypeDefinition, DragData } from './types';
import { layoutTypes as allLayoutTypes } from './data';
import { t } from '@/services/i18n-service';

interface Props {
  /** 布局类型列表（可选，用于搜索过滤后的结果） */
  types?: LayoutTypeDefinition[];
}

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
  /** 拖放开始 */
  dragStart: [data: DragData, event: DragEvent];
}>();

/** 获取类型列表 */
const displayTypes = computed(() => props.types ?? allLayoutTypes);

/**
 * 处理拖放开始
 */
function handleDragStart(type: LayoutTypeDefinition, event: DragEvent): void {
  const data: DragData = {
    type: 'layout',
    typeId: type.id,
    name: t(type.name),
  };

  emit('dragStart', data, event);
}
</script>

<template>
  <div class="layout-type-grid">
    <div class="layout-type-grid__items">
      <div
        v-for="type in displayTypes"
        :key="type.id"
        class="layout-type-grid__item"
        draggable="true"
        :title="t(type.description)"
        @dragstart="handleDragStart(type, $event)"
      >
        <span class="layout-type-grid__item-icon">{{ type.icon }}</span>
        <div class="layout-type-grid__item-info">
          <span class="layout-type-grid__item-name">{{ t(type.name) }}</span>
          <span class="layout-type-grid__item-desc">{{ t(type.description) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-type-grid {
  display: flex;
  flex-direction: column;
}

.layout-type-grid__items {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.layout-type-grid__item {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  border-radius: var(--chips-border-radius-base, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.layout-type-grid__item:hover {
  background-color: var(--chips-color-bg-hover, #e8e8e8);
  transform: translateX(2px);
  box-shadow: var(--chips-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.layout-type-grid__item:active {
  cursor: grabbing;
  transform: translateX(0);
}

.layout-type-grid__item-icon {
  font-size: var(--chips-font-size-xl, 24px);
  flex-shrink: 0;
}

.layout-type-grid__item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.layout-type-grid__item-name {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.layout-type-grid__item-desc {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
