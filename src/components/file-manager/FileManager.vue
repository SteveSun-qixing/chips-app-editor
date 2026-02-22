<script setup lang="ts">
/**
 * 文件管理器主组件
 * @module components/file-manager/FileManager
 * @description 文件管理器主界面，包含工具栏、文件树和状态栏
 * 
 * 设计说明：
 * - 文件管理器显示工作区目录中的文件
 * - 工作区是编辑器的内置目录，所有文件都保存在这里
 * - 文件列表从 workspaceService 获取
 */

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Button, Input, type InputInstance } from '@chips/components';
import FileTree from './FileTree.vue';
import ContextMenu from './ContextMenu.vue';
import {
  type FileInfo,
  type ClipboardData,
  getFileService,
} from '@/core/file-service';
import { useWorkspaceService, type WorkspaceFile } from '@/core/workspace-service';
import { resourceService } from '@/services/resource-service';
import { createEventEmitter } from '@/core/event-manager';
import { t } from '@/services/i18n-service';
import { useGlobalDragCreate, type DragData } from '@/components/card-box-library';

interface Props {
  /** 初始工作目录 */
  workingDirectory?: string;
}

withDefaults(defineProps<Props>(), {
  workingDirectory: resourceService.workspaceRoot,
});

const emit = defineEmits<{
  /** 打开文件 */
  'open-file': [file: FileInfo];
  /** 创建卡片 */
  'create-card': [file: FileInfo];
  /** 创建箱子 */
  'create-box': [file: FileInfo];
}>();

// 获取工作区服务
const workspaceService = useWorkspaceService();
const dragCreate = useGlobalDragCreate();

// 获取文件服务实例（用于文件操作）
const events = createEventEmitter();
const fileService = getFileService(events);

/**
 * 将工作区文件转换为文件信息格式
 */
function convertWorkspaceFileToFileInfo(wsFile: WorkspaceFile): FileInfo {
  const baseFile: FileInfo = {
    id: wsFile.id,
    name: wsFile.name,
    path: wsFile.path,
    type: wsFile.type === 'folder' ? 'folder' : wsFile.type,
    size: 0,
    createdAt: wsFile.createdAt,
    modifiedAt: wsFile.modifiedAt,
    isDirectory: wsFile.type === 'folder',
  };

  if (wsFile.children && wsFile.children.length > 0) {
    baseFile.children = wsFile.children.map(convertWorkspaceFileToFileInfo);
  }

  if (wsFile.expanded !== undefined) {
    baseFile.expanded = wsFile.expanded;
  }

  return baseFile;
}

/** 文件树数据 */
const files = ref<FileInfo[]>([]);
/** 选中的文件路径 */
const selectedPaths = ref<string[]>([]);
/** 选中的文件 */
const selectedFiles = computed(() =>
  files.value.length > 0
    ? flattenAllFiles(files.value).filter((f) => selectedPaths.value.includes(f.path))
    : []
);
/** 正在重命名的文件路径 */
const renamingPath = ref<string | null>(null);
/** 搜索关键词 */
const searchQuery = ref('');
/** 搜索输入框引用 */
const searchInputRef = ref<InputInstance | null>(null);
/** 搜索结果 */
const searchResults = ref<FileInfo[]>([]);
/** 是否正在搜索 */
const isSearching = computed(() => searchQuery.value.trim().length > 0);
/** 搜索框是否展开 */
const isSearchExpanded = ref(false);
/** 显示的文件列表 */
const displayFiles = computed(() =>
  isSearching.value ? searchResults.value : files.value
);
/** 是否正在加载 */
const isLoading = ref(false);
/** 上下文菜单状态 */
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
});
/** 剪贴板数据 */
const clipboard = ref<ClipboardData | null>(null);
/** 是否有剪贴板内容 */
const hasClipboard = computed(() =>
  clipboard.value !== null && clipboard.value.files.length > 0
);

/**
 * 扁平化所有文件（包含嵌套）
 */
function flattenAllFiles(fileList: FileInfo[]): FileInfo[] {
  const result: FileInfo[] = [];
  const flatten = (list: FileInfo[]): void => {
    for (const file of list) {
      result.push(file);
      if (file.children) {
        flatten(file.children);
      }
    }
  };
  flatten(fileList);
  return result;
}

/**
 * 加载文件列表
 * 从工作区服务获取文件列表
 */
async function loadFiles(): Promise<void> {
  isLoading.value = true;
  try {
    // 确保工作区已初始化
    if (!workspaceService.isInitialized.value) {
      await workspaceService.initialize();
    }
    
    // 从工作区服务获取文件列表
    const wsFiles = workspaceService.files.value;
    files.value = wsFiles.map(convertWorkspaceFileToFileInfo);
  } catch (error) {
    console.error('Failed to load files:', error);
  } finally {
    isLoading.value = false;
  }
}


// 监听工作区文件变化
watch(
  () => workspaceService.files.value,
  () => {
    // 当工作区文件变化时，更新文件列表
    files.value = workspaceService.files.value.map(convertWorkspaceFileToFileInfo);
  },
  { deep: true }
);

/**
 * 处理文件选择
 */
function handleSelect(paths: string[], _files: FileInfo[]): void {
  selectedPaths.value = paths;
}

/**
 * 处理文件打开
 */
function handleOpen(file: FileInfo): void {
  emit('open-file', file);
}

/**
 * 处理右键菜单
 */
function handleContextMenu(_file: FileInfo, event: MouseEvent): void {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
  };
}

/**
 * 关闭右键菜单
 */
function closeContextMenu(): void {
  contextMenu.value.visible = false;
}

/**
 * 处理展开/收起
 */
async function handleToggle(file: FileInfo): Promise<void> {
  await fileService.toggleFolderExpanded(file.path);
  // 重新加载以获取更新后的状态
  files.value = await fileService.getFileTree();
}

/**
 * 处理重命名
 */
async function handleRename(file: FileInfo, newName: string): Promise<void> {
  const result = await fileService.renameFile(file.path, newName);
  if (result.success) {
    await loadFiles();
    renamingPath.value = null;
  } else {
    console.error('Rename failed:', result.error);
  }
}

/**
 * 取消重命名
 */
function handleRenameCancel(): void {
  renamingPath.value = null;
}

/**
 * 处理搜索
 */
async function handleSearch(): Promise<void> {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  searchResults.value = await fileService.searchFiles(searchQuery.value);
}

/**
 * 处理文件拖放开始
 * 支持将卡片/箱子文件拖到桌面层
 */
function handleFileDragStart(file: FileInfo, event: DragEvent): void {
  if (file.type !== 'card' && file.type !== 'box') {
    return;
  }

  const dragData: DragData = {
    type: 'workspace-file',
    fileId: file.id,
    fileType: file.type,
    filePath: file.path,
    name: file.name,
  };

  dragCreate.startDrag(dragData, event);
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchQuery.value = '';
  searchResults.value = [];
}

/**
 * 切换搜索框显示状态
 */
async function toggleSearch(): Promise<void> {
  isSearchExpanded.value = !isSearchExpanded.value;
  if (isSearchExpanded.value) {
    await nextTick();
    searchInputRef.value?.focus();
  } else {
    clearSearch();
  }
}

/**
 * 关闭搜索框
 */
function closeSearch(): void {
  if (isSearchExpanded.value) {
    isSearchExpanded.value = false;
    clearSearch();
  }
}

/**
 * 处理上下文菜单操作
 */
async function handleContextMenuAction(actionId: string, targetFiles: FileInfo[]): Promise<void> {
  const targetPath = targetFiles[0]?.isDirectory 
    ? targetFiles[0].path 
    : fileService.getWorkingDirectory();

  switch (actionId) {
    case 'new-card': {
      const result = await fileService.createCard({
        name: 'file.untitled_card',
        parentPath: targetPath,
      });
      if (result.success && result.file) {
        await loadFiles();
        // 自动进入重命名状态
        renamingPath.value = result.file.path;
        emit('create-card', result.file);
      }
      break;
    }

    case 'new-box': {
      const result = await fileService.createBox({
        name: 'file.untitled_box',
        parentPath: targetPath,
      });
      if (result.success && result.file) {
        await loadFiles();
        renamingPath.value = result.file.path;
        emit('create-box', result.file);
      }
      break;
    }

    case 'open':
      if (targetFiles[0]) {
        handleOpen(targetFiles[0]);
      }
      break;

    case 'cut':
      fileService.cutToClipboard(targetFiles.map((f) => f.path));
      clipboard.value = fileService.getClipboard();
      break;

    case 'copy':
      fileService.copyToClipboard(targetFiles.map((f) => f.path));
      clipboard.value = fileService.getClipboard();
      break;

    case 'paste':
      await fileService.paste(targetPath);
      clipboard.value = fileService.getClipboard();
      await loadFiles();
      break;

    case 'rename':
      if (targetFiles[0]) {
        renamingPath.value = targetFiles[0].path;
      }
      break;

    case 'delete':
      for (const file of targetFiles) {
        await fileService.deleteFile(file.path);
      }
      selectedPaths.value = [];
      await loadFiles();
      break;

    case 'reveal':
      // TODO: 实现在资源管理器中显示
      console.warn('Reveal in finder:', targetFiles[0]?.path);
      break;
  }
}

/**
 * 处理快捷键
 */
function handleKeyDown(event: KeyboardEvent): void {
  // 如果正在重命名，不处理快捷键
  if (renamingPath.value) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      if (selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('delete', selectedFiles.value);
      }
      break;

    case 'F2':
      if (selectedFiles.value.length === 1) {
        event.preventDefault();
        const [selectedFile] = selectedFiles.value;
        if (selectedFile) {
          renamingPath.value = selectedFile.path;
        }
      }
      break;

    case 'c':
      if (modKey && selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('copy', selectedFiles.value);
      }
      break;

    case 'x':
      if (modKey && selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('cut', selectedFiles.value);
      }
      break;

    case 'v':
      if (modKey && hasClipboard.value) {
        event.preventDefault();
        handleContextMenuAction('paste', selectedFiles.value);
      }
      break;

    case 'f':
      if (modKey) {
        event.preventDefault();
        if (!isSearchExpanded.value) {
          toggleSearch();
        } else {
          searchInputRef.value?.focus();
        }
      }
      break;

    case 'Enter':
      if (selectedFiles.value.length === 1) {
        const [file] = selectedFiles.value;
        if (!file) {
          break;
        }
        if (file.isDirectory) {
          handleToggle(file);
        } else {
          handleOpen(file);
        }
      }
      break;

    case 'Escape':
      if (isSearchExpanded.value) {
        closeSearch();
      }
      break;
  }
}

// 监听搜索关键词变化
watch(searchQuery, handleSearch);

// 挂载时加载文件
onMounted(async () => {
  await loadFiles();
  window.addEventListener('keydown', handleKeyDown);
});

// 卸载时清理
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="file-manager">
    <!-- 工具栏 -->
    <div class="file-manager__toolbar">
      <div class="file-manager__toolbar-left">
        <Button
          class="file-manager__btn file-manager__btn--icon"
          :title="t('file_manager.new_card')"
          html-type="button"
          type="text"
          @click="handleContextMenuAction('new-card', [])"
        >
          🃏
        </Button>
        <Button
          class="file-manager__btn file-manager__btn--icon"
          :title="t('file_manager.new_box')"
          html-type="button"
          type="text"
          @click="handleContextMenuAction('new-box', [])"
        >
          📦
        </Button>
      </div>

      <!-- 搜索按钮 -->
      <Button
        class="file-manager__btn file-manager__btn--icon"
        :title="t('file_manager.search_placeholder')"
        html-type="button"
        type="text"
        @click="toggleSearch"
      >
        🔍
      </Button>
    </div>

    <!-- 搜索框（单独一行） -->
    <Transition name="search-expand">
      <div v-if="isSearchExpanded" class="file-manager__search-row">
        <Input
          ref="searchInputRef"
          v-model="searchQuery"
          class="file-manager__search-input"
          :placeholder="t('file_manager.search_placeholder')"
          clearable
          @clear="clearSearch"
        >
          <template #prefix>🔍</template>
        </Input>
        <Button
          class="file-manager__search-close"
          html-type="button"
          type="text"
          title="关闭搜索"
          @click="closeSearch"
        >
          ✕
        </Button>
      </div>
    </Transition>

    <!-- 文件树 -->
    <div class="file-manager__content">
      <div v-if="isLoading" class="file-manager__loading">
        <span class="file-manager__loading-spinner">⏳</span>
        <span>{{ t('file_manager.loading') }}</span>
      </div>

      <!-- 空状态：没有文件 -->
      <div v-else-if="displayFiles.length === 0 && !isSearching" class="file-manager__empty">
        <span class="file-manager__empty-icon">📂</span>
        <span class="file-manager__empty-title">{{ t('file_manager.empty_title') }}</span>
        <span class="file-manager__empty-hint">
          {{ t('file_manager.empty_hint_line1') }}<br/>
          {{ t('file_manager.empty_hint_line2') }}
        </span>
        <div class="file-manager__empty-actions">
          <Button
            class="file-manager__empty-btn"
            html-type="button"
            type="text"
            @click="handleContextMenuAction('open-file', [])"
          >
            📄 {{ t('file_manager.open_file') }}
          </Button>
          <Button
            class="file-manager__empty-btn"
            html-type="button"
            type="text"
            @click="handleContextMenuAction('open-folder', [])"
          >
            📁 {{ t('file_manager.open_folder') }}
          </Button>
        </div>
      </div>

      <!-- 搜索无结果 -->
      <div v-else-if="displayFiles.length === 0 && isSearching" class="file-manager__empty">
        <span class="file-manager__empty-icon">🔍</span>
        <span class="file-manager__empty-title">{{ t('file_manager.search_empty_title') }}</span>
        <Button class="file-manager__empty-btn" html-type="button" type="text" @click="clearSearch">
          {{ t('file_manager.clear_search') }}
        </Button>
      </div>

      <FileTree
        v-else
        :files="displayFiles"
        :selected-paths="selectedPaths"
        :renaming-path="renamingPath"
        :search-query="searchQuery"
        :multi-select="true"
        @select="handleSelect"
        @open="handleOpen"
        @contextmenu="handleContextMenu"
        @toggle="handleToggle"
        @rename="handleRename"
        @rename-cancel="handleRenameCancel"
        @drag-start="handleFileDragStart"
      />
    </div>

    <!-- 状态栏 -->
    <div class="file-manager__statusbar">
      <template v-if="isSearching">
        <span>{{ t('file_manager.search_results') }}</span>
        <span class="file-manager__statusbar-count">{{ searchResults.length }}</span>
      </template>
      <template v-else>
        <span v-if="selectedPaths.length > 0">
          {{ t('file_manager.selected_count') }}
          <span class="file-manager__statusbar-count">{{ selectedPaths.length }}</span>
        </span>
        <span v-else>
          {{ t('file_manager.total_items') }}
          <span class="file-manager__statusbar-count">{{ flattenAllFiles(files).length }}</span>
        </span>
      </template>
    </div>

    <!-- 上下文菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :selected-files="selectedFiles"
      :has-clipboard="hasClipboard"
      @close="closeContextMenu"
      @action="handleContextMenuAction"
    />
  </div>
</template>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--chips-color-bg-secondary, #f8f9fa);
}

/* 工具栏 */
.file-manager__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background-color: var(--chips-color-bg-primary, #fff);
  border-bottom: 1px solid var(--chips-color-border-light, #f0f0f0);
  flex-wrap: nowrap;
}

.file-manager__toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  flex-shrink: 0;
}

.file-manager__toolbar-divider {
  width: 1px;
  height: 20px;
  background-color: var(--chips-color-border, #e0e0e0);
  margin: 0 var(--chips-spacing-xs, 4px);
}

.file-manager__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xs, 4px);
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.file-manager__btn:hover:not(:disabled) {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.05));
}

.file-manager__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-manager__btn--icon {
  width: 28px;
  height: 28px;
  font-size: 16px;
}

/* 搜索框行（单独一行） */
.file-manager__search-row {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background-color: var(--chips-color-bg-primary, #fff);
  border-bottom: 1px solid var(--chips-color-border-light, #f0f0f0);
}

.file-manager__search-input {
  flex: 1;
}

.file-manager__search-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  font-size: 14px;
  color: var(--chips-color-text-secondary, #666);
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.file-manager__search-close:hover {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--chips-color-text-primary, #1a1a1a);
}

.file-manager__search:focus-within {
  background-color: var(--chips-color-bg-primary, #fff);
  border-color: var(--chips-color-primary, #1890ff);
}

.file-manager__search-input {
  flex: 1;
}

.file-manager__search-input :deep(.chips-input__wrapper) {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-radius: var(--chips-radius-sm, 4px);
  border: 1px solid transparent;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.file-manager__search-input :deep(.chips-input__wrapper:focus-within) {
  background-color: var(--chips-color-bg-primary, #fff);
  border-color: var(--chips-color-primary, #1890ff);
}

.file-manager__search-input :deep(.chips-input__prefix) {
  font-size: 12px;
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__search-input :deep(.chips-input__inner) {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  outline: none;
}

.file-manager__search-input :deep(.chips-input__inner::placeholder) {
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__search-input :deep(.chips-input__clear) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: var(--chips-color-text-tertiary, #999);
  color: var(--chips-color-bg-primary, #fff);
  border-radius: var(--chips-radius-full, 9999px);
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.file-manager__search-input :deep(.chips-input__clear:hover) {
  background-color: var(--chips-color-text-secondary, #666);
}

/* 内容区 */
.file-manager__content {
  flex: 1;
  overflow: hidden;
  background-color: var(--chips-color-bg-primary, #fff);
}

/* 加载状态 */
.file-manager__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--chips-spacing-sm, 8px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__loading-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 状态栏 */
.file-manager__statusbar {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-secondary, #f8f9fa);
  border-top: 1px solid var(--chips-color-border-light, #f0f0f0);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__statusbar-count {
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-secondary, #666);
}

/* 空状态 */
.file-manager__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.file-manager__empty-title {
  font-size: var(--chips-font-size-md, 16px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-secondary, #666);
}

.file-manager__empty-hint {
  font-size: var(--chips-font-size-sm, 14px);
  text-align: center;
  line-height: 1.5;
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__empty-actions {
  display: flex;
  gap: var(--chips-spacing-sm, 8px);
  margin-top: var(--chips-spacing-md, 16px);
}

.file-manager__empty-btn {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 16px);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  background: var(--chips-color-bg-primary, #fff);
  border-radius: var(--chips-radius-base, 6px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-manager__empty-btn:hover {
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-color: var(--chips-color-primary, #1890ff);
  color: var(--chips-color-primary, #1890ff);
}

/* 搜索框展开动画 */
.search-expand-enter-active,
.search-expand-leave-active {
  transition: opacity 0.2s ease, max-height 0.2s ease;
  max-height: 100px;
  overflow: hidden;
}

.search-expand-enter-from,
.search-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
