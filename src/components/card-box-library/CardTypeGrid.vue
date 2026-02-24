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
  gap: 6px;
  padding: 10px 6px;
  border-radius: var(--chips-border-radius-base, 8px);
  border: 1px solid var(--chips-color-border-light, #e5e7eb);
  background-color: var(--chips-color-surface, #ffffff);
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.card-type-grid__item:hover {
  background-color: var(--chips-color-primary-subtle, rgba(37, 99, 235, 0.06));
  border-color: var(--chips-color-primary-light, rgba(59, 130, 246, 0.35));
  transform: translateY(-1px);
  box-shadow: var(--chips-shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.08));
}

.card-type-grid__item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.card-type-grid__item-icon {
  font-size: 28px;
  line-height: 1;
}

.card-type-grid__item-name {
  font-size: var(--chips-font-size-xs, 12px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-secondary, #475569);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.card-type-grid__item:hover .card-type-grid__item-name {
  color: var(--chips-color-primary, #2563eb);
}
</style>
