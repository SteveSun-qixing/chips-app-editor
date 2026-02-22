<script setup lang="ts">
/**
 * 窗口层组件
 * @module layouts/infinite-canvas/WindowLayer
 * @description 渲染工具窗口（不受缩放影响），集成程序坞
 */

import { computed } from 'vue';
import { ToolWindow } from '@/components/window';
import { Dock } from '@/components/dock';
import { useUIStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import type { ToolWindowConfig } from '@/types';

const emit = defineEmits<{
  /** 转发 Dock 的打开设置事件 */
  'open-settings': [];
}>();

const uiStore = useUIStore();
const windowManager = useWindowManager();

/** 获取工具窗口（在窗口层显示，不最小化的） */
const toolWindows = computed(() =>
  uiStore.toolWindows.filter((w) => w.state !== 'minimized')
);

/**
 * 处理工具窗口更新
 * @param windowId - 窗口 ID
 * @param updates - 更新内容
 */
function handleToolWindowUpdate(windowId: string, updates: Partial<ToolWindowConfig>): void {
  windowManager.updateWindow(windowId, updates);
}

/**
 * 处理工具窗口关闭
 * @param windowId - 窗口 ID
 */
function handleToolWindowClose(windowId: string): void {
  windowManager.closeWindow(windowId);
}

/**
 * 处理工具窗口聚焦
 * @param windowId - 窗口 ID
 */
function handleToolWindowFocus(windowId: string): void {
  windowManager.focusWindow(windowId);
}
</script>

<template>
  <div class="window-layer">
    <!-- 工具窗口 -->
    <ToolWindow
      v-for="window in toolWindows"
      :key="window.id"
      :config="window"
      @update:config="(updates) => handleToolWindowUpdate(window.id, updates)"
      @close="handleToolWindowClose(window.id)"
      @focus="handleToolWindowFocus(window.id)"
    >
      <!-- 动态组件插槽 -->
      <slot :name="`tool-${window.component}`" :config="window"></slot>
    </ToolWindow>

    <!-- 其他窗口层内容插槽 -->
    <slot></slot>

    <!-- 程序坞组件 -->
    <Dock @open-settings="emit('open-settings')" />
  </div>
</template>

<style scoped>
.window-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.window-layer > :deep(*) {
  pointer-events: auto;
}
</style>
