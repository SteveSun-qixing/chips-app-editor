<script setup lang="ts">
/**
 * CardSettingsDialog 重构版本
 * @module components/card-settings/CardSettingsDialog
 * 
 * 重构要点：
 * 1. 移除所有业务逻辑，只保留UI交互
 * 2. 通过 SDK 调用所有功能
 * 3. 使用组合式组件拆分功能
 * 4. 遵循中心路由原则
 */

import { ref, computed, watch } from 'vue';
import { Button, Input } from '@chips/component-library';
import { useCardStore } from '@/core/state';
import { ChipsSDK } from '@chips/sdk';
import { ExportPanel } from './panels';
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
  close: [];
  save: [];
}>();

// 初始化 SDK
const SdkClass = ChipsSDK;
const sdk = new SdkClass();
sdk.initialize().catch(console.error);

const cardStore = useCardStore();

// 获取卡片信息
const cardInfo = computed(() => cardStore.openCards.get(props.cardId));

// 选项卡
const selectedTab = ref<'basic' | 'cover' | 'theme' | 'export'>('basic');

// 基本信息
const editName = ref('');
const editTags = ref<string[]>([]);
const newTag = ref('');

// 封面
const showCoverMaker = ref(false);

const DEFAULT_THEME_ID = 'default-light';

// 主题
const themes = ref<{ id: string; name: string }[]>([
  { id: DEFAULT_THEME_ID, name: 'card_settings.theme_default_light' },
]);
const selectedTheme = ref(DEFAULT_THEME_ID);

// 监听可见性，初始化数据
watch(
  () => props.visible,
  (visible) => {
    if (visible && cardInfo.value) {
      editName.value = cardInfo.value.metadata.name || '';
      editTags.value = [...(cardInfo.value.metadata.tags || [])].map((t) =>
        Array.isArray(t) ? t.join('/') : t
      );
      selectedTheme.value = cardInfo.value.metadata.theme || DEFAULT_THEME_ID;
    }
  },
  { immediate: true }
);

/**
 * 保存设置
 * 通过 SDK 更新卡片元数据
 */
async function handleSave(): Promise<void> {
  if (!cardInfo.value) return;

  try {
    // 通过 SDK 更新卡片
    await sdk.card.update(props.cardId, {
      metadata: {
        name: editName.value.trim() || cardInfo.value.metadata.name,
        tags: editTags.value,
        theme: selectedTheme.value,
        modified_at: new Date().toISOString(),
      },
    });

    // 本地状态更新
    cardStore.updateCardMetadata(props.cardId, {
      name: editName.value.trim() || cardInfo.value.metadata.name,
      tags: editTags.value,
      theme: selectedTheme.value,
    });

    emit('save');
    emit('close');
  } catch (error) {
    console.error('Failed to save card settings:', error);
  }
}

/**
 * 取消设置
 */
function handleCancel(): void {
  emit('close');
}

/**
 * 添加标签
 */
function addTag(): void {
  const tag = newTag.value.trim();
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
    newTag.value = '';
  }
}

/**
 * 删除标签
 */
function removeTag(index: number): void {
  editTags.value.splice(index, 1);
}

/**
 * 打开封面制作器
 */
function openCoverMaker(): void {
  showCoverMaker.value = true;
}

/**
 * 处理封面保存
 * 通过 SDK 保存封面到卡片
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
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="card-settings-overlay" @click.self="handleCancel">
        <div class="card-settings-dialog">
          <!-- 头部 -->
          <div class="dialog-header">
            <h2>{{ t('card_settings.title') }}</h2>
            <Button
              class="close-btn"
              html-type="button"
              type="text"
              :aria-label="t('card_settings.close')"
              @click="handleCancel"
            >
              ✕
            </Button>
          </div>

          <!-- 选项卡 -->
          <div class="dialog-tabs">
            <Button
              :class="['tab', { active: selectedTab === 'basic' }]"
              html-type="button"
              type="text"
              @click="selectedTab = 'basic'"
            >
              {{ t('card_settings.tab_basic') }}
            </Button>
            <Button
              :class="['tab', { active: selectedTab === 'cover' }]"
              html-type="button"
              type="text"
              @click="selectedTab = 'cover'"
            >
              {{ t('card_settings.tab_cover') }}
            </Button>
            <Button
              :class="['tab', { active: selectedTab === 'theme' }]"
              html-type="button"
              type="text"
              @click="selectedTab = 'theme'"
            >
              {{ t('card_settings.tab_theme') }}
            </Button>
            <Button
              :class="['tab', { active: selectedTab === 'export' }]"
              html-type="button"
              type="text"
              @click="selectedTab = 'export'"
            >
              {{ t('card_settings.tab_export') }}
            </Button>
          </div>

          <!-- 内容区域 -->
          <div class="dialog-content">
            <!-- 基本信息 -->
            <div v-show="selectedTab === 'basic'" class="panel">
              <div class="field">
                <label>{{ t('card_settings.name') }}</label>
                <Input
                  v-model="editName"
                  type="text"
                  class="field-input"
                  :placeholder="t('card_settings.name_placeholder')"
                />
              </div>

              <div class="field">
                <label>{{ t('card_settings.tags') }}</label>
                <div class="tag-input">
                  <Input
                    v-model="newTag"
                    type="text"
                    class="tag-input__field"
                    :placeholder="t('card_settings.tag_placeholder')"
                    @press-enter="addTag"
                  />
                  <Button html-type="button" type="text" class="tag-input__action" @click="addTag">
                    {{ t('card_settings.tag_add') }}
                  </Button>
                </div>
                <div v-if="editTags.length > 0" class="tags">
                  <span v-for="(tag, index) in editTags" :key="index" class="tag">
                    {{ tag }}
                    <Button
                      html-type="button"
                      type="text"
                      class="tag-remove"
                      :aria-label="t('card_settings.tag_remove')"
                      @click="removeTag(index)"
                    >
                      ✕
                    </Button>
                  </span>
                </div>
              </div>
            </div>

            <!-- 封面 -->
            <div v-show="selectedTab === 'cover'" class="panel">
              <Button type="default" html-type="button" class="action-btn" @click="openCoverMaker">
                🎨 {{ t('card_settings.cover_maker') }}
              </Button>
            </div>

            <!-- 主题 -->
            <div v-show="selectedTab === 'theme'" class="panel">
              <div class="theme-grid">
                <Button
                  v-for="theme in themes"
                  :key="theme.id"
                  html-type="button"
                  type="default"
                  :class="['theme-item', { selected: selectedTheme === theme.id }]"
                  @click="selectedTheme = theme.id"
                >
                  {{ t(theme.name) }}
                </Button>
              </div>
            </div>

            <!-- 导出 - 使用 ExportPanel 组件 -->
            <div v-show="selectedTab === 'export'" class="panel">
              <ExportPanel :card-id="cardId" :card-info="cardInfo" />
            </div>
          </div>

          <!-- 底部 -->
          <div class="dialog-footer">
            <Button type="default" html-type="button" class="btn btn-secondary" @click="handleCancel">
              {{ t('card_settings.cancel') }}
            </Button>
            <Button type="primary" html-type="button" class="btn btn-primary" @click="handleSave">
              {{ t('card_settings.save') }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 封面制作器 -->
    <CoverMaker
      :card-id="cardId"
      :visible="showCoverMaker"
      @close="showCoverMaker = false"
      @save="handleCoverSave"
    />
  </Teleport>
</template>

<style scoped>
.card-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.card-settings-dialog {
  width: 600px;
  max-height: 80vh;
  background: var(--chips-color-surface, #fff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: var(--chips-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
}

.dialog-header h2 {
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-bold, 600);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--chips-radius-md, 6px);
  transition: background 0.2s;
}

.close-btn:hover {
  background: color-mix(in srgb, var(--chips-color-text) 6%, transparent);
}

.dialog-tabs {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 12px) var(--chips-spacing-lg, 24px) 0;
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
}

.tab {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--chips-color-text-secondary, #666);
  font-size: var(--chips-font-size-sm, 14px);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--chips-color-text, #333);
}

.tab.active {
  color: var(--chips-color-primary, #3b82f6);
  border-bottom-color: var(--chips-color-primary, #3b82f6);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--chips-spacing-lg, 24px);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-lg, 20px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.field label {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
}

.field-input .chips-input__inner,
.tag-input__field .chips-input__inner {
  padding: 8px 12px;
  border: 1px solid var(--chips-color-border, #ddd);
  border-radius: var(--chips-radius-md, 6px);
  font-size: var(--chips-font-size-sm, 14px);
}

.field-input .chips-input__inner:focus,
.tag-input__field .chips-input__inner:focus {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chips-color-primary) 15%, transparent);
}

.tag-input {
  display: flex;
  gap: var(--chips-spacing-sm, 8px);
}

.tag-input__field {
  flex: 1;
}

.tag-input__action {
  padding: 8px 16px;
  border: 1px solid var(--chips-color-border, #ddd);
  border-radius: var(--chips-radius-md, 6px);
  background: var(--chips-color-surface, #fff);
  cursor: pointer;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-spacing-sm, 8px);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: color-mix(in srgb, var(--chips-color-primary) 12%, transparent);
  color: var(--chips-color-primary, #3b82f6);
  border-radius: 999px;
  font-size: 13px;
}

.tag-remove {
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.tag-remove:hover {
  opacity: 1;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--chips-spacing-md, 12px);
}

.theme-item {
  padding: 16px;
  border: 2px solid var(--chips-color-border, #ddd);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #fff);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-item:hover {
  border-color: var(--chips-color-primary, #3b82f6);
}

.theme-item.selected {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 10%, transparent);
}

.action-btn {
  padding: 12px 20px;
  border: 1px solid var(--chips-color-border, #ddd);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #fff);
  font-size: var(--chips-font-size-sm, 14px);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: color-mix(in srgb, var(--chips-color-text) 4%, transparent);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--chips-spacing-md, 12px);
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-top: 1px solid var(--chips-color-border, #e5e7eb);
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: var(--chips-radius-md, 6px);
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--chips-color-surface, #fff);
  color: var(--chips-color-text, #333);
  border: 1px solid var(--chips-color-border, #ddd);
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--chips-color-text) 4%, transparent);
}

.btn-primary {
  background: var(--chips-color-primary, #3b82f6);
  color: #fff;
}

.btn-primary:hover {
  background: var(--chips-color-primary-dark, #2563eb);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
