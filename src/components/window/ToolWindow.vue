<script setup lang="ts">
/**
 * 工具窗口组件
 * @module components/window/ToolWindow
 * @description 用于显示工具面板的窗口组件，支持最小化到程序坞
 */

import { computed } from 'vue';
import BaseWindow from './BaseWindow.vue';
import { useUIStore } from '@/core/state';
import type { ToolWindowConfig, WindowPosition, WindowSize } from '@/types';

interface Props {
  /** 窗口配置 */
  config: ToolWindowConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭窗口 */
  close: [];
  /** 聚焦窗口 */
  focus: [];
  /** 更新配置 */
  'update:config': [config: Partial<ToolWindowConfig>];
}>();

const uiStore = useUIStore();

/** 是否已最小化 */
const isMinimized = computed(() => uiStore.minimizedTools.has(props.config.id));

/**
 * 更新位置
 */
function updatePosition(position: WindowPosition): void {
  emit('update:config', { position });
}

/**
 * 更新大小
 */
function updateSize(size: WindowSize): void {
  emit('update:config', { size });
}

/**
 * 最小化到程序坞
 */
function handleMinimize(): void {
  uiStore.minimizeTool(props.config.id);
}

/**
 * 收起/展开
 */
function handleCollapse(): void {
  const newState = props.config.state === 'collapsed' ? 'normal' : 'collapsed';
  emit('update:config', { state: newState });
}

/**
 * 关闭窗口
 */
function handleClose(): void {
  emit('close');
}

/**
 * 聚焦窗口
 */
function handleFocus(): void {
  emit('focus');
}
</script>

<template>
  <BaseWindow
    v-if="!isMinimized"
    :config="config"
    @update:position="updatePosition"
    @update:size="updateSize"
    @focus="handleFocus"
    @close="handleClose"
    @minimize="handleMinimize"
    @collapse="handleCollapse"
  >
    <template #header>
      <div class="tool-window__header">
        <span v-if="config.icon" class="tool-window__icon">
          {{ config.icon }}
        </span>
        <span class="tool-window__title">{{ config.title }}</span>
      </div>
    </template>

    <template #default>
      <div class="tool-window__content">
        <slot></slot>
      </div>
    </template>
  </BaseWindow>
</template>

<style scoped>
.tool-window__header {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  flex: 1;
  min-width: 0;
}

.tool-window__icon {
  font-size: var(--chips-font-size-md, 16px);
  flex-shrink: 0;
}

.tool-window__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 工具窗口内容区 - 固定容器，内部滚动由插件控制 */
.tool-window__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
