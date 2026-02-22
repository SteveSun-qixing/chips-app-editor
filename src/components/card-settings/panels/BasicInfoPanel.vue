<script setup lang="ts">
/**
 * BasicInfoPanel 基本信息面板
 * @module components/card-settings/panels/BasicInfoPanel
 *
 * 负责卡片名称、标签、元数据的编辑和展示
 * 使用薯片组件库，遵循主题系统规范
 */

import { ref, computed, watch } from 'vue';
import { Button, Input } from '@chips/components';
import type { CardInfo } from '@/core/state';
import { t } from '@/services/i18n-service';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** 卡片信息 */
  cardInfo: CardInfo | undefined;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 名称变更 */
  'update:name': [value: string];
  /** 标签变更 */
  'update:tags': [value: string[]];
}>();

// 编辑状态
const editName = ref('');
const editTags = ref<string[]>([]);
const newTag = ref('');

// 监听卡片信息变化，同步编辑状态
watch(
  () => props.cardInfo,
  (info) => {
    if (info) {
      editName.value = info.metadata.name || '';
      editTags.value = [...(info.metadata.tags || [])].map((tag) =>
        Array.isArray(tag) ? tag.join('/') : tag
      );
    }
  },
  { immediate: true }
);

// 同步名称到父组件
watch(editName, (val) => emit('update:name', val));
watch(editTags, (val) => emit('update:tags', val), { deep: true });

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: string | number | undefined): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
 * 处理标签输入框键盘事件
 */
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
}

// 元数据条目
const metadataItems = computed(() => [
  {
    label: t('card_settings.card_id'),
    value: props.cardId,
    mono: true,
  },
  {
    label: t('card_settings.created_at'),
    value: formatDateTime(props.cardInfo?.metadata.created_at),
    mono: false,
  },
  {
    label: t('card_settings.modified_at'),
    value: formatDateTime(props.cardInfo?.metadata.modified_at),
    mono: false,
  },
]);
</script>

<template>
  <div class="basic-info-panel">
    <!-- 卡片名称 -->
    <div class="basic-info-panel__field">
      <label class="basic-info-panel__label">
        {{ t('card_settings.name') }}
      </label>
      <Input
        v-model="editName"
        type="text"
        class="basic-info-panel__input"
        :placeholder="t('card_settings.name_placeholder')"
      />
    </div>

    <!-- 标签 -->
    <div class="basic-info-panel__field">
      <label class="basic-info-panel__label">
        {{ t('card_settings.tags') }}
      </label>
      <div class="basic-info-panel__tag-input-row">
        <Input
          v-model="newTag"
          type="text"
          class="basic-info-panel__tag-input"
          :placeholder="t('card_settings.tag_placeholder')"
          @keydown="handleKeydown"
        />
        <Button
          html-type="button"
          type="default"
          class="basic-info-panel__tag-add-btn"
          @click="addTag"
        >
          {{ t('card_settings.tag_add') }}
        </Button>
      </div>
      <div v-if="editTags.length > 0" class="basic-info-panel__tag-list">
        <span
          v-for="(tag, index) in editTags"
          :key="index"
          class="basic-info-panel__tag"
        >
          {{ tag }}
          <button
            class="basic-info-panel__tag-close"
            type="button"
            @click="removeTag(index)"
          >×</button>
        </span>
      </div>
    </div>

    <!-- 元数据 -->
    <div class="basic-info-panel__field">
      <label class="basic-info-panel__label">
        {{ t('card_settings.metadata') }}
      </label>
      <div class="basic-info-panel__metadata">
        <div
          v-for="item in metadataItems"
          :key="item.label"
          class="basic-info-panel__metadata-row"
        >
          <span class="basic-info-panel__metadata-label">{{ item.label }}</span>
          <span
            class="basic-info-panel__metadata-value"
            :class="{ 'basic-info-panel__metadata-value--mono': item.mono }"
          >
            {{ item.value }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-info-panel {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-lg, 20px);
}

.basic-info-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.basic-info-panel__label {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

.basic-info-panel__input :deep(.chips-input__inner) {
  padding: 8px 12px;
  border: 1px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text, #111827);
  background: var(--chips-color-surface, #ffffff);
  transition: border-color var(--chips-transition-fast, 150ms ease),
    box-shadow var(--chips-transition-fast, 150ms ease);
}

.basic-info-panel__input :deep(.chips-input__inner:focus) {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chips-color-primary) 15%, transparent);
}

.basic-info-panel__tag-input-row {
  display: flex;
  gap: var(--chips-spacing-sm, 8px);
}

.basic-info-panel__tag-input {
  flex: 1;
}

.basic-info-panel__tag-input :deep(.chips-input__inner) {
  padding: 8px 12px;
  border: 1px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text, #111827);
  background: var(--chips-color-surface, #ffffff);
  transition: border-color var(--chips-transition-fast, 150ms ease),
    box-shadow var(--chips-transition-fast, 150ms ease);
}

.basic-info-panel__tag-input :deep(.chips-input__inner:focus) {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chips-color-primary) 15%, transparent);
}

.basic-info-panel__tag-add-btn {
  flex-shrink: 0;
  padding: 8px var(--chips-spacing-md, 16px);
  border: 1px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
  color: var(--chips-color-text, #111827);
  font-size: var(--chips-font-size-sm, 14px);
  cursor: pointer;
  transition: border-color var(--chips-transition-fast, 150ms ease),
    background-color var(--chips-transition-fast, 150ms ease);
}

.basic-info-panel__tag-add-btn:hover {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 5%, transparent);
}

.basic-info-panel__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-spacing-sm, 8px);
  margin-top: var(--chips-spacing-xs, 4px);
}

/* 元数据区域 */
.basic-info-panel__metadata {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  background: color-mix(in srgb, var(--chips-color-text) 3%, transparent);
  border-radius: var(--chips-radius-md, 8px);
}

.basic-info-panel__metadata-row {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-md, 16px);
  font-size: 13px;
}

.basic-info-panel__metadata-label {
  color: var(--chips-color-text-secondary, #6b7280);
  min-width: 80px;
  flex-shrink: 0;
}

.basic-info-panel__metadata-value {
  color: var(--chips-color-text, #111827);
  word-break: break-all;
}

.basic-info-panel__metadata-value--mono {
  font-family: var(--chips-font-family-mono, 'SF Mono', Monaco, monospace);
  font-size: 12px;
}
</style>
