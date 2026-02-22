<script setup lang="ts">
/**
 * 主区域组件
 * @module layouts/workbench/MainArea
 * @description 工作台中间的预览/编辑区域，支持标签页
 */

import { ref, computed, watch, provide } from 'vue';
import { Button } from '@chips/components';
import { useUIStore } from '@/core/state';
import type { CardWindowConfig } from '@/types';
import { t } from '@/services/i18n-service';

/** 标签页信息 */
export interface TabInfo {
  /** 标签 ID（卡片 ID） */
  id: string;
  /** 标签标题 */
  title: string;
  /** 是否已修改 */
  modified?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 图标 */
  icon?: string;
}

interface Props {
  /** 当前活跃的标签 ID */
  activeTabId?: string | null;
  /** 是否显示标签栏 */
  showTabs?: boolean;
  /** 空状态文本 */
  emptyText?: string;
  /** 空状态图标 */
  emptyIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  activeTabId: null,
  showTabs: true,
  emptyText: '',
  emptyIcon: '📄',
});

const emit = defineEmits<{
  /** 切换标签 */
  'tab-change': [tabId: string];
  /** 关闭标签 */
  'tab-close': [tabId: string];
  /** 标签重排序 */
  'tab-reorder': [fromIndex: number, toIndex: number];
}>();

const uiStore = useUIStore();

/** 当前活跃标签 ID */
const activeTab = ref(props.activeTabId);

/** 标签列表 */
const tabs = computed((): TabInfo[] => {
  return uiStore.cardWindows.map((window) => ({
    id: window.cardId,
    title: window.title || window.cardId,
    modified: false, // TODO: 从卡片状态获取
    closable: true,
    icon: getCardIcon(window),
  }));
});

/** 当前活跃的卡片窗口 */
const activeWindow = computed((): CardWindowConfig | null => {
  if (!activeTab.value) return null;
  return uiStore.cardWindows.find((w) => w.cardId === activeTab.value) ?? null;
});

/** 是否有打开的标签 */
const hasTabs = computed(() => tabs.value.length > 0);

const emptyTextValue = computed(() => props.emptyText || t('main_area.empty'));

/**
 * 获取卡片图标
 * @param window - 卡片窗口配置
 */
function getCardIcon(_window: CardWindowConfig): string {
  // TODO: 根据卡片类型返回不同图标
  return '📄';
}

/**
 * 切换标签
 * @param tabId - 标签 ID
 */
function switchTab(tabId: string): void {
  activeTab.value = tabId;
  emit('tab-change', tabId);
}

/**
 * 关闭标签
 * @param tabId - 标签 ID
 * @param event - 鼠标事件
 */
function closeTab(tabId: string, event?: MouseEvent): void {
  event?.stopPropagation();
  emit('tab-close', tabId);
  
  // 如果关闭的是当前活跃标签，切换到其他标签
  if (activeTab.value === tabId) {
    const currentIndex = tabs.value.findIndex((t) => t.id === tabId);
    const nextTab = tabs.value[currentIndex + 1] ?? tabs.value[currentIndex - 1];
    activeTab.value = nextTab?.id ?? null;
    if (activeTab.value) {
      emit('tab-change', activeTab.value);
    }
  }
}

/**
 * 处理标签中键点击（关闭）
 * @param tabId - 标签 ID
 * @param event - 鼠标事件
 */
function handleTabMiddleClick(tabId: string, event: MouseEvent): void {
  if (event.button === 1) {
    event.preventDefault();
    closeTab(tabId);
  }
}

/**
 * 处理标签右键菜单
 * @param tabId - 标签 ID
 * @param event - 鼠标事件
 */
function handleTabContextMenu(tabId: string, event: MouseEvent): void {
  event.preventDefault();
  // TODO: 显示上下文菜单
}

// 监听 props.activeTabId 变化
watch(() => props.activeTabId, (newId) => {
  activeTab.value = newId;
});

// 提供上下文
provide('mainArea', {
  activeTab,
  tabs,
  switchTab,
  closeTab,
});

// 暴露方法
defineExpose({
  activeTab,
  tabs,
  switchTab,
  closeTab,
});
</script>

<template>
  <main class="main-area">
    <!-- 标签栏 -->
    <div v-if="showTabs && hasTabs" class="main-area__tabs" role="tablist">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        :class="{
          'main-area__tab': true,
          'main-area__tab--active': activeTab === tab.id,
          'main-area__tab--modified': tab.modified,
        }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="switchTab(tab.id)"
        @mousedown="handleTabMiddleClick(tab.id, $event)"
        @contextmenu="handleTabContextMenu(tab.id, $event)"
      >
        <span v-if="tab.icon" class="main-area__tab-icon">{{ tab.icon }}</span>
        <span class="main-area__tab-title">{{ tab.title }}</span>
        <span v-if="tab.modified" class="main-area__tab-indicator">●</span>
        <Button
          v-if="tab.closable"
          class="main-area__tab-close"
          html-type="button"
          type="text"
          :aria-label="t('main_area.close_tab')"
          @click="closeTab(tab.id, $event)"
        >
          ×
        </Button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="main-area__content">
      <template v-if="hasTabs">
        <div
          v-for="tab in tabs"
          v-show="activeTab === tab.id"
          :key="tab.id"
          class="main-area__panel"
          role="tabpanel"
          :aria-hidden="activeTab !== tab.id"
        >
          <slot name="tab-content" :tab="tab" :window="activeWindow">
            <!-- 默认内容：卡片预览 -->
            <div class="main-area__card-preview">
              <slot :tab="tab"></slot>
            </div>
          </slot>
        </div>
      </template>
      
      <!-- 空状态 -->
      <template v-else>
        <div class="main-area__empty">
          <span class="main-area__empty-icon">{{ emptyIcon }}</span>
          <p class="main-area__empty-text">{{ emptyTextValue }}</p>
          <slot name="empty-actions"></slot>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
/* ==================== 主区域容器 ==================== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--chips-color-background, #fafafa);
  overflow: hidden;
}

/* ==================== 标签栏 ==================== */
.main-area__tabs {
  display: flex;
  align-items: stretch;
  background: var(--chips-color-surface-variant, #f5f5f5);
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
  min-height: 36px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
}

.main-area__tabs::-webkit-scrollbar {
  height: 2px;
}

.main-area__tabs::-webkit-scrollbar-thumb {
  background: var(--chips-color-border, #e0e0e0);
  border-radius: 1px;
}

/* ==================== 标签项 ==================== */
.main-area__tab {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: 0 var(--chips-spacing-md, 12px);
  min-width: 100px;
  max-width: 200px;
  height: 36px;
  background: transparent;
  border: none;
  border-right: 1px solid var(--chips-color-border, #e0e0e0);
  cursor: pointer;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
  user-select: none;
}

.main-area__tab:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.03));
}

.main-area__tab--active {
  background: var(--chips-color-surface, #ffffff);
  border-bottom: 2px solid var(--chips-color-primary, #3b82f6);
  margin-bottom: -1px;
}

.main-area__tab:focus-visible {
  outline: 2px solid var(--chips-color-primary, #3b82f6);
  outline-offset: -2px;
}

.main-area__tab-icon {
  font-size: var(--chips-font-size-sm, 14px);
  flex-shrink: 0;
}

.main-area__tab-title {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.main-area__tab--active .main-area__tab-title {
  font-weight: var(--chips-font-weight-medium, 500);
}

.main-area__tab-indicator {
  color: var(--chips-color-warning, #f59e0b);
  font-size: 8px;
  flex-shrink: 0;
}

.main-area__tab-close {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
  opacity: 0;
  transition: opacity var(--chips-transition-fast, 0.15s) ease,
              background-color var(--chips-transition-fast, 0.15s) ease;
  flex-shrink: 0;
}

.main-area__tab:hover .main-area__tab-close,
.main-area__tab--active .main-area__tab-close {
  opacity: 1;
}

.main-area__tab-close:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.1));
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* ==================== 内容区域 ==================== */
.main-area__content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-area__panel {
  position: absolute;
  inset: 0;
  overflow: auto;
}

.main-area__card-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 空状态 ==================== */
.main-area__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 32px);
  text-align: center;
}

.main-area__empty-icon {
  font-size: 64px;
  margin-bottom: var(--chips-spacing-md, 12px);
  opacity: 0.5;
}

.main-area__empty-text {
  font-size: var(--chips-font-size-md, 16px);
  color: var(--chips-color-text-secondary, #666666);
  margin: 0 0 var(--chips-spacing-md, 12px);
  line-height: 1.5;
}
</style>
