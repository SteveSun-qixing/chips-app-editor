<script setup lang="ts">
/**
 * 拖放预览组件
 * @module components/card-box-library/DragPreview
 * @description 拖放过程中显示的预览
 */

import { computed } from 'vue';
import type { DragData } from './types';
import { cardTypes, layoutTypes } from './data';
import { t } from '@/services/i18n-service';

interface Props {
  /** 拖放数据 */
  data: DragData;
  /** 位置 */
  position: { x: number; y: number };
}

const props = defineProps<Props>();

/** 获取预览信息 */
const previewInfo = computed(() => {
  const dragData = props.data;

  if (dragData.type === 'workspace-file') {
    return {
      icon: dragData.fileType === 'card' ? '🃏' : '📦',
      name: dragData.name,
      hintType: dragData.fileType === 'card' ? t('common.card') : t('common.box'),
    };
  }

  const typeInfo = dragData.type === 'card'
    ? cardTypes.find((type) => type.id === dragData.typeId)
    : layoutTypes.find((type) => type.id === dragData.typeId);

  if (!typeInfo) return null;

  return {
    icon: typeInfo.icon,
    name: t(typeInfo.name),
    hintType: dragData.type === 'card' ? t('common.card') : t('common.box'),
  };
});

/** 预览样式 */
const previewStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}));
</script>

<template>
  <div
    v-if="previewInfo"
    class="drag-preview"
    :style="previewStyle"
  >
    <div class="drag-preview__card">
      <span class="drag-preview__icon">{{ previewInfo.icon }}</span>
      <span class="drag-preview__name">{{ previewInfo.name }}</span>
    </div>
    <div class="drag-preview__hint">
      {{ t('drag_preview.hint', { type: previewInfo.hintType }) }}
    </div>
  </div>
</template>

<style scoped>
.drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -100%) translateY(-10px);
}

.drag-preview__card {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 12px) var(--chips-spacing-lg, 16px);
  background-color: var(--chips-color-bg-base, #fff);
  border-radius: var(--chips-border-radius-base, 8px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
  border: 2px solid var(--chips-color-primary, #1890ff);
}

.drag-preview__icon {
  font-size: var(--chips-font-size-xl, 24px);
}

.drag-preview__name {
  font-size: var(--chips-font-size-md, 16px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.drag-preview__hint {
  margin-top: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-primary, #1890ff);
  color: white;
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-xs, 12px);
  text-align: center;
}
</style>
