<script setup lang="ts">
/**
 * 拖动幽灵组件
 * @module components/drag-drop/DragGhost
 * @description 拖动过程中跟随鼠标的预览元素
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 是否显示 */
    visible?: boolean;
    /** X 坐标 */
    x?: number;
    /** Y 坐标 */
    y?: number;
    /** 标题 */
    title?: string;
    /** 图标 */
    icon?: string;
    /** 类型提示 */
    typeHint?: string;
    /** 是否可放置 */
    canDrop?: boolean;
  }>(),
  {
    visible: false,
    x: 0,
    y: 0,
    title: '',
    icon: '📄',
    typeHint: '',
    canDrop: true,
  }
);

/** 幽灵样式 */
const ghostStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
}));
</script>

<template>
  <Teleport to="body">
    <Transition name="ghost">
      <div
        v-if="visible"
        class="drag-ghost"
        :class="{ 'drag-ghost--cannot-drop': !canDrop }"
        :style="ghostStyle"
      >
        <div class="drag-ghost__card">
          <span class="drag-ghost__icon">{{ icon }}</span>
          <div class="drag-ghost__content">
            <span class="drag-ghost__title">{{ title }}</span>
            <span v-if="typeHint" class="drag-ghost__hint">{{ typeHint }}</span>
          </div>
        </div>

        <!-- 状态指示 -->
        <div class="drag-ghost__status">
          <span v-if="canDrop" class="drag-ghost__status-icon drag-ghost__status-icon--ok">✓</span>
          <span v-else class="drag-ghost__status-icon drag-ghost__status-icon--no">✕</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 10001;
  transform: translate(-50%, -100%) translateY(-12px);
}

.drag-ghost__card {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background-color: var(--chips-color-bg-base, #fff);
  border-radius: var(--chips-border-radius-base, 8px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
  border: 2px solid var(--chips-color-primary, #1890ff);
  max-width: 200px;
}

.drag-ghost--cannot-drop .drag-ghost__card {
  border-color: var(--chips-color-error, #ff4d4f);
  opacity: 0.8;
}

.drag-ghost__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.drag-ghost__content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drag-ghost__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-ghost__hint {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666);
}

.drag-ghost__status {
  position: absolute;
  right: -8px;
  top: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--chips-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.drag-ghost__status-icon {
  font-size: 12px;
  font-weight: bold;
}

.drag-ghost__status-icon--ok {
  background-color: var(--chips-color-success, #52c41a);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-ghost__status-icon--no {
  background-color: var(--chips-color-error, #ff4d4f);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 动画 */
.ghost-enter-active,
.ghost-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ghost-enter-from,
.ghost-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%) translateY(-20px) scale(0.9);
}
</style>
