<script setup lang="ts">
/**
 * 工作台主组件
 * @module layouts/workbench/Workbench
 * @description 编辑器的工作台布局 - 分区窗口组合方式
 */

import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue';
import SidePanel from './SidePanel.vue';
import MainArea from './MainArea.vue';
import { useUIStore, useCardStore } from '@/core/state';
import { t } from '@/services/i18n-service';

/** 工作台布局配置 */
export interface WorkbenchLayoutConfig {
  /** 左侧面板宽度 */
  leftPanelWidth?: number;
  /** 右侧面板宽度 */
  rightPanelWidth?: number;
  /** 左侧面板是否展开 */
  leftPanelExpanded?: boolean;
  /** 右侧面板是否展开 */
  rightPanelExpanded?: boolean;
  /** 是否显示左侧面板 */
  showLeftPanel?: boolean;
  /** 是否显示右侧面板 */
  showRightPanel?: boolean;
}

interface Props {
  /** 初始布局配置 */
  config?: WorkbenchLayoutConfig;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
});

const emit = defineEmits<{
  /** 布局变化 */
  'layout-change': [config: WorkbenchLayoutConfig];
  /** 标签切换 */
  'tab-change': [cardId: string];
  /** 标签关闭 */
  'tab-close': [cardId: string];
}>();

const uiStore = useUIStore();
const cardStore = useCardStore();

/** 左侧面板宽度 */
const leftPanelWidth = ref(props.config.leftPanelWidth ?? 280);

/** 右侧面板宽度 */
const rightPanelWidth = ref(props.config.rightPanelWidth ?? 320);

/** 左侧面板是否展开 */
const leftPanelExpanded = ref(props.config.leftPanelExpanded ?? true);

/** 右侧面板是否展开 */
const rightPanelExpanded = ref(props.config.rightPanelExpanded ?? true);

/** 是否显示左侧面板 */
const showLeftPanel = ref(props.config.showLeftPanel ?? true);

/** 是否显示右侧面板 */
const showRightPanel = ref(props.config.showRightPanel ?? true);

/** 工作台容器引用 */
const workbenchRef = ref<HTMLElement | null>(null);

/** 当前活跃的卡片 ID */
const activeCardId = computed(() => cardStore.activeCardId);

/** 布局配置 */
const layoutConfig = computed((): WorkbenchLayoutConfig => ({
  leftPanelWidth: leftPanelWidth.value,
  rightPanelWidth: rightPanelWidth.value,
  leftPanelExpanded: leftPanelExpanded.value,
  rightPanelExpanded: rightPanelExpanded.value,
  showLeftPanel: showLeftPanel.value,
  showRightPanel: showRightPanel.value,
}));

/** 工作台样式 */
const workbenchStyle = computed(() => ({
  '--left-panel-width': `${leftPanelExpanded.value ? leftPanelWidth.value : 40}px`,
  '--right-panel-width': `${rightPanelExpanded.value ? rightPanelWidth.value : 40}px`,
}));

/**
 * 处理左侧面板宽度变化
 * @param width - 新宽度
 */
function handleLeftPanelWidthChange(width: number): void {
  leftPanelWidth.value = width;
  emitLayoutChange();
}

/**
 * 处理右侧面板宽度变化
 * @param width - 新宽度
 */
function handleRightPanelWidthChange(width: number): void {
  rightPanelWidth.value = width;
  emitLayoutChange();
}

/**
 * 处理左侧面板展开状态变化
 * @param expanded - 是否展开
 */
function handleLeftPanelExpandedChange(expanded: boolean): void {
  leftPanelExpanded.value = expanded;
  emitLayoutChange();
}

/**
 * 处理右侧面板展开状态变化
 * @param expanded - 是否展开
 */
function handleRightPanelExpandedChange(expanded: boolean): void {
  rightPanelExpanded.value = expanded;
  emitLayoutChange();
}

/**
 * 处理标签切换
 * @param cardId - 卡片 ID
 */
function handleTabChange(cardId: string): void {
  cardStore.setActiveCard(cardId);
  emit('tab-change', cardId);
}

/**
 * 处理标签关闭
 * @param cardId - 卡片 ID
 */
function handleTabClose(cardId: string): void {
  uiStore.removeWindow(`card-${cardId}`);
  emit('tab-close', cardId);
}

/**
 * 触发布局变化事件
 */
function emitLayoutChange(): void {
  emit('layout-change', layoutConfig.value);
}

/**
 * 切换左侧面板
 */
function toggleLeftPanel(): void {
  leftPanelExpanded.value = !leftPanelExpanded.value;
  emitLayoutChange();
}

/**
 * 切换右侧面板
 */
function toggleRightPanel(): void {
  rightPanelExpanded.value = !rightPanelExpanded.value;
  emitLayoutChange();
}

/**
 * 设置布局配置
 * @param config - 布局配置
 */
function setLayoutConfig(config: Partial<WorkbenchLayoutConfig>): void {
  if (config.leftPanelWidth !== undefined) {
    leftPanelWidth.value = config.leftPanelWidth;
  }
  if (config.rightPanelWidth !== undefined) {
    rightPanelWidth.value = config.rightPanelWidth;
  }
  if (config.leftPanelExpanded !== undefined) {
    leftPanelExpanded.value = config.leftPanelExpanded;
  }
  if (config.rightPanelExpanded !== undefined) {
    rightPanelExpanded.value = config.rightPanelExpanded;
  }
  if (config.showLeftPanel !== undefined) {
    showLeftPanel.value = config.showLeftPanel;
  }
  if (config.showRightPanel !== undefined) {
    showRightPanel.value = config.showRightPanel;
  }
  emitLayoutChange();
}

/**
 * 重置布局
 */
function resetLayout(): void {
  leftPanelWidth.value = 280;
  rightPanelWidth.value = 320;
  leftPanelExpanded.value = true;
  rightPanelExpanded.value = true;
  showLeftPanel.value = true;
  showRightPanel.value = true;
  emitLayoutChange();
}

/**
 * 处理键盘快捷键
 * @param e - 键盘事件
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Ctrl/Cmd + B: 切换左侧面板
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    toggleLeftPanel();
  }
  // Ctrl/Cmd + Shift + B: 切换右侧面板
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
    e.preventDefault();
    toggleRightPanel();
  }
}

// 监听配置变化
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    setLayoutConfig(newConfig);
  }
}, { deep: true });

// 提供上下文给子组件
provide('workbench', {
  leftPanelWidth,
  rightPanelWidth,
  leftPanelExpanded,
  rightPanelExpanded,
  toggleLeftPanel,
  toggleRightPanel,
  setLayoutConfig,
  resetLayout,
});

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// 暴露方法和状态
defineExpose({
  layoutConfig,
  toggleLeftPanel,
  toggleRightPanel,
  setLayoutConfig,
  resetLayout,
});
</script>

<template>
  <div
    ref="workbenchRef"
    class="workbench"
    :style="workbenchStyle"
  >
    <!-- 左侧面板 -->
    <SidePanel
      v-if="showLeftPanel"
      position="left"
      :width="leftPanelWidth"
      :expanded="leftPanelExpanded"
      :min-width="180"
      :max-width="480"
      :title="t('workbench.left_panel')"
      @update:width="handleLeftPanelWidthChange"
      @update:expanded="handleLeftPanelExpandedChange"
    >
      <slot name="left-panel">
        <!-- 默认显示文件树插槽 -->
        <slot name="file-tree"></slot>
      </slot>
    </SidePanel>

    <!-- 主区域 -->
    <MainArea
      :active-tab-id="activeCardId"
      :show-tabs="true"
      :empty-text="t('workbench.empty')"
      empty-icon="📄"
      @tab-change="handleTabChange"
      @tab-close="handleTabClose"
    >
      <template #default="{ tab }">
        <slot name="card-preview" :card-id="tab?.id">
          <!-- 默认卡片预览内容 -->
        </slot>
      </template>
      
      <template #empty-actions>
        <slot name="empty-actions"></slot>
      </template>
    </MainArea>

    <!-- 右侧面板 -->
    <SidePanel
      v-if="showRightPanel"
      position="right"
      :width="rightPanelWidth"
      :expanded="rightPanelExpanded"
      :min-width="200"
      :max-width="500"
      :title="t('workbench.right_panel')"
      @update:width="handleRightPanelWidthChange"
      @update:expanded="handleRightPanelExpandedChange"
    >
      <slot name="right-panel">
        <!-- 默认显示编辑面板插槽 -->
        <slot name="edit-panel"></slot>
      </slot>
    </SidePanel>
  </div>
</template>

<style scoped>
/* ==================== 工作台容器 ==================== */
.workbench {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--chips-color-background, #fafafa);
  overflow: hidden;
}

/* ==================== 过渡动画 ==================== */
.workbench :deep(.side-panel) {
  transition: width var(--chips-transition-medium, 0.25s) ease;
}

/* ==================== 主区域自适应 ==================== */
.workbench :deep(.main-area) {
  flex: 1;
  min-width: 300px;
}
</style>
