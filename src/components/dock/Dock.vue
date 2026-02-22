<script setup lang="ts">
/**
 * 程序坞主组件
 * @module components/dock/Dock
 * @description 固定在窗口层底部，显示所有工具窗口图标
 * 
 * 设计说明：
 * - Dock 始终显示所有工具窗口
 * - 最小化的工具显示为半透明状态
 * - 点击图标可以聚焦/恢复对应的窗口
 */

import { computed } from 'vue';
import { useUIStore } from '@/core/state';
import DockItem from './DockItem.vue';
import { t } from '@/services/i18n-service';
import type { DockPosition } from '@/core/state/stores/ui';
import type { ToolWindowConfig } from '@/types';

const emit = defineEmits<{
  /** 打开引擎设置弹窗 */
  'open-settings': [];
}>();

const uiStore = useUIStore();

/** 程序坞位置 */
const position = computed<DockPosition>(() => uiStore.dockPosition);

/** 程序坞是否可见 */
const visible = computed(() => uiStore.dockVisible);

/** 获取所有工具窗口列表（始终显示所有工具窗口） */
const allTools = computed<ToolWindowConfig[]>(() => {
  return uiStore.toolWindows;
});

/**
 * 处理工具窗口点击
 * - 如果窗口已最小化，则恢复窗口
 * - 如果窗口已显示，则聚焦窗口
 * @param toolId - 工具窗口 ID
 */
function handleToolClick(toolId: string): void {
  const tool = uiStore.getWindow(toolId);
  if (tool?.state === 'minimized') {
    uiStore.restoreTool(toolId);
  } else {
    uiStore.focusWindow(toolId);
  }
}

/**
 * 判断工具是否已最小化
 */
function isMinimized(toolId: string): boolean {
  const tool = uiStore.getWindow(toolId);
  return tool?.state === 'minimized';
}

/**
 * 打开引擎设置
 */
function handleOpenSettings(): void {
  emit('open-settings');
}
</script>

<template>
  <div
    v-if="visible"
    :class="['dock', `dock--${position}`]"
  >
    <!-- 工具窗口图标 -->
    <DockItem
      v-for="tool in allTools"
      :key="tool.id"
      :tool-id="tool.id"
      :icon="tool.icon"
      :title="tool.title"
      :minimized="isMinimized(tool.id)"
      @restore="handleToolClick"
    />

    <!-- 分隔线 -->
    <div
      v-if="allTools.length > 0"
      class="dock__divider"
    />

    <!-- 引擎设置按钮 -->
    <DockItem
      tool-id="__engine-settings__"
      icon="⚙️"
      :title="t('engine_settings.title')"
      :minimized="false"
      @restore="handleOpenSettings"
    />
  </div>
</template>

<style scoped>
.dock {
  position: absolute;
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
  pointer-events: auto;
  z-index: 1000;
  transition: opacity 0.3s, transform 0.3s;
}

/* 底部位置 */
.dock--bottom {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
}

/* 左侧位置 */
.dock--left {
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

/* 右侧位置 */
.dock--right {
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

/* 分隔线 */
.dock__divider {
  width: 1px;
  height: 32px;
  background: var(--chips-color-border, #e0e0e0);
  align-self: center;
  flex-shrink: 0;
}

.dock--left .dock__divider,
.dock--right .dock__divider {
  width: 32px;
  height: 1px;
}

/* 深色主题适配 */
:global(.dark) .dock {
  background: var(--chips-color-surface-dark, #1a1a1a);
  box-shadow: var(--chips-shadow-lg-dark, 0 8px 24px rgba(0, 0, 0, 0.3));
}
</style>
