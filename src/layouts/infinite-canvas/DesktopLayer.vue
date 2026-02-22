<script setup lang="ts">
/**
 * 桌面层组件
 * @module layouts/infinite-canvas/DesktopLayer
 * @description 渲染卡片窗口，应用缩放和平移变换
 */

import { computed } from 'vue';
import { CardWindow } from '@/components/window';
import { useUIStore, useCardStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import type { CardWindowConfig } from '@/types';

const uiStore = useUIStore();
const cardStore = useCardStore();
const windowManager = useWindowManager();

/** 获取卡片窗口（在桌面层显示） */
const cardWindows = computed(() => {
  const windows = uiStore.cardWindows;
  console.warn('[DesktopLayer] cardWindows computed:', windows.length, windows.map(w => w.id));
  return windows;
});

/**
 * 处理卡片窗口更新
 * @param windowId - 窗口 ID
 * @param updates - 更新内容
 */
function handleCardWindowUpdate(windowId: string, updates: Partial<CardWindowConfig>): void {
  windowManager.updateWindow(windowId, updates);
}

/**
 * 处理卡片窗口关闭
 * @param windowId - 窗口 ID
 */
function handleCardWindowClose(windowId: string): void {
  windowManager.closeWindow(windowId);
}

/**
 * 处理卡片窗口聚焦
 * @param windowId - 窗口 ID
 * @param cardId - 卡片 ID
 */
function handleCardWindowFocus(windowId: string, cardId: string): void {
  windowManager.focusWindow(windowId);
  cardStore.setActiveCard(cardId);
}
</script>

<template>
  <div class="desktop-layer">
    <!-- 卡片窗口 -->
    <CardWindow
      v-for="window in cardWindows"
      :key="window.id"
      :config="window"
      @update:config="(updates) => handleCardWindowUpdate(window.id, updates)"
      @close="handleCardWindowClose(window.id)"
      @focus="handleCardWindowFocus(window.id, window.cardId)"
    />

    <!-- 其他桌面内容插槽 -->
    <slot></slot>
  </div>
</template>

<style scoped>
.desktop-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  /* 桌面层本身不占空间，内容通过绝对定位放置 */
}
</style>
