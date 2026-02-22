<script setup lang="ts">
/* eslint-disable vue/no-v-html */
/**
 * 文件项组件
 * @module components/file-manager/FileItem
 * @description 单个文件项的显示组件，支持图标、名称、状态显示和重命名
 */

import { ref, computed, watch, nextTick } from 'vue';
import { Button, Input, type InputInstance } from '@chips/components';
import type { FileInfo } from '@/core/file-service';

interface Props {
  /** 文件信息 */
  file: FileInfo;
  /** 缩进级别 */
  level?: number;
  /** 是否选中 */
  selected?: boolean;
  /** 是否正在重命名 */
  renaming?: boolean;
  /** 搜索关键词（用于高亮） */
  searchQuery?: string;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  selected: false,
  renaming: false,
  searchQuery: '',
});

const emit = defineEmits<{
  /** 点击文件 */
  click: [file: FileInfo, event: MouseEvent];
  /** 双击文件 */
  dblclick: [file: FileInfo];
  /** 右键菜单 */
  contextmenu: [file: FileInfo, event: MouseEvent];
  /** 切换展开 */
  toggle: [file: FileInfo];
  /** 重命名完成 */
  rename: [file: FileInfo, newName: string];
  /** 取消重命名 */
  'rename-cancel': [];
  /** 开始拖放文件 */
  dragstart: [file: FileInfo, event: DragEvent];
}>();

/** 重命名输入框引用 */
const renameInput = ref<InputInstance | null>(null);
/** 重命名输入值 */
const renameValue = ref('');

/** 文件图标 */
const fileIcon = computed(() => {
  if (props.file.isDirectory) {
    return props.file.expanded ? '📂' : '📁';
  }
  switch (props.file.type) {
    case 'card':
      return '🃏';
    case 'box':
      return '📦';
    default:
      return '📄';
  }
});

/** 缩进样式 */
const indentStyle = computed(() => ({
  paddingLeft: `${props.level * 16 + 8}px`,
}));

/** 高亮显示的文件名 */
const highlightedName = computed(() => {
  if (!props.searchQuery) {
    return props.file.name;
  }
  
  const query = props.searchQuery.toLowerCase();
  const name = props.file.name;
  const lowerName = name.toLowerCase();
  const index = lowerName.indexOf(query);
  
  if (index === -1) {
    return name;
  }
  
  const before = name.substring(0, index);
  const match = name.substring(index, index + query.length);
  const after = name.substring(index + query.length);
  
  return `${before}<mark class="file-item__highlight">${match}</mark>${after}`;
});

/** 监听重命名状态变化 */
watch(
  () => props.renaming,
  async (isRenaming) => {
    if (isRenaming) {
      // 初始化重命名值（不含扩展名）
      const name = props.file.name;
      const dotIndex = name.lastIndexOf('.');
      renameValue.value = dotIndex > 0 ? name.substring(0, dotIndex) : name;
      
      await nextTick();
      renameInput.value?.focus();
      renameInput.value?.select();
    }
  }
);

/**
 * 处理点击事件
 */
function handleClick(event: MouseEvent): void {
  emit('click', props.file, event);
}

/**
 * 处理双击事件
 */
function handleDoubleClick(): void {
  if (!props.renaming) {
    emit('dblclick', props.file);
  }
}

/**
 * 处理右键菜单
 */
function handleContextMenu(event: MouseEvent): void {
  event.preventDefault();
  emit('contextmenu', props.file, event);
}

/**
 * 处理展开/收起
 */
function handleToggle(event: MouseEvent): void {
  event.stopPropagation();
  if (props.file.isDirectory) {
    emit('toggle', props.file);
  }
}

/**
 * 确认重命名
 */
function confirmRename(): void {
  const newName = renameValue.value.trim();
  if (newName && newName !== props.file.name) {
    emit('rename', props.file, newName);
  } else {
    emit('rename-cancel');
  }
}

/**
 * 取消重命名
 */
function cancelRename(): void {
  emit('rename-cancel');
}

/**
 * 处理重命名输入框按键
 */
function handleRenameKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    confirmRename();
  } else if (event.key === 'Escape') {
    cancelRename();
  }
}

/**
 * 处理拖拽开始
 */
function handleDragStart(event: DragEvent): void {
  emit('dragstart', props.file, event);
}
</script>

<template>
  <div
    class="file-item"
    :class="{
      'file-item--selected': selected,
      'file-item--directory': file.isDirectory,
      'file-item--renaming': renaming,
    }"
    :style="indentStyle"
    :draggable="!renaming && !file.isDirectory && (file.type === 'card' || file.type === 'box')"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
    @dragstart="handleDragStart"
  >
    <!-- 展开/收起箭头 -->
    <Button
      v-if="file.isDirectory"
      class="file-item__toggle"
      html-type="button"
      type="text"
      @click="handleToggle"
    >
      <span
        class="file-item__arrow"
        :class="{ 'file-item__arrow--expanded': file.expanded }"
      >
        ▶
      </span>
    </Button>
    <span v-else class="file-item__toggle-placeholder"></span>

    <!-- 文件图标 -->
    <span class="file-item__icon">{{ fileIcon }}</span>

    <!-- 文件名 -->
    <template v-if="renaming">
      <Input
        ref="renameInput"
        v-model="renameValue"
        class="file-item__rename-input"
        type="text"
        @blur="confirmRename"
        @keydown="handleRenameKeydown"
      />
    </template>
    <template v-else>
      <span
        class="file-item__name"
        v-html="highlightedName"
      ></span>
    </template>

    <!-- 状态指示器 -->
    <span v-if="file.isDirectory && file.children?.length" class="file-item__badge">
      {{ file.children.length }}
    </span>
  </div>
</template>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  cursor: pointer;
  user-select: none;
  border-radius: var(--chips-radius-sm, 4px);
  transition: background-color 0.15s ease;
}

.file-item:hover {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.05));
}

.file-item--selected {
  background-color: var(--chips-color-primary-light, #e3f2fd);
}

.file-item--selected:hover {
  background-color: var(--chips-color-primary-lighter, #bbdefb);
}

.file-item__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.file-item__toggle:hover {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.1));
  border-radius: var(--chips-radius-sm, 2px);
}

.file-item__toggle-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.file-item__arrow {
  font-size: 8px;
  color: var(--chips-color-text-secondary, #666);
  transition: transform 0.15s ease;
}

.file-item__arrow--expanded {
  transform: rotate(90deg);
}

.file-item__icon {
  font-size: var(--chips-font-size-md, 16px);
  flex-shrink: 0;
}

.file-item__name {
  flex: 1;
  min-width: 0;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-item__rename-input {
  flex: 1;
  min-width: 0;
}

.file-item__rename-input .chips-input__inner {
  padding: 2px 4px;
  font-size: var(--chips-font-size-sm, 14px);
  border: 1px solid var(--chips-color-primary, #1890ff);
  border-radius: var(--chips-radius-sm, 2px);
  outline: none;
  background-color: var(--chips-color-bg-primary, #fff);
}

.file-item__rename-input .chips-input__inner:focus {
  box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(24, 144, 255, 0.2));
}

.file-item__badge {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  padding: 0 6px;
  border-radius: var(--chips-radius-full, 9999px);
}

/* 搜索高亮 */
.file-item__name :deep(.file-item__highlight) {
  background-color: var(--chips-color-warning-light, #fff3cd);
  color: var(--chips-color-warning-dark, #856404);
  padding: 0 2px;
  border-radius: 2px;
}
</style>
