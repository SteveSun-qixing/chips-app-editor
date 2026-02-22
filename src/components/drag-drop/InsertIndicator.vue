<script setup lang="ts">
/**
 * 插入位置指示线组件
 * @module components/drag-drop/InsertIndicator
 * @description 拖动排序时显示的插入位置指示线
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 是否显示 */
    visible?: boolean;
    /** 位置（像素） */
    position?: number;
    /** 方向 */
    direction?: 'horizontal' | 'vertical';
    /** 长度（像素） */
    length?: number;
    /** 偏移量 */
    offset?: number;
  }>(),
  {
    visible: false,
    position: 0,
    direction: 'horizontal',
    length: 0,
    offset: 0,
  }
);

/** 指示线样式 */
const indicatorStyle = computed(() => {
  if (props.direction === 'horizontal') {
    return {
      top: `${props.position}px`,
      left: `${props.offset}px`,
      width: props.length > 0 ? `${props.length}px` : '100%',
      height: '2px',
    };
  } else {
    return {
      left: `${props.position}px`,
      top: `${props.offset}px`,
      height: props.length > 0 ? `${props.length}px` : '100%',
      width: '2px',
    };
  }
});
</script>

<template>
  <Transition name="indicator">
    <div
      v-if="visible"
      class="insert-indicator"
      :style="indicatorStyle"
    >
      <div class="insert-indicator__dot insert-indicator__dot--start"></div>
      <div class="insert-indicator__line"></div>
      <div class="insert-indicator__dot insert-indicator__dot--end"></div>
    </div>
  </Transition>
</template>

<style scoped>
.insert-indicator {
  position: absolute;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 1000;
}

.insert-indicator__line {
  flex: 1;
  background-color: var(--chips-color-primary, #1890ff);
}

.insert-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--chips-color-primary, #1890ff);
  box-shadow: 0 0 0 2px var(--chips-color-bg-base, #fff);
}

/* 水平方向 */
.insert-indicator[style*="height: 2px"] .insert-indicator__line {
  height: 2px;
}

.insert-indicator[style*="height: 2px"] {
  flex-direction: row;
}

/* 垂直方向 */
.insert-indicator[style*="width: 2px"] .insert-indicator__line {
  width: 2px;
}

.insert-indicator[style*="width: 2px"] {
  flex-direction: column;
}

/* 动画 */
.indicator-enter-active,
.indicator-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.indicator-enter-from,
.indicator-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
