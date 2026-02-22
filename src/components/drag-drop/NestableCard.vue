<script setup lang="ts">
/**
 * 可嵌套卡片组件
 * @module components/drag-drop/NestableCard
 * @description 支持将其他卡片拖放嵌套的卡片容器
 */

import { ref, computed } from 'vue';
import { useCardNest, type CardNestDragData } from '@/core';
import { t } from '@/services/i18n-service';
import DropHighlight from './DropHighlight.vue';

const props = withDefaults(
  defineProps<{
    /** 卡片 ID */
    cardId: string;
    /** 卡片名称 */
    cardName: string;
    /** 是否可以作为嵌套目标 */
    canBeTarget?: boolean;
    /** 是否可以被拖动嵌套到其他卡片 */
    canBeDragged?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 最大嵌套层级 */
    maxNestLevel?: number;
    /** 当前嵌套层级 */
    currentLevel?: number;
  }>(),
  {
    canBeTarget: true,
    canBeDragged: true,
    disabled: false,
    maxNestLevel: 3,
    currentLevel: 0,
  }
);

const emit = defineEmits<{
  /** 卡片嵌套事件 */
  nest: [sourceId: string];
  /** 开始拖动事件 */
  dragStart: [];
  /** 结束拖动事件 */
  dragEnd: [success: boolean];
}>();

// 嵌套 Hook
const { isNesting, draggedCard, targetCardId, canNest, startNest, setTarget, endNest, cancelNest } =
  useCardNest();

// 本地状态
const isDragOver = ref(false);
const isDraggingThis = ref(false);

/** 是否可以接受嵌套 */
const canAcceptNest = computed(() => {
  if (!props.canBeTarget || props.disabled) return false;
  if (props.currentLevel >= props.maxNestLevel - 1) return false;

  // 不能嵌套自己
  if (draggedCard.value?.cardId === props.cardId) return false;

  return true;
});

/** 是否是当前目标 */
const isCurrentTarget = computed(() => {
  return isNesting.value && targetCardId.value === props.cardId;
});

/**
 * 开始拖动
 */
function handleDragStart(event: DragEvent): void {
  if (!props.canBeDragged || props.disabled) return;

  event.stopPropagation();

  // 设置拖动数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-chips-card-nest', JSON.stringify({
      cardId: props.cardId,
      cardName: props.cardName,
    }));

    // 设置透明拖动图片
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    event.dataTransfer.setDragImage(img, 0, 0);
  }

  // 开始嵌套拖放
  const nestData: CardNestDragData = {
    cardId: props.cardId,
    cardName: props.cardName,
  };

  startNest(nestData);
  isDraggingThis.value = true;

  emit('dragStart');
}

/**
 * 拖动悬停
 */
function handleDragOver(event: DragEvent): void {
  if (!isNesting.value || !canAcceptNest.value) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = canAcceptNest.value ? 'move' : 'none';
  }
}

/**
 * 拖动进入
 */
function handleDragEnter(event: DragEvent): void {
  if (!isNesting.value) return;

  event.preventDefault();
  event.stopPropagation();

  isDragOver.value = true;
  setTarget(props.cardId, canAcceptNest.value);
}

/**
 * 拖动离开
 */
function handleDragLeave(event: DragEvent): void {
  // 检查是否真的离开了容器
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement | null;

  if (relatedTarget && currentTarget?.contains(relatedTarget)) {
    return;
  }

  isDragOver.value = false;

  if (isCurrentTarget.value) {
    setTarget(null, false);
  }
}

/**
 * 拖动结束
 */
function handleDragEnd(): void {
  isDraggingThis.value = false;

  const result = endNest();
  if (result) {
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

  isDragOver.value = false;

  if (!canAcceptNest.value || !canNest.value) {
    cancelNest();
    return;
  }

  const result = endNest();
  if (result && result.sourceId !== props.cardId) {
    emit('nest', result.sourceId);
  }
}

/**
 * 键盘取消
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isDraggingThis.value) {
    cancelNest();
    isDraggingThis.value = false;
    emit('dragEnd', false);
  }
}
</script>

<template>
  <DropHighlight
    :active="isCurrentTarget"
    :can-drop="canAcceptNest && canNest"
    type="nest"
  >
    <div
      class="nestable-card"
      :class="{
        'nestable-card--dragging': isDraggingThis,
        'nestable-card--target': isCurrentTarget,
        'nestable-card--can-accept': canAcceptNest && isDragOver,
        'nestable-card--cannot-accept': !canAcceptNest && isDragOver,
        'nestable-card--disabled': disabled,
      }"
      :draggable="canBeDragged && !disabled"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @keydown="handleKeyDown"
    >
      <slot></slot>

      <!-- 嵌套提示 -->
      <Transition name="hint">
        <div
          v-if="isCurrentTarget && canAcceptNest"
          class="nestable-card__hint"
        >
          <span class="nestable-card__hint-icon">📥</span>
          <span class="nestable-card__hint-text">{{ t('nestable_card.hint') }}</span>
        </div>
      </Transition>

      <!-- 不可嵌套提示 -->
      <Transition name="hint">
        <div
          v-if="isCurrentTarget && !canAcceptNest"
          class="nestable-card__hint nestable-card__hint--error"
        >
          <span class="nestable-card__hint-icon">🚫</span>
          <span class="nestable-card__hint-text">
            {{
              currentLevel >= maxNestLevel - 1
                ? t('nestable_card.max_level')
                : t('nestable_card.cannot_nest')
            }}
          </span>
        </div>
      </Transition>
    </div>
  </DropHighlight>
</template>

<style scoped>
.nestable-card {
  position: relative;
  cursor: grab;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.nestable-card:active {
  cursor: grabbing;
}

.nestable-card--dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.nestable-card--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.nestable-card__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 12px) var(--chips-spacing-lg, 16px);
  background-color: var(--chips-color-primary, #1890ff);
  color: var(--chips-color-on-primary, #ffffff);
  border-radius: var(--chips-border-radius-base, 8px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
  pointer-events: none;
  z-index: 10;
}

.nestable-card__hint--error {
  background-color: var(--chips-color-error, #ff4d4f);
  color: var(--chips-color-on-error, #ffffff);
}

.nestable-card__hint-icon {
  font-size: 20px;
}

.nestable-card__hint-text {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  white-space: nowrap;
}

/* 动画 */
.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}
</style>
