<script setup lang="ts">
/**
 * 窗口菜单栏组件
 * @module components/window/WindowMenu
 * @description 提供卡片窗口的菜单栏功能，包括标题编辑、模式切换等
 */

import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { Button, Input, type InputInstance } from '@chips/components';
import { t } from '@/services/i18n-service';

interface Props {
  /** 窗口标题 */
  title: string;
  /** 是否处于编辑模式 */
  isEditing?: boolean;
  /** 是否显示锁定按钮 */
  showLock?: boolean;
  /** 是否显示设置按钮 */
  showSettings?: boolean;
  /** 是否显示封面按钮 */
  showCover?: boolean;
}

withDefaults(defineProps<Props>(), {
  isEditing: false,
  showLock: false,
  showSettings: true,
  showCover: true,
});

const emit = defineEmits<{
  /** 切换编辑模式 */
  toggleEdit: [];
  /** 切换到封面 */
  switchToCover: [];
  /** 打开设置 */
  settings: [];
  /** 更新标题 */
  'update:title': [title: string];
}>();

// 标题编辑状态
const isEditingTitle = ref(false);
const editingTitle = ref('');
const titleInputRef = ref<InputInstance | null>(null);

function getTitleInputElement(): HTMLInputElement | null {
  return titleInputRef.value?.inputRef ?? null;
}

/**
 * 开始编辑标题
 */
async function startEditTitle(currentTitle: string): Promise<void> {
  editingTitle.value = currentTitle;
  isEditingTitle.value = true;
  
  // 等待 DOM 更新后聚焦
  await nextTick();
  titleInputRef.value?.focus();
  titleInputRef.value?.select();
}

/**
 * 保存标题
 */
function saveTitle(): void {
  if (!isEditingTitle.value) return;
  
  const trimmedTitle = editingTitle.value.trim();
  if (trimmedTitle && trimmedTitle !== '') {
    emit('update:title', trimmedTitle);
  }
  isEditingTitle.value = false;
}

/**
 * 取消编辑标题
 */
function cancelEditTitle(): void {
  isEditingTitle.value = false;
}

/**
 * 处理键盘事件
 */
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveTitle();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelEditTitle();
  }
}

/**
 * 处理全局 mousedown 事件
 * 在 mousedown 阶段就检测，确保 blur 之前处理
 */
function handleGlobalMousedown(e: MouseEvent): void {
  if (!isEditingTitle.value) return;
  
  const target = e.target as HTMLElement;
  // 如果点击的不是输入框本身，则保存并关闭
  const inputElement = getTitleInputElement();
  if (inputElement && !inputElement.contains(target)) {
    saveTitle();
  }
}

// 挂载时添加全局事件监听
onMounted(() => {
  document.addEventListener('mousedown', handleGlobalMousedown, true);
});

// 卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('mousedown', handleGlobalMousedown, true);
});

/**
 * 切换编辑模式
 */
function handleToggleEdit(): void {
  emit('toggleEdit');
}

/**
 * 切换到封面
 */
function handleSwitchToCover(): void {
  emit('switchToCover');
}

/**
 * 打开设置
 */
function handleSettings(): void {
  emit('settings');
}
</script>

<template>
  <div class="window-menu">
    <div class="window-menu__left">
      <!-- 卡片名称 -->
      <div
        v-if="!isEditingTitle"
        class="window-menu__title"
        @dblclick="startEditTitle(title)"
      >
        {{ title }}
      </div>
      <Input
        v-else
        ref="titleInputRef"
        v-model="editingTitle"
        class="window-menu__title-input"
        type="text"
        @blur="saveTitle"
        @keydown="handleKeydown"
      />
    </div>

    <div class="window-menu__right">
      <!-- 锁定/编辑模式切换 -->
      <Button
        v-if="showLock"
        class="window-menu__button"
        :class="{ 'window-menu__button--active': isEditing }"
        html-type="button"
        type="text"
        :title="isEditing ? t('window_menu.switch_view') : t('window_menu.switch_edit')"
        :aria-label="isEditing ? t('window_menu.switch_view') : t('window_menu.switch_edit')"
        @click="handleToggleEdit"
      >
        <span class="window-menu__button-icon">{{ isEditing ? '🔓' : '🔒' }}</span>
      </Button>

      <!-- 切换到封面 -->
      <Button
        v-if="showCover"
        class="window-menu__button"
        html-type="button"
        type="text"
        :title="t('window_menu.switch_cover')"
        :aria-label="t('window_menu.switch_cover')"
        @click="handleSwitchToCover"
      >
        <span class="window-menu__button-icon">🖼️</span>
      </Button>

      <!-- 设置 -->
      <Button
        v-if="showSettings"
        class="window-menu__button"
        html-type="button"
        type="text"
        :title="t('window_menu.settings')"
        :aria-label="t('window_menu.settings')"
        @click="handleSettings"
      >
        <span class="window-menu__button-icon">⚙️</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.window-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 var(--chips-spacing-xs, 4px);
  min-height: 24px;
}

.window-menu__left {
  flex: 1;
  min-width: 0;
}

.window-menu__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: var(--chips-spacing-xs, 4px) 0;
}

.window-menu__title:hover {
  color: var(--chips-color-primary, #3b82f6);
}

.window-menu__title-input {
  width: 100%;
}

.window-menu__title-input .chips-input__inner {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  border: none;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-sm, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  outline: none;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.window-menu__title-input .chips-input__inner:focus {
  box-shadow: 0 0 0 2px var(--chips-color-primary, #3b82f6);
}

.window-menu__right {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  margin-left: var(--chips-spacing-md, 12px);
  flex-shrink: 0;
}

.window-menu__button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
}

.window-menu__button:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.window-menu__button--active {
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
}

.window-menu__button--active:hover {
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.15));
}

.window-menu__button-icon {
  font-size: var(--chips-font-size-sm, 14px);
  line-height: 1;
}
</style>
