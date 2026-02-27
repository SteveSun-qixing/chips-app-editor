<script setup lang="ts">
/**
 * 卡片设置对话框组件
 * @module components/card-settings/CardSettingsDialog
 *
 * 使用薯片组件库的 Button 组件，选项卡使用原生 HTML 实现
 * 将各面板逻辑拆分到独立子组件中
 * 遵循薯片生态主题系统规范，使用 --chips-* CSS 变量
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Button } from '@chips/component-library';
import { useCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import { BasicInfoPanel, CoverPanel, ThemePanel, ExportPanel } from './panels';
import CoverMaker from '@/components/cover-maker/CoverMaker.vue';
import type { CoverData } from '@/components/cover-maker/types';
import { saveCardCover } from '@/services/card-cover-service';
import { t } from '@/services/i18n-service';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** 是否显示 */
  visible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭对话框 */
  close: [];
  /** 保存设置 */
  save: [];
}>();

const cardStore = useCardStore();
const workspaceService = useWorkspaceService();

// 获取卡片信息
const cardInfo = computed(() => cardStore.openCards.get(props.cardId));

// 选项卡状态
const activeTab = ref('basic');

const DEFAULT_THEME_ID = 'default-light';

// 编辑状态 - 由子面板通过事件同步
const editName = ref('');
const editTags = ref<string[]>([]);
const selectedTheme = ref(DEFAULT_THEME_ID);

// 封面制作器状态
const showCoverMaker = ref(false);

// 初始化编辑数据
watch(
  () => props.visible,
  (visible) => {
    if (visible && cardInfo.value) {
      editName.value = cardInfo.value.metadata.name || '';
      editTags.value = [...(cardInfo.value.metadata.tags || [])].map((tag) =>
        Array.isArray(tag) ? tag.join('/') : tag
      );
      selectedTheme.value = cardInfo.value.metadata.theme || DEFAULT_THEME_ID;
      activeTab.value = 'basic';
    }
  },
  { immediate: true }
);

/**
 * 保存设置
 */
function handleSave(): void {
  if (!cardInfo.value) return;

  // 更新卡片元数据
  cardStore.updateCardMetadata(props.cardId, {
    name: editName.value.trim() || cardInfo.value.metadata.name,
    tags: editTags.value,
    theme: selectedTheme.value,
  });

  // 同步更新工作区文件名
  const newName = editName.value.trim();
  if (newName && newName !== cardInfo.value.metadata.name) {
    workspaceService.renameFile(props.cardId, `${newName}.card`);
  }

  emit('save');
  emit('close');
}

/**
 * 取消设置
 */
function handleCancel(): void {
  emit('close');
}

/**
 * 处理遮罩点击关闭
 */
function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as HTMLElement).classList.contains('card-settings-overlay')) {
    handleCancel();
  }
}

/**
 * 处理 Escape 键关闭
 */
function handleGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.visible && !showCoverMaker.value) {
    handleCancel();
  }
}

/**
 * 打开封面制作器
 */
function openCoverMaker(): void {
  showCoverMaker.value = true;
}

/**
 * 处理封面保存
 */
async function handleCoverSave(data: CoverData): Promise<void> {
  if (!cardInfo.value) {
    return;
  }

  try {
    await saveCardCover(
      {
        cardId: props.cardId,
        cardPath: cardInfo.value.filePath,
      },
      data
    );
    cardStore.updateCardMetadata(props.cardId, {
      modified_at: new Date().toISOString(),
    });
    showCoverMaker.value = false;
  } catch (error) {
    console.error('Failed to save cover:', error);
  }
}

// 全局键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="settings-fade">
      <div
        v-if="visible"
        class="card-settings-overlay"
        @click="handleOverlayClick"
      >
        <div class="card-settings-dialog">
          <!-- 对话框头部 -->
          <div class="card-settings-dialog__header">
            <h2 class="card-settings-dialog__title">
              {{ t('card_settings.title') }}
            </h2>
            <button
              type="button"
              class="card-settings-dialog__close-btn"
              :aria-label="t('card_settings.close')"
              @click="handleCancel"
            >
              ✕
            </button>
          </div>

          <!-- 选项卡导航 + 内容 -->
          <div class="card-settings-dialog__body">
            <div class="chips-tabs card-settings-dialog__tabs">
              <div class="chips-tabs__nav">
                <div class="chips-tabs__nav-list">
                  <div
                    v-for="tab in [
                      { key: 'basic', label: t('card_settings.tab_basic') },
                      { key: 'cover', label: t('card_settings.tab_cover') },
                      { key: 'theme', label: t('card_settings.tab_theme') },
                      { key: 'export', label: t('card_settings.tab_export') },
                    ]"
                    :key="tab.key"
                    :class="['chips-tabs__tab', { 'chips-tabs__tab--active': activeTab === tab.key }]"
                    @click="activeTab = tab.key"
                  >
                    <button type="button" class="chips-tabs__tab-btn">
                      {{ tab.label }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="chips-tabs__content">
                <div
                  v-show="activeTab === 'basic'"
                  class="chips-tabs__tabpane"
                >
                  <div class="card-settings-dialog__panel">
                    <BasicInfoPanel
                      :card-id="cardId"
                      :card-info="cardInfo"
                      @update:name="editName = $event"
                      @update:tags="editTags = $event"
                    />
                  </div>
                </div>
                <div
                  v-show="activeTab === 'cover'"
                  class="chips-tabs__tabpane"
                >
                  <div class="card-settings-dialog__panel">
                    <CoverPanel @open-cover-maker="openCoverMaker" />
                  </div>
                </div>
                <div
                  v-show="activeTab === 'theme'"
                  class="chips-tabs__tabpane"
                >
                  <div class="card-settings-dialog__panel">
                    <ThemePanel v-model="selectedTheme" />
                  </div>
                </div>
                <div
                  v-show="activeTab === 'export'"
                  class="chips-tabs__tabpane"
                >
                  <div class="card-settings-dialog__panel">
                    <ExportPanel
                      :card-id="cardId"
                      :card-info="cardInfo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="card-settings-dialog__footer">
            <Button
              html-type="button"
              type="default"
              class="card-settings-dialog__btn card-settings-dialog__btn--cancel"
              @click="handleCancel"
            >
              {{ t('card_settings.cancel') }}
            </Button>
            <Button
              html-type="button"
              type="primary"
              class="card-settings-dialog__btn card-settings-dialog__btn--save"
              @click="handleSave"
            >
              {{ t('card_settings.save') }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 封面制作器对话框 -->
    <CoverMaker
      :card-id="cardId"
      :visible="showCoverMaker"
      @close="showCoverMaker = false"
      @save="handleCoverSave"
    />
  </Teleport>
</template>

<style scoped>
/* ============================================================
 * 遮罩层
 * ============================================================ */
.card-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* ============================================================
 * 对话框容器
 * ============================================================ */
.card-settings-dialog {
  width: 600px;
  height: 640px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: var(--chips-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ============================================================
 * 头部
 * ============================================================ */
.card-settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

.card-settings-dialog__title {
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-bold, 600);
  color: var(--chips-color-text, #111827);
  margin: 0;
  line-height: 1.4;
}

.card-settings-dialog__close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-md, 8px);
  cursor: pointer;
  font-size: 16px;
  color: var(--chips-color-text-secondary, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--chips-transition-fast, 150ms ease),
    color var(--chips-transition-fast, 150ms ease);
}

.card-settings-dialog__close-btn:hover {
  background: color-mix(in srgb, var(--chips-color-text) 6%, transparent);
  color: var(--chips-color-text, #111827);
}

/* ============================================================
 * 主体 - Tabs + 内容
 * ============================================================ */
.card-settings-dialog__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs 组件主题样式 */
.card-settings-dialog__tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-settings-dialog__tabs :deep(.chips-tabs__nav) {
  padding: 0 var(--chips-spacing-lg, 24px);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

.card-settings-dialog__tabs :deep(.chips-tabs__nav-list) {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
}

.card-settings-dialog__tabs :deep(.chips-tabs__tab) {
  padding: var(--chips-spacing-sm, 12px) var(--chips-spacing-md, 16px);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--chips-transition-fast, 150ms ease),
    border-color var(--chips-transition-fast, 150ms ease);
}

.card-settings-dialog__tabs :deep(.chips-tabs__tab-btn) {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color var(--chips-transition-fast, 150ms ease);
}

.card-settings-dialog__tabs :deep(.chips-tabs__tab:hover .chips-tabs__tab-btn) {
  color: var(--chips-color-text, #111827);
}

.card-settings-dialog__tabs :deep(.chips-tabs__tab--active) {
  border-bottom-color: var(--chips-color-primary, #3b82f6);
}

.card-settings-dialog__tabs :deep(.chips-tabs__tab--active .chips-tabs__tab-btn) {
  color: var(--chips-color-primary, #3b82f6);
  font-weight: var(--chips-font-weight-medium, 500);
}

.card-settings-dialog__tabs :deep(.chips-tabs__ink-bar) {
  display: none;
}

.card-settings-dialog__tabs :deep(.chips-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.card-settings-dialog__tabs :deep(.chips-tabs__tabpane) {
  height: 100%;
}

.card-settings-dialog__tabs :deep(.chips-tabs__tabpane--hidden) {
  display: none;
}

/* 面板内容区内边距 */
.card-settings-dialog__panel {
  padding: var(--chips-spacing-lg, 24px);
}

/* ============================================================
 * 底部按钮
 * ============================================================ */
.card-settings-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-top: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

.card-settings-dialog__btn {
  padding: 8px var(--chips-spacing-lg, 24px);
  border: none;
  border-radius: var(--chips-radius-md, 8px);
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color var(--chips-transition-fast, 150ms ease),
    color var(--chips-transition-fast, 150ms ease);
}

.card-settings-dialog__btn--cancel {
  background: var(--chips-color-surface, #ffffff);
  color: var(--chips-color-text, #111827);
  border: 1px solid var(--chips-color-border, #e5e7eb);
}

.card-settings-dialog__btn--cancel:hover {
  background: color-mix(in srgb, var(--chips-color-text) 4%, transparent);
}

.card-settings-dialog__btn--save {
  background: var(--chips-color-primary, #3b82f6);
  color: #ffffff;
}

.card-settings-dialog__btn--save:hover {
  background: var(--chips-color-primary-dark, #2563eb);
}

/* ============================================================
 * 过渡动画
 * ============================================================ */
.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity 0.2s ease;
}

.settings-fade-enter-active .card-settings-dialog,
.settings-fade-leave-active .card-settings-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
}

.settings-fade-enter-from .card-settings-dialog,
.settings-fade-leave-to .card-settings-dialog {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
