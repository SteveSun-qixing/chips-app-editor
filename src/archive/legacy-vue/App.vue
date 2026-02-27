<script setup lang="ts">
/**
 * Chips Editor - 根组件
 * @module App
 * @description 编辑器应用入口，集成无限画布布局
 */

import { ref, onMounted, onUnmounted, provide, computed } from 'vue';
import { ThemeProvider, Button } from '@chips/component-library';
import { InfiniteCanvas, Workbench } from '@/layouts';
import { useEditorStore, useUIStore, useCardStore, useSettingsStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import { useWorkspaceService } from '@/core/workspace-service';
import { FileManager } from '@/components/file-manager';
import { EditPanel } from '@/components/edit-panel';
import { CardBoxLibrary, type DragData } from '@/components/card-box-library';
import { EngineSettingsDialog, builtinPanelDefinitions } from '@/components/engine-settings';
import type { CardWindowConfig, ToolWindowConfig } from '@/types';
import { generateId62, generateScopedId } from '@/utils';
import { initializeEditorI18n, t, setLocale } from '@/services/i18n-service';
import { initializeSettingsService } from '@/services/settings-service';
import { setContainerWidth, toPx } from '@/services/page-layout-service';
import { resourceService, setWorkspacePaths } from '@/services/resource-service';
import { subscribeEditorRuntimeEvent } from '@/services/editor-runtime-gateway';
import { loadBaseCardConfigsFromContent } from '@/core/base-card-content-loader';
import { requireCardPath } from '@/services/card-path-service';
import { persistInsertedBaseCard } from '@/services/card-persistence-service';
import {
  subscribePluginInit,
  extractLaunchFilePath,
  extractWorkspaceRoot,
  extractExternalRoot,
} from '@/utils/plugin-init';
import type { PluginInitPayload } from '@/types/plugin-init';
import yaml from 'yaml';

/** 编辑器状态 Store */
const editorStore = useEditorStore();
const uiStore = useUIStore();
const cardStore = useCardStore();
const settingsStore = useSettingsStore();
const windowManager = useWindowManager();
const workspaceService = useWorkspaceService();

/** 应用状态 */
const isReady = ref(false);
const errorMessage = ref<string | null>(null);

/** 引擎设置弹窗状态 */
const showEngineSettings = ref(false);

/**
 * 打开引擎设置弹窗
 */
function openEngineSettings(): void {
  showEngineSettings.value = true;
}

/**
 * 关闭引擎设置弹窗
 */
function closeEngineSettings(): void {
  showEngineSettings.value = false;
}

/** 当前布局类型 */
const currentLayout = computed(() => editorStore.currentLayout);
const locale = computed(() => editorStore.locale);
const currentTheme = computed(() => uiStore.theme);

if (typeof window !== 'undefined') {
  setContainerWidth(window.innerWidth);
}

const TOOL_WINDOW_CPX = {
  topOffset: 20,
  leftOffset: 20,
  fileManagerWidth: 280,
  toolWindowWidth: 320,
  cardBoxWidth: 400,
  cardWindowWidth: 360,
  windowHeight: 500,
  cardBoxHeight: 300,
  cardBoxBottomOffset: 350,
} as const;

interface CardWindowDropTarget {
  type: 'card-window';
  cardId: string;
  insertIndex?: number;
}

/**
 * 初始化工具窗口到 uiStore
 */
function initializeToolWindows(): void {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1400;
  const h = typeof window !== 'undefined' ? window.innerHeight : 900;
  const topOffsetPx = toPx(TOOL_WINDOW_CPX.topOffset);
  const leftOffsetPx = toPx(TOOL_WINDOW_CPX.leftOffset);
  const fileManagerWidthPx = toPx(TOOL_WINDOW_CPX.fileManagerWidth);
  const toolWindowWidthPx = toPx(TOOL_WINDOW_CPX.toolWindowWidth);
  const cardBoxWidthPx = toPx(TOOL_WINDOW_CPX.cardBoxWidth);
  const cardWindowHeightPx = toPx(TOOL_WINDOW_CPX.windowHeight);
  const cardBoxHeightPx = toPx(TOOL_WINDOW_CPX.cardBoxHeight);
  const cardBoxBottomOffsetPx = toPx(TOOL_WINDOW_CPX.cardBoxBottomOffset);

  // 文件管理器
  const fileManagerConfig: ToolWindowConfig = {
    id: generateScopedId('tool'),
    type: 'tool',
    component: 'FileManager',
    title: t('app.tool_file_manager'),
    icon: '📁',
    position: { x: leftOffsetPx, y: topOffsetPx },
    size: { width: fileManagerWidthPx, height: cardWindowHeightPx },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 编辑面板
  const editPanelConfig: ToolWindowConfig = {
    id: generateScopedId('tool'),
    type: 'tool',
    component: 'EditPanel',
    title: t('app.tool_edit_panel'),
    icon: '✏️',
    position: {
      x: Math.max(leftOffsetPx, w - toolWindowWidthPx - leftOffsetPx),
      y: topOffsetPx,
    },
    size: { width: toolWindowWidthPx, height: cardWindowHeightPx },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 卡箱库
  const cardBoxLibraryConfig: ToolWindowConfig = {
    id: generateScopedId('tool'),
    type: 'tool',
    component: 'CardBoxLibrary',
    title: t('app.tool_card_box_library'),
    icon: '📦',
    position: {
      x: leftOffsetPx,
      y: Math.max(topOffsetPx, h - cardBoxBottomOffsetPx),
    },
    size: { width: cardBoxWidthPx, height: cardBoxHeightPx },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 注册工具窗口到 uiStore
  uiStore.addWindow(fileManagerConfig);
  uiStore.addWindow(editPanelConfig);
  uiStore.addWindow(cardBoxLibraryConfig);
}

/** 卡片计数器（用于生成默认名称） */
let cardCounter = 0;

/** 更新窗口尺寸 */
function updateWindowSize(): void {
  setContainerWidth(window.innerWidth);
}

/**
 * 处理拖放创建卡片/箱子
 * @param data - 拖放数据
 * @param worldPosition - 世界坐标位置
 */
type CardLibraryDragData = Extract<DragData, { type: 'card' }>;
type LayoutLibraryDragData = Extract<DragData, { type: 'layout' }>;
type WorkspaceFileDragData = Extract<DragData, { type: 'workspace-file' }>;

function normalizeInsertIndex(index: number | undefined, length: number): number {
  if (index === undefined || !Number.isFinite(index)) {
    return length;
  }
  return Math.max(0, Math.min(length, index));
}

function getCardWindow(cardId: string): CardWindowConfig | undefined {
  return uiStore.cardWindows.find((window) => window.cardId === cardId);
}

function focusCardWindow(cardId: string): void {
  const targetWindow = getCardWindow(cardId);
  if (targetWindow) {
    windowManager.focusWindow(targetWindow.id);
  }
}

async function insertLibraryBaseCard(
  data: CardLibraryDragData,
  target: CardWindowDropTarget
): Promise<boolean> {
  const targetCard = cardStore.openCards.get(target.cardId);
  if (!targetCard) return false;

  const baseCardId = generateId62();
  const insertIndex = normalizeInsertIndex(target.insertIndex, targetCard.structure.length);
  const baseCard = {
    id: baseCardId,
    type: data.typeId,
    config: {
      content_source: 'inline',
      content_text: '',
    },
  };

  try {
    const cardPath = requireCardPath(
      targetCard.id,
      targetCard.filePath,
      'App.insertLibraryBaseCard',
      resourceService.workspaceRoot
    );

    const { persistedPath } = await persistInsertedBaseCard(
      targetCard,
      baseCard,
      insertIndex,
      cardPath
    );

    cardStore.addBaseCard(target.cardId, baseCard, insertIndex);
    cardStore.updateFilePath(targetCard.id, persistedPath);
    cardStore.markCardSaved(targetCard.id);
    if (!cardStore.hasModifiedCards) {
      editorStore.markSaved();
    }
  } catch (error) {
    console.error('[App] Failed to insert and persist base card', {
      cardId: target.cardId,
      baseCardType: data.typeId,
      insertIndex,
      error,
    });
    return false;
  }

  cardStore.setActiveCard(target.cardId);
  cardStore.setSelectedBaseCard(baseCardId);
  focusCardWindow(target.cardId);
  return true;
}

function insertNestedCardFile(
  data: WorkspaceFileDragData,
  target: CardWindowDropTarget
): boolean {
  if (data.fileType !== 'card') return false;

  const targetCard = cardStore.openCards.get(target.cardId);
  if (!targetCard) return false;

  const baseCardId = generateId62();
  const insertIndex = normalizeInsertIndex(target.insertIndex, targetCard.structure.length);
  cardStore.addBaseCard(
    target.cardId,
    {
      id: baseCardId,
      type: 'NestedCard',
      config: {
        card_id: data.fileId,
        card_path: data.filePath,
        card_name: data.name,
      },
    },
    insertIndex
  );
  cardStore.setActiveCard(target.cardId);
  cardStore.setSelectedBaseCard(baseCardId);
  focusCardWindow(target.cardId);
  return true;
}

async function ensureWorkspaceCardLoaded(data: WorkspaceFileDragData): Promise<string | null> {
  if (data.fileType !== 'card') return null;

  const existingById = cardStore.openCards.get(data.fileId);
  if (existingById) return existingById.id;

  const existingByPath = Array.from(cardStore.openCards.values()).find(
    (card) => card.filePath === data.filePath
  );
  if (existingByPath) return existingByPath.id;

  const metadataPath = `${data.filePath}/.card/metadata.yaml`;
  const structurePath = `${data.filePath}/.card/structure.yaml`;

  const now = new Date().toISOString();
  let metadataDoc: Record<string, unknown> = {};
  let structureDoc: Record<string, unknown> = {};

  try {
    metadataDoc = (yaml.parse(await resourceService.readText(metadataPath)) as Record<string, unknown>) || {};
  } catch {
    metadataDoc = {};
  }

  try {
    structureDoc = (yaml.parse(await resourceService.readText(structurePath)) as Record<string, unknown>) || {};
  } catch {
    structureDoc = {};
  }

  const rawStructure = Array.isArray(structureDoc.structure) ? structureDoc.structure : [];
  const structure = rawStructure
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : generateId62(),
      type: typeof item.type === 'string' ? item.type : 'UnknownCard',
      config: {} as Record<string, unknown>,
    }));

  await loadBaseCardConfigsFromContent(structure, data.filePath, (contentPath) =>
    resourceService.readText(contentPath)
  );

  const metadataName = typeof metadataDoc.name === 'string'
    ? metadataDoc.name
    : data.name.replace(/\.card$/i, '');
  const metadataCardId = typeof metadataDoc.card_id === 'string' ? metadataDoc.card_id : data.fileId;
  const metadataCreatedAt = typeof metadataDoc.created_at === 'string' ? metadataDoc.created_at : now;
  const metadataModifiedAt = typeof metadataDoc.modified_at === 'string' ? metadataDoc.modified_at : now;

  cardStore.addCard({
    id: metadataCardId,
    metadata: {
      chip_standards_version: '1.0.0',
      card_id: metadataCardId,
      name: metadataName,
      created_at: metadataCreatedAt,
      modified_at: metadataModifiedAt,
    },
    structure: {
      structure,
      manifest: {
        card_count: structure.length,
        resource_count: 0,
        resources: [],
      },
    },
    resources: new Map<string, Blob | ArrayBuffer>(),
  });

  cardStore.updateFilePath(metadataCardId, data.filePath);
  return metadataCardId;
}

async function openWorkspaceCardWindow(
  data: WorkspaceFileDragData,
  position: { x: number; y: number }
): Promise<void> {
  if (data.fileType !== 'card') return;

  const loadedCardId = await ensureWorkspaceCardLoaded(data);
  if (!loadedCardId) return;

  const targetCard = cardStore.openCards.get(loadedCardId);
  const cardName = targetCard?.metadata.name || data.name.replace(/\.card$/i, '');

  const existingWindow = getCardWindow(loadedCardId);
  if (existingWindow) {
    windowManager.updateWindow(existingWindow.id, {
      position,
      state: 'normal',
    });
    windowManager.focusWindow(existingWindow.id);
    cardStore.setActiveCard(loadedCardId);
    return;
  }

  const windowConfig: CardWindowConfig = {
    id: generateScopedId('window'),
    type: 'card',
    cardId: loadedCardId,
    title: cardName,
    position: { x: position.x, y: position.y },
    size: { width: toPx(TOOL_WINDOW_CPX.cardWindowWidth), height: toPx(TOOL_WINDOW_CPX.windowHeight) },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: true,
    minimizable: true,
    isEditing: true,
  };

  uiStore.addWindow(windowConfig);
  uiStore.focusWindow(windowConfig.id);
  cardStore.setActiveCard(loadedCardId);
}

async function handleWorkspaceFileDrop(
  data: WorkspaceFileDragData,
  worldPosition: { x: number; y: number },
  target?: CardWindowDropTarget
): Promise<void> {
  if (target && insertNestedCardFile(data, target)) {
    return;
  }
  await openWorkspaceCardWindow(data, worldPosition);
}

async function handleDropCreate(
  data: DragData,
  worldPosition: { x: number; y: number },
  target?: CardWindowDropTarget
): Promise<void> {
  console.warn('[App] 拖放创建:', data, '位置:', worldPosition, '目标:', target);

  if (data.type === 'card') {
    if (target) {
      await insertLibraryBaseCard(data, target);
      return;
    }
    await createCompositeCard(data, worldPosition);
    return;
  }

  if (data.type === 'layout') {
    await createBox(data, worldPosition);
    return;
  }

  await handleWorkspaceFileDrop(data, worldPosition, target);
}

/**
 * 创建复合卡片
 * @param data - 基础卡片类型数据
 * @param position - 桌面位置
 */
async function createCompositeCard(
  data: CardLibraryDragData,
  position: { x: number; y: number }
): Promise<void> {
  cardCounter++;
  const cardName = t('app.card_default_name', { index: cardCounter });
  // 使用符合生态标准的 10 位 62 进制 ID
  const cardId = generateId62();
  const windowId = generateScopedId('window');
  const timestamp = new Date().toISOString();

  // 创建基础卡片数据（也使用 62 进制 ID）
  const baseCardId = generateId62();
  const baseCard = {
    id: baseCardId,
    type: data.typeId, // 基础卡片类型 ID（如 'RichTextCard'）
    config: {
      content_source: 'inline',
      content_text: '',
    },
  };

  // 创建卡片数据并添加到 cardStore
  cardStore.addCard({
    id: cardId,
    metadata: {
      chip_standards_version: '1.0.0',
      card_id: cardId,
      name: cardName,
      created_at: timestamp,
      modified_at: timestamp,
    },
    structure: {
      structure: [baseCard],
      manifest: {
        card_count: 1,
        resource_count: 0,
        resources: [],
      },
    },
    resources: new Map<string, Blob | ArrayBuffer>(),
  });

  // 设置为活动卡片
  cardStore.setActiveCard(cardId);

  // 创建卡片窗口配置
  const windowConfig: CardWindowConfig = {
    id: windowId,
    type: 'card',
    cardId: cardId,
    title: cardName,
    position: { x: position.x, y: position.y },
    size: { width: toPx(TOOL_WINDOW_CPX.cardWindowWidth), height: toPx(TOOL_WINDOW_CPX.windowHeight) },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: true,
    minimizable: true,
    isEditing: true, // 默认进入编辑模式
  };

  // 添加窗口到 uiStore
  uiStore.addWindow(windowConfig);
  uiStore.focusWindow(windowId);

  // 创建工作区文件记录（使用相同的 cardId 确保数据同步）
  const workspaceFile = await workspaceService.createCard(
    cardName,
    { type: data.typeId, id: baseCardId },
    cardId
  );
  cardStore.updateFilePath(cardId, workspaceFile.path);

  console.warn('[App] 已创建复合卡片:', cardName, 'ID:', cardId, '包含基础卡片:', data.name);
}

/**
 * 处理编辑面板配置变更
 */
function handleEditPanelConfigChange(baseCardId: string, config: Record<string, unknown>): void {
  const activeCard = cardStore.activeCard;
  if (!activeCard) return;

  const updatedStructure = activeCard.structure.map((baseCard) => {
    if (baseCard.id !== baseCardId) return baseCard;
    return {
      ...baseCard,
      config: {
        ...baseCard.config,
        ...config,
      },
    };
  });

  cardStore.updateCardStructure(activeCard.id, updatedStructure);
}

/**
 * 创建箱子
 * @param data - 布局类型数据
 * @param position - 桌面位置
 */
async function createBox(
  data: LayoutLibraryDragData,
  position: { x: number; y: number }
): Promise<void> {
  console.warn('[App] 创建箱子:', data.name, '布局类型:', data.typeId, '位置:', position);
  const boxIndex = cardCounter++;
  const boxName = t('app.box_default_name', { index: boxIndex });
  const boxFile = await workspaceService.createBox(boxName, data.typeId);
  workspaceService.openFile(boxFile.id);
}

/** 插件初始化取消订阅函数 */
let unsubscribePluginInit: (() => void) | null = null;
/** Bridge 事件取消订阅函数列表 */
const bridgeUnsubscribers: Array<() => void> = [];

onMounted(() => {
  window.addEventListener('resize', updateWindowSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize);
  if (unsubscribePluginInit) {
    unsubscribePluginInit();
    unsubscribePluginInit = null;
  }
  for (const unsub of bridgeUnsubscribers) {
    unsub();
  }
  bridgeUnsubscribers.length = 0;
});

/**
 * 重试处理
 */
function handleRetry(): void {
  globalThis.location.reload();
}

/**
 * 初始化应用
 */
onMounted(async () => {
  try {
    // 订阅插件初始化事件，从 Host 获取工作区路径和启动文件
    unsubscribePluginInit = subscribePluginInit((payload: PluginInitPayload) => {
      const workspaceRoot = extractWorkspaceRoot(payload);
      const externalRoot = extractExternalRoot(payload);

      if (workspaceRoot) {
        setWorkspacePaths(workspaceRoot, externalRoot ?? '');
      }

      // 如果有启动文件路径，自动打开该卡片
      const launchFilePath = extractLaunchFilePath(payload);
      if (launchFilePath && isReady.value) {
        workspaceService.openFileByPath(launchFilePath).catch((err: unknown) => {
          console.warn('[Chips Editor] Failed to open launch file:', err);
        });
      }
    });

    await initializeEditorI18n(locale.value);

    // 初始化工作区服务
    await workspaceService.initialize();

    // 注册所有内置设置面板到注册中心
    settingsStore.registerPanels(builtinPanelDefinitions);

    // 初始化引擎设置服务（恢复持久化数据、应用设置）
    await initializeSettingsService();

    // 初始化工具窗口到 uiStore
    initializeToolWindows();

    // 设置默认布局
    editorStore.setLayout('infinite-canvas');

    isReady.value = true;

    try {
      bridgeUnsubscribers.push(
        subscribeEditorRuntimeEvent('theme.changed', (data: unknown) => {
          const payload = data as Record<string, unknown> | null;
          const themeId = typeof payload?.themeId === 'string' ? payload.themeId : null;
          if (themeId) {
            uiStore.setTheme(themeId);
          }
        })
      );

      bridgeUnsubscribers.push(
        subscribeEditorRuntimeEvent('language.changed', (data: unknown) => {
          const payload = data as Record<string, unknown> | null;
          const language = typeof payload?.language === 'string' ? payload.language : null;
          if (language) {
            setLocale(language);
            editorStore.setLocale(language);
          }
        })
      );
    } catch (error) {
      console.warn('[Chips Editor] Failed to subscribe runtime events:', error);
    }

    console.warn('[Chips Editor] 初始化完成');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('app.error_unknown');
    console.error('[Chips Editor] Initialization failed:', error);
  }
});

/** 提供编辑器上下文给子组件 */
provide('editorContext', {
  editorStore,
  uiStore,
  cardStore,
  workspaceService,
  openEngineSettings,
});
</script>

<template>
  <ThemeProvider :theme="currentTheme">
      <div id="chips-editor">
    <!-- 加载状态 -->
    <div
      v-if="!isReady && !errorMessage"
      class="loading-container"
    >
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ t('app.loading') }}</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="errorMessage"
      class="error-container"
    >
      <p class="error-title">{{ t('app.error_title') }}</p>
      <p class="error-message">{{ errorMessage }}</p>
      <Button
        class="retry-button"
        type="primary"
        @click="handleRetry"
      >
        {{ t('app.error_retry') }}
      </Button>
    </div>

    <!-- 编辑器主体 -->
    <template v-else>
      <!-- 无限画布布局 -->
      <InfiniteCanvas 
        v-if="currentLayout === 'infinite-canvas'"
        @drop-create="handleDropCreate"
        @open-settings="openEngineSettings"
      >
        <template #desktop>
          <!-- 卡片窗口由 DesktopLayer 自动渲染 -->
        </template>

        <!-- 工具窗口内容通过具名插槽提供给 WindowLayer -->
        <template #tool-FileManager>
          <FileManager />
        </template>

        <template #tool-EditPanel>
          <EditPanel @config-changed="handleEditPanelConfigChange" />
        </template>

        <template #tool-CardBoxLibrary>
          <CardBoxLibrary />
        </template>
      </InfiniteCanvas>

      <!-- 工作台布局 -->
      <Workbench v-else-if="currentLayout === 'workbench'" />

      <!-- 未知布局回退 -->
      <div
        v-else
        class="unknown-layout"
      >
        <p>{{ t('app.layout_unknown', { layout: currentLayout }) }}</p>
      </div>

      <!-- 引擎设置弹窗 -->
      <EngineSettingsDialog
        :visible="showEngineSettings"
        @close="closeEngineSettings"
      />
    </template>
      </div>
  </ThemeProvider>
</template>

<style scoped>
#chips-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--chips-color-background, #f0f2f5);
}

/* 加载状态样式 */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-md, 16px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--chips-color-border, #e0e0e0);
  border-top-color: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: var(--chips-color-text-secondary, #666666);
  font-size: var(--chips-font-size-sm, 14px);
}

/* 错误状态样式 */
.error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-lg, 24px);
}

.error-title {
  color: var(--chips-color-error, #ef4444);
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-medium, 500);
}

.error-message {
  color: var(--chips-color-text-secondary, #666666);
  text-align: center;
  max-width: 400px;
}

.retry-button {
  margin-top: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-lg, 24px);
  background-color: var(--chips-color-primary, #3b82f6);
  color: #ffffff;
  border: none;
  border-radius: var(--chips-radius-md, 6px);
  font-weight: var(--chips-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: var(--chips-color-primary-dark, #2563eb);
}

/* 未知布局回退 */
.unknown-layout {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chips-color-text-secondary, #666666);
}

</style>
