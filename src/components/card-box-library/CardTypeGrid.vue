<script setup lang="ts">
/**
 * 卡片类型网格组件
 * @module components/card-box-library/CardTypeGrid
 * @description 基础卡片类型网格，支持拖放
 */

import { computed } from 'vue';
import type { CardTypeDefinition, DragData } from './types';
import { cardTypes as allCardTypes } from './data';
import { t } from '@/services/i18n-service';

interface Props {
  /** 卡片类型列表（可选，用于搜索过滤后的结果） */
  types?: CardTypeDefinition[];
}

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
  /** 拖放开始 */
  dragStart: [data: DragData, event: DragEvent];
}>();

/** 获取类型列表 */
const displayTypes = computed(() => props.types ?? allCardTypes);

/**
 * 处理拖放开始
 */
function handleDragStart(type: CardTypeDefinition, event: DragEvent): void {
  const data: DragData = {
    type: 'card',
    typeId: type.id,
    name: t(type.name),
  };

  emit('dragStart', data, event);
}
</script>

<template>
  <div class="card-type-grid">
    <div class="card-type-grid__items">
      <div
        v-for="type in displayTypes"
        :key="type.id"
        class="card-type-grid__item"
        draggable="true"
        :title="t(type.description)"
        @dragstart="handleDragStart(type, $event)"
      >
        <span class="card-type-grid__item-icon">{{ type.icon }}</span>
        <span class="card-type-grid__item-name">{{ t(type.name) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-type-grid {
  display: flex;
  flex-direction: column;
}

.card-type-grid__items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--chips-spacing-sm, 8px);
}

.card-type-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px);
  border-radius: var(--chips-border-radius-base, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.card-type-grid__item:hover {
  background-color: var(--chips-color-bg-hover, #e8e8e8);
  transform: translateY(-1px);
  box-shadow: var(--chips-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.card-type-grid__item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.card-type-grid__item-icon {
  font-size: var(--chips-font-size-xl, 24px);
}

.card-type-grid__item-name {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
