<script setup lang="ts">
/**
 * 文件拖入区域组件
 * @module components/drag-drop/FileDropZone
 * @description 处理从操作系统拖入文件的区域
 */

import { ref, computed } from 'vue';
import { useFileDrop, type FileDragData, type FileDropType } from '@/core';
import { t } from '@/services/i18n-service';

const props = withDefaults(
  defineProps<{
    /** 是否禁用 */
    disabled?: boolean;
    /** 接受的文件类型 */
    acceptTypes?: FileDropType[];
    /** 是否全屏覆盖模式 */
    overlay?: boolean;
  }>(),
  {
    disabled: false,
    acceptTypes: undefined,
    overlay: false,
  }
);

const emit = defineEmits<{
  /** 文件放置事件 */
  drop: [data: FileDragData];
  /** 拖入状态变化 */
  dragStateChange: [isDragOver: boolean];
}>();

const { isFileDragOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } =
  useFileDrop();

/** 本地悬停状态 */
const localDragOver = ref(false);

/** 是否处于拖入状态 */
const isDragOverActive = computed(() => {
  return !props.disabled && (localDragOver.value || isFileDragOver.value);
});

/**
 * 检查文件类型是否被接受
 */
function isAcceptedType(types: FileDropType[]): boolean {
  if (!props.acceptTypes) return true;
  return types.some((t) => props.acceptTypes?.includes(t));
}

/**
 * 处理拖入
 */
function onDragEnter(event: DragEvent): void {
  if (props.disabled) return;
  handleDragEnter(event);
  localDragOver.value = true;
  emit('dragStateChange', true);
}

/**
 * 处理拖动悬停
 */
function onDragOver(event: DragEvent): void {
  if (props.disabled) return;
  handleDragOver(event);
}

/**
 * 处理拖出
 */
function onDragLeave(event: DragEvent): void {
  handleDragLeave(event);
  localDragOver.value = false;
  emit('dragStateChange', false);
}

/**
 * 处理放置
 */
function onDrop(event: DragEvent): void {
  if (props.disabled) return;

  const data = handleDrop(event);
  localDragOver.value = false;
  emit('dragStateChange', false);

  if (!data) return;

  // 检查文件类型
  if (!isAcceptedType(data.types)) {
    console.warn('File types not accepted:', data.types);
    return;
  }

  emit('drop', data);
}
</script>

<template>
  <div
    class="file-drop-zone"
    :class="{
      'file-drop-zone--active': isDragOverActive,
      'file-drop-zone--disabled': disabled,
      'file-drop-zone--overlay': overlay,
    }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <slot></slot>

    <!-- 拖入提示覆盖层 -->
    <Transition name="fade">
      <div v-if="isDragOverActive" class="file-drop-zone__overlay">
        <div class="file-drop-zone__indicator">
          <span class="file-drop-zone__icon">📁</span>
          <span class="file-drop-zone__text">
            <slot name="hint">{{ t('drag_drop.drop_files') }}</slot>
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.file-drop-zone {
  position: relative;
  width: 100%;
  height: 100%;
}

.file-drop-zone--overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.file-drop-zone--disabled {
  pointer-events: none;
}

.file-drop-zone__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(24, 144, 255, 0.1);
  border: 2px dashed var(--chips-color-primary, #1890ff);
  border-radius: var(--chips-border-radius-lg, 12px);
  pointer-events: none;
}

.file-drop-zone__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--chips-spacing-md, 12px);
  padding: var(--chips-spacing-xl, 24px);
  background-color: var(--chips-color-bg-base, #fff);
  border-radius: var(--chips-border-radius-lg, 12px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
}

.file-drop-zone__icon {
  font-size: 48px;
}

.file-drop-zone__text {
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
