<script setup lang="ts">
/**
 * 放置高亮组件
 * @module components/drag-drop/DropHighlight
 * @description 拖放时显示的目标区域高亮效果
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 是否可以放置 */
    canDrop?: boolean;
    /** 是否激活（鼠标悬停） */
    active?: boolean;
    /** 高亮类型 */
    type?: 'default' | 'nest' | 'insert';
  }>(),
  {
    canDrop: true,
    active: false,
    type: 'default',
  }
);

/** 高亮状态类 */
const highlightClass = computed(() => ({
  'drop-highlight--active': props.active,
  'drop-highlight--can-drop': props.canDrop,
  'drop-highlight--cannot-drop': !props.canDrop,
  [`drop-highlight--${props.type}`]: true,
}));
</script>

<template>
  <div class="drop-highlight" :class="highlightClass">
    <slot></slot>

    <!-- 高亮边框 -->
    <div v-if="active" class="drop-highlight__border">
      <!-- 禁止图标 -->
      <div v-if="!canDrop" class="drop-highlight__forbidden">
        <span class="drop-highlight__forbidden-icon">🚫</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-highlight {
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drop-highlight--active.drop-highlight--can-drop {
  transform: scale(1.02);
}

.drop-highlight--active.drop-highlight--cannot-drop {
  opacity: 0.6;
}

.drop-highlight__border {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: inherit;
  pointer-events: none;
  transition: all 0.2s ease;
}

/* 可放置状态 */
.drop-highlight--can-drop .drop-highlight__border {
  border: 2px solid var(--chips-color-primary, #1890ff);
  background-color: rgba(24, 144, 255, 0.05);
}

/* 不可放置状态 */
.drop-highlight--cannot-drop .drop-highlight__border {
  border: 2px dashed var(--chips-color-error, #ff4d4f);
  background-color: rgba(255, 77, 79, 0.05);
}

/* 嵌套类型 */
.drop-highlight--nest.drop-highlight--can-drop .drop-highlight__border {
  border-style: solid;
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
}

/* 插入类型 */
.drop-highlight--insert .drop-highlight__border {
  border-style: dashed;
}

/* 禁止图标 */
.drop-highlight__forbidden {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--chips-color-bg-base, #fff);
  border-radius: 50%;
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.drop-highlight__forbidden-icon {
  font-size: 24px;
}
</style>
