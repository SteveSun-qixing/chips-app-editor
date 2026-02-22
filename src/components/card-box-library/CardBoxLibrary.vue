<script setup lang="ts">
/**
 * 卡箱库主组件
 * @module components/card-box-library/CardBoxLibrary
 * @description 显示已安装的基础卡片插件和箱子布局插件，支持拖放创建
 *
 * 设计说明：
 * - 卡箱库中的卡片类型和布局类型来自已安装的插件
 * - 插件通过注册清单动态加载
 * - 启动时读取已安装插件的 manifest 列表
 */

import { ref, computed } from 'vue';
import { Button } from '@chips/components';
import CardTypeGrid from './CardTypeGrid.vue';
import LayoutTypeGrid from './LayoutTypeGrid.vue';
import { useGlobalDragCreate } from './use-drag-create';
import { cardTypes as allCardTypes, layoutTypes as allLayoutTypes } from './data';
import type { DragData } from './types';
import { t } from '@/services/i18n-service';

/** 标签页类型 */
type TabType = 'cards' | 'boxes';

const emit = defineEmits<{
  /** 拖放开始 */
  dragStart: [data: DragData, event: DragEvent];
}>();

/** 当前激活的标签页 */
const activeTab = ref<TabType>('cards');

/** 全局拖放创建实例 */
const dragCreate = useGlobalDragCreate();

/** 卡片类型列表 */
const cardTypes = computed(() => allCardTypes);

/** 布局类型列表 */
const layoutTypes = computed(() => allLayoutTypes);

/** 是否有内容 */
const hasContent = computed(() => {
  if (activeTab.value === 'cards') {
    return cardTypes.value.length > 0;
  }
  return layoutTypes.value.length > 0;
});

/** 当前显示的卡片数量 */
const currentCardCount = computed(() => cardTypes.value.length);

/** 当前显示的布局数量 */
const currentLayoutCount = computed(() => layoutTypes.value.length);


/**
 * 切换标签页
 */
function switchTab(tab: TabType): void {
  activeTab.value = tab;
}

/**
 * 处理拖放开始
 */
function handleDragStart(data: DragData, event: DragEvent): void {
  dragCreate.startDrag(data, event);
  emit('dragStart', data, event);
}
</script>

<template>
  <div class="card-box-library">
    <!-- 标签页 -->
    <div class="card-box-library__tabs">
      <Button
        class="card-box-library__tab"
        :class="{ 'card-box-library__tab--active': activeTab === 'cards' }"
        html-type="button"
        type="text"
        @click="switchTab('cards')"
      >
        <span class="card-box-library__tab-icon">🃏</span>
        <span class="card-box-library__tab-label">{{ t('card_box.tab_cards') }}</span>
        <span class="card-box-library__tab-count">{{ currentCardCount }}</span>
      </Button>
      <Button
        class="card-box-library__tab"
        :class="{ 'card-box-library__tab--active': activeTab === 'boxes' }"
        html-type="button"
        type="text"
        @click="switchTab('boxes')"
      >
        <span class="card-box-library__tab-icon">📦</span>
        <span class="card-box-library__tab-label">{{ t('card_box.tab_boxes') }}</span>
        <span class="card-box-library__tab-count">{{ currentLayoutCount }}</span>
      </Button>
    </div>

    <!-- 内容区域 -->
    <div class="card-box-library__content">
      <!-- 卡片类型网格 -->
      <template v-if="activeTab === 'cards'">
        <CardTypeGrid
          v-if="hasContent"
          :types="cardTypes"
          @drag-start="handleDragStart"
        />

        <!-- 无已安装的卡片插件 -->
        <div v-else class="card-box-library__empty">
          <span class="card-box-library__empty-icon">📭</span>
          <span class="card-box-library__empty-text">{{ t('card_box.empty_cards') }}</span>
          <span class="card-box-library__empty-hint">{{ t('card_box.empty_hint') }}</span>
        </div>
      </template>

      <!-- 布局类型网格 -->
      <template v-else>
        <LayoutTypeGrid
          v-if="hasContent"
          :types="layoutTypes"
          @drag-start="handleDragStart"
        />

        <!-- 无已安装的布局插件 -->
        <div v-else class="card-box-library__empty">
          <span class="card-box-library__empty-icon">📭</span>
          <span class="card-box-library__empty-text">{{ t('card_box.empty_boxes') }}</span>
          <span class="card-box-library__empty-hint">{{ t('card_box.empty_hint') }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card-box-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
}

/* 标签页 */
.card-box-library__tabs {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-radius: var(--chips-border-radius-base, 8px);
  margin-bottom: var(--chips-spacing-sm, 8px);
}

.card-box-library__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  border: none;
  background: transparent;
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-box-library__tab:hover {
  background-color: var(--chips-color-bg-hover, #e8e8e8);
}

.card-box-library__tab--active {
  background-color: var(--chips-color-bg-base, #fff);
  color: var(--chips-color-text-primary, #1a1a1a);
  box-shadow: var(--chips-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.card-box-library__tab-icon {
  font-size: var(--chips-font-size-md, 16px);
}

.card-box-library__tab-label {
  font-weight: var(--chips-font-weight-medium, 500);
}

.card-box-library__tab-count {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  padding: 2px 6px;
  border-radius: 10px;
}

.card-box-library__tab--active .card-box-library__tab-count {
  background-color: var(--chips-color-primary-light, #e6f7ff);
  color: var(--chips-color-primary, #1890ff);
}

/* 内容区域 */
.card-box-library__content {
  flex: 1;
  overflow-y: auto;
  padding-right: var(--chips-spacing-xs, 4px);
}

/* 空状态 */
.card-box-library__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-text-tertiary, #999);
}

.card-box-library__empty-icon {
  font-size: var(--chips-font-size-xxl, 32px);
  opacity: 0.5;
}

.card-box-library__empty-text {
  font-size: var(--chips-font-size-sm, 14px);
  text-align: center;
}

.card-box-library__empty-hint {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-quaternary, #bbb);
}
</style>
