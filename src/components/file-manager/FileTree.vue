<script setup lang="ts">
/**
 * 文件树组件
 * @module components/file-manager/FileTree
 * @description 树形结构显示文件，支持展开/收起、多选、键盘导航
 */

import { ref, watch, onMounted, onUnmounted } from 'vue';
import FileItem from './FileItem.vue';
import type { FileInfo } from '@/core/file-service';
import { t } from '@/services/i18n-service';

interface Props {
  /** 文件列表 */
  files: FileInfo[];
  /** 选中的文件路径列表 */
  selectedPaths: string[];
  /** 正在重命名的文件路径 */
  renamingPath: string | null;
  /** 搜索关键词 */
  searchQuery: string;
  /** 是否允许多选 */
  multiSelect: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPaths: () => [],
  renamingPath: null,
  searchQuery: '',
  multiSelect: false,
});

const emit = defineEmits<{
  /** 选择文件 */
  select: [paths: string[], files: FileInfo[]];
  /** 打开文件 */
  open: [file: FileInfo];
  /** 右键菜单 */
  contextmenu: [file: FileInfo, event: MouseEvent];
  /** 切换展开 */
  toggle: [file: FileInfo];
  /** 重命名 */
  rename: [file: FileInfo, newName: string];
  /** 取消重命名 */
  'rename-cancel': [];
  /** 开始拖放文件 */
  dragStart: [file: FileInfo, event: DragEvent];
}>();

/** 树容器引用 */
const treeRef = ref<HTMLElement | null>(null);
/** 当前焦点索引 */
const focusIndex = ref(-1);
/** 扁平化的文件列表（用于键盘导航） */
const flattenedFiles = ref<FileInfo[]>([]);

/**
 * 扁平化文件列表（只包含可见的文件）
 */
function flattenFiles(files: FileInfo[], result: FileInfo[] = []): FileInfo[] {
  for (const file of files) {
    result.push(file);
    if (file.isDirectory && file.expanded && file.children) {
      flattenFiles(file.children, result);
    }
  }
  return result;
}

/**
 * 更新扁平化列表
 */
function updateFlattenedList(): void {
  flattenedFiles.value = flattenFiles(props.files);
}

// 监听文件列表变化，更新扁平化列表
watch(() => props.files, updateFlattenedList, { deep: true, immediate: true });

/**
 * 获取文件级别
 */
function getFileLevel(file: FileInfo): number {
  const parts = file.path.split('/').filter(Boolean);
  return Math.max(0, parts.length - 2); // workspace 不计入层级
}

/**
 * 处理文件点击
 */
function handleFileClick(file: FileInfo, event: MouseEvent): void {
  const paths: string[] = [];
  const files: FileInfo[] = [];

  if (props.multiSelect && (event.ctrlKey || event.metaKey)) {
    // 多选：切换选中状态
    const currentPaths = [...props.selectedPaths];
    const index = currentPaths.indexOf(file.path);
    if (index > -1) {
      currentPaths.splice(index, 1);
    } else {
      currentPaths.push(file.path);
    }
    
    for (const path of currentPaths) {
      const f = flattenedFiles.value.find((f) => f.path === path);
      if (f) {
        paths.push(path);
        files.push(f);
      }
    }
  } else if (props.multiSelect && event.shiftKey && props.selectedPaths.length > 0) {
    // 范围选择
    const lastSelected = props.selectedPaths[props.selectedPaths.length - 1];
    const lastIndex = flattenedFiles.value.findIndex((f) => f.path === lastSelected);
    const currentIndex = flattenedFiles.value.findIndex((f) => f.path === file.path);
    
    if (lastIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      
      for (let i = start; i <= end; i++) {
        const f = flattenedFiles.value[i];
        if (f) {
          paths.push(f.path);
          files.push(f);
        }
      }
    }
  } else {
    // 单选
    paths.push(file.path);
    files.push(file);
  }

  // 更新焦点索引
  focusIndex.value = flattenedFiles.value.findIndex((f) => f.path === file.path);
  
  emit('select', paths, files);
}

/**
 * 处理文件双击
 */
function handleFileDoubleClick(file: FileInfo): void {
  if (file.isDirectory) {
    emit('toggle', file);
  } else {
    emit('open', file);
  }
}

/**
 * 处理右键菜单
 */
function handleContextMenu(file: FileInfo, event: MouseEvent): void {
  // 如果右键的文件不在选中列表中，先选中它
  if (!props.selectedPaths.includes(file.path)) {
    emit('select', [file.path], [file]);
  }
  emit('contextmenu', file, event);
}

/**
 * 处理展开/收起
 */
function handleToggle(file: FileInfo): void {
  emit('toggle', file);
}

/**
 * 处理重命名
 */
function handleRename(file: FileInfo, newName: string): void {
  emit('rename', file, newName);
}

/**
 * 处理取消重命名
 */
function handleRenameCancel(): void {
  emit('rename-cancel');
}

/**
 * 处理拖拽开始
 */
function handleDragStart(file: FileInfo, event: DragEvent): void {
  emit('dragStart', file, event);
}

/**
 * 键盘导航处理
 */
function handleKeyDown(event: KeyboardEvent): void {
  const files = flattenedFiles.value;
  if (files.length === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusIndex.value = Math.min(focusIndex.value + 1, files.length - 1);
      selectFocusedFile();
      break;

    case 'ArrowUp':
      event.preventDefault();
      focusIndex.value = Math.max(focusIndex.value - 1, 0);
      selectFocusedFile();
      break;

    case 'ArrowRight': {
      event.preventDefault();
      const file = files[focusIndex.value];
      if (file?.isDirectory && !file.expanded) {
        emit('toggle', file);
      }
      break;
    }

    case 'ArrowLeft': {
      event.preventDefault();
      const file = files[focusIndex.value];
      if (file?.isDirectory && file.expanded) {
        emit('toggle', file);
      }
      break;
    }

    case 'Enter': {
      event.preventDefault();
      const file = files[focusIndex.value];
      if (file) {
        if (file.isDirectory) {
          emit('toggle', file);
        } else {
          emit('open', file);
        }
      }
      break;
    }

    case 'Home':
      event.preventDefault();
      focusIndex.value = 0;
      selectFocusedFile();
      break;

    case 'End':
      event.preventDefault();
      focusIndex.value = files.length - 1;
      selectFocusedFile();
      break;
  }
}

/**
 * 选中当前焦点的文件
 */
function selectFocusedFile(): void {
  const file = flattenedFiles.value[focusIndex.value];
  if (file) {
    emit('select', [file.path], [file]);
  }
}

// 挂载时添加键盘事件监听
onMounted(() => {
  treeRef.value?.addEventListener('keydown', handleKeyDown);
});

// 卸载时移除键盘事件监听
onUnmounted(() => {
  treeRef.value?.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div
    ref="treeRef"
    class="file-tree"
    tabindex="0"
    role="tree"
    :aria-label="t('file.tree_label')"
  >
    <template v-if="files.length > 0">
      <template v-for="file in flattenedFiles" :key="file.path">
        <FileItem
          :file="file"
          :level="getFileLevel(file)"
          :selected="selectedPaths.includes(file.path)"
          :renaming="renamingPath === file.path"
          :search-query="searchQuery"
          @click="handleFileClick"
          @dblclick="handleFileDoubleClick"
          @contextmenu="handleContextMenu"
          @toggle="handleToggle"
          @rename="handleRename"
          @rename-cancel="handleRenameCancel"
          @dragstart="handleDragStart"
        />
      </template>
    </template>
    <template v-else>
      <div class="file-tree__empty">
        <span class="file-tree__empty-icon">📁</span>
        <span class="file-tree__empty-text">{{ t('file.empty_folder') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.file-tree {
  flex: 1;
  overflow: auto;
  outline: none;
}

.file-tree:focus-visible {
  box-shadow: inset 0 0 0 2px var(--chips-color-primary-light, rgba(24, 144, 255, 0.3));
}

.file-tree__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-tree__empty-icon {
  font-size: 48px;
  margin-bottom: var(--chips-spacing-sm, 8px);
  opacity: 0.5;
}

.file-tree__empty-text {
  font-size: var(--chips-font-size-sm, 14px);
}
</style>
