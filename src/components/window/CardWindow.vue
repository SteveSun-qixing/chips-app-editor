<script setup lang="ts">
/**
 * 卡片窗口组件
 * @module components/window/CardWindow
 * @description 用于显示和编辑卡片内容的窗口组件
 */

import {
  ref,
  computed,
  watch,
  onUnmounted,
  inject,
  nextTick,
  type Ref,
} from 'vue';
import { CardRenderManager, RendererFetcher, type ParsedBaseCardConfig, type ParsedCardData } from '@chips/sdk';
import CardWindowBase from './CardWindowBase.vue';
import WindowMenu from './WindowMenu.vue';
import { CardSettingsDialog } from '@/components/card-settings';
import { useCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';
import { resolveBaseCardRuntimeType } from './base-card-runtime-type';
import { sanitizeRichTextHtml } from './rich-text-sanitizer';
import {
  buildCardResourceFullPath,
  isDirectResourceUrl,
  releaseCardResourceUrl,
  resolveCardResourceUrl,
  type CardResolvedResource,
} from '@/services/card-resource-resolver';

interface Props {
  /** 窗口配置 */
  config: CardWindowConfig;
}

interface ImageItemConfig {
  url?: string;
  file_path?: string;
  alt?: string;
  title?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭窗口 */
  close: [];
  /** 聚焦窗口 */
  focus: [];
  /** 更新配置 */
  'update:config': [config: Partial<CardWindowConfig>];
}>();

const cardStore = useCardStore();
const workspaceService = useWorkspaceService();

const previewContainer = ref<HTMLElement | null>(null);
const previewRenderError = ref<string | null>(null);

const previewFetcher = new RendererFetcher({ enableCache: true });
let previewDestroy: (() => void) | null = null;
let previewRenderVersion = 0;
let scheduledPreviewRenderVersion = 0;

// 从 InfiniteCanvas 注入画布上下文（获取缩放比例）
const canvasContext = inject<{
  zoom: Ref<number>;
} | null>('canvas', null);

/** 获取卡片信息 */
const cardInfo = computed(() => cardStore.openCards.get(props.config.cardId));

/** 是否正在编辑 */
const isEditing = computed(() => props.config.isEditing);

/** 窗口状态 */
const windowState = computed(() => props.config.state);

/** 封面拖动状态 */
const isCoverDragging = ref(false);
const coverDragMoved = ref(false);
const coverDragStart = ref({ x: 0, y: 0 });
const coverInitialPosition = ref({ x: 0, y: 0 });
const coverRenderPosition = ref({ x: 0, y: 0 });
const pendingCoverPosition = ref<{ x: number; y: number } | null>(null);
let coverDragRafId: number | null = null;

const coverStyle = computed(() => {
  const position = isCoverDragging.value ? coverRenderPosition.value : props.config.position;
  return { transform: `translate(${position.x}px, ${position.y}px)` };
});

/**
 * 切换编辑模式
 */
function toggleEditMode(): void {
  emit('update:config', { isEditing: !isEditing.value });
}

/**
 * 切换到封面模式
 */
function switchToCover(): void {
  emit('update:config', { state: 'cover' });
}

/**
 * 从封面恢复
 */
function restoreFromCover(): void {
  emit('update:config', { state: 'normal' });
}

/**
 * 开始拖动封面
 */
function handleCoverMouseDown(event: MouseEvent): void {
  if (event.button !== 0) return;

  isCoverDragging.value = true;
  coverDragMoved.value = false;
  coverDragStart.value = { x: event.clientX, y: event.clientY };
  coverInitialPosition.value = { ...props.config.position };
  coverRenderPosition.value = { ...props.config.position };

  document.addEventListener('mousemove', handleCoverMouseMove);
  document.addEventListener('mouseup', handleCoverMouseUp);
  event.preventDefault();
}

/**
 * 拖动封面移动
 */
function handleCoverMouseMove(event: MouseEvent): void {
  if (!isCoverDragging.value) return;

  const zoom = canvasContext?.zoom.value ?? 1;
  const deltaX = (event.clientX - coverDragStart.value.x) / zoom;
  const deltaY = (event.clientY - coverDragStart.value.y) / zoom;

  if (!coverDragMoved.value && Math.abs(deltaX) + Math.abs(deltaY) > 2 / zoom) {
    coverDragMoved.value = true;
  }

  pendingCoverPosition.value = {
    x: coverInitialPosition.value.x + deltaX,
    y: coverInitialPosition.value.y + deltaY,
  };

  if (coverDragRafId === null) {
    coverDragRafId = requestAnimationFrame(() => {
      coverDragRafId = null;
      if (!pendingCoverPosition.value) return;
      coverRenderPosition.value = { ...pendingCoverPosition.value };
    });
  }
}

/**
 * 结束拖动封面
 */
function handleCoverMouseUp(): void {
  if (isCoverDragging.value && !coverDragMoved.value) {
    restoreFromCover();
  } else if (isCoverDragging.value && coverDragMoved.value) {
    emit('update:config', { position: { ...coverRenderPosition.value } });
  }

  isCoverDragging.value = false;
  coverDragMoved.value = false;
  pendingCoverPosition.value = null;
  if (coverDragRafId !== null) {
    cancelAnimationFrame(coverDragRafId);
    coverDragRafId = null;
  }
  document.removeEventListener('mousemove', handleCoverMouseMove);
  document.removeEventListener('mouseup', handleCoverMouseUp);
}

/**
 * 更新位置
 */
function updatePosition(position: WindowPosition): void {
  emit('update:config', { position });
}

/**
 * 更新大小
 */
function updateSize(size: WindowSize): void {
  emit('update:config', { size });
}

/**
 * 更新标题
 * 同时更新 cardStore 和 workspaceService，保持数据同步
 */
function updateTitle(title: string): void {
  if (cardInfo.value) {
    cardStore.updateCardMetadata(props.config.cardId, { name: title });
    workspaceService.renameFile(props.config.cardId, `${title}.card`);
  }
}

/**
 * 关闭窗口
 */
function handleClose(): void {
  emit('close');
}

/**
 * 最小化
 */
function handleMinimize(): void {
  emit('update:config', { state: 'minimized' });
}

/**
 * 收起/展开
 */
function handleCollapse(): void {
  const newState = windowState.value === 'collapsed' ? 'normal' : 'collapsed';
  emit('update:config', { state: newState });
}

/**
 * 聚焦窗口
 */
function handleFocus(): void {
  emit('focus');
}

/** 设置对话框可见状态 */
const showSettingsDialog = ref(false);

/**
 * 打开设置对话框
 */
function handleSettings(): void {
  showSettingsDialog.value = true;
}

/**
 * 关闭设置对话框
 */
function handleCloseSettings(): void {
  showSettingsDialog.value = false;
}

/**
 * 选择基础卡片
 * 同时设置活动卡片，确保编辑面板能正确显示
 */
function selectBaseCard(baseCardId: string): void {
  if (!isEditing.value) return;
  cardStore.setActiveCard(props.config.cardId);
  cardStore.setSelectedBaseCard(baseCardId);
}

function handlePreviewClick(event: MouseEvent): void {
  if (!isEditing.value) return;
  const target = event.target as HTMLElement | null;
  const baseCardElement = target?.closest<HTMLElement>('.chips-base-card-wrapper[data-card-id]');
  const baseCardId = baseCardElement?.dataset.cardId;
  if (baseCardId) {
    selectBaseCard(baseCardId);
  }
}

/**
 * 获取封面比例样式
 */
function getCoverAspectRatio(ratio?: string): string {
  return ratio?.replace(':', '/') || '3/4';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneConfig(config?: Record<string, unknown>): Record<string, unknown> {
  if (!config) return {};
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(config);
    } catch {
      // ignore and fallback below
    }
  }

  try {
    return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  } catch {
    return { ...config };
  }
}

function getCardPath(): string | null {
  const path = cardInfo.value?.filePath;
  return typeof path === 'string' && path.trim() ? path : null;
}

function buildCardResourcePath(resourcePath: string): string | null {
  const cardPath = getCardPath();
  if (!cardPath) return null;
  return buildCardResourceFullPath(cardPath, resourcePath);
}

const resolvedImageMap = ref<Record<string, CardResolvedResource>>({});
const pendingImageResolveKeys = new Set<string>();
let resourceResolveSession = 0;

async function resolveImageAsync(fullPath: string): Promise<void> {
  if (pendingImageResolveKeys.has(fullPath) || resolvedImageMap.value[fullPath]) {
    return;
  }

  pendingImageResolveKeys.add(fullPath);
  const currentSession = resourceResolveSession;

  try {
    const resolved = await resolveCardResourceUrl(fullPath);
    if (currentSession !== resourceResolveSession) {
      await releaseCardResourceUrl(resolved);
      return;
    }

    resolvedImageMap.value = { ...resolvedImageMap.value, [fullPath]: resolved };
  } catch {
    // ignore; image will fallback to empty source
  } finally {
    pendingImageResolveKeys.delete(fullPath);
  }
}

async function releaseResolvedImage(fullPath: string): Promise<void> {
  const resolved = resolvedImageMap.value[fullPath];
  if (!resolved) return;

  await releaseCardResourceUrl(resolved);

  const nextMap = { ...resolvedImageMap.value };
  delete nextMap[fullPath];
  resolvedImageMap.value = nextMap;
}

function releaseAllResolvedImages(): void {
  resourceResolveSession += 1;

  for (const fullPath of Object.keys(resolvedImageMap.value)) {
    void releaseResolvedImage(fullPath);
  }

  pendingImageResolveKeys.clear();
}

function resolveImagePathForPreview(path: string): string {
  if (isDirectResourceUrl(path)) {
    return path;
  }

  const fullPath = buildCardResourcePath(path);
  if (!fullPath) {
    return '';
  }

  const cached = resolvedImageMap.value[fullPath];
  if (cached) {
    return cached.url;
  }

  void resolveImageAsync(fullPath);
  return '';
}

function resolveImageCardConfig(config?: Record<string, unknown>): Record<string, unknown> {
  const cloned = cloneConfig(config);

  const imageFile = cloned.image_file;
  if (typeof imageFile === 'string') {
    cloned.image_file = resolveImagePathForPreview(imageFile);
  }

  const sourcePath = cloned.src;
  if (typeof sourcePath === 'string' && !isDirectResourceUrl(sourcePath)) {
    cloned.src = resolveImagePathForPreview(sourcePath);
  }

  const images = cloned.images;
  if (Array.isArray(images)) {
    cloned.images = images.map((item) => {
      if (!isPlainObject(item)) return item;
      const imageItem = { ...item } as ImageItemConfig;
      if (typeof imageItem.file_path === 'string') {
        imageItem.file_path = resolveImagePathForPreview(imageItem.file_path);
      }
      return imageItem;
    });
  }

  return cloned;
}

function resolveRichTextCardConfig(config?: Record<string, unknown>): Record<string, unknown> {
  const cloned = cloneConfig(config);
  const contentText = cloned.content_text;

  if (typeof contentText === 'string') {
    cloned.content_text = sanitizeRichTextHtml(contentText);
  }

  return cloned;
}

function collectCurrentImageResourcePaths(): Set<string> {
  const paths = new Set<string>();
  const structure = cardInfo.value?.structure || [];

  for (const baseCard of structure) {
    if (resolveBaseCardRuntimeType(baseCard) !== 'ImageCard') continue;

    const config = isPlainObject(baseCard.config) ? baseCard.config : {};

    const imageFile = config.image_file;
    if (typeof imageFile === 'string' && !isDirectResourceUrl(imageFile)) {
      const fullPath = buildCardResourcePath(imageFile);
      if (fullPath) {
        paths.add(fullPath);
      }
    }

    const images = config.images;
    if (!Array.isArray(images)) {
      continue;
    }

    for (const item of images) {
      if (!isPlainObject(item)) continue;
      const resourcePath = item.file_path;
      if (typeof resourcePath !== 'string' || isDirectResourceUrl(resourcePath)) continue;
      const fullPath = buildCardResourcePath(resourcePath);
      if (fullPath) {
        paths.add(fullPath);
      }
    }
  }

  return paths;
}

function cleanupStaleImageResources(): void {
  const activePaths = collectCurrentImageResourcePaths();
  const resolvedPaths = Object.keys(resolvedImageMap.value);

  for (const fullPath of resolvedPaths) {
    if (!activePaths.has(fullPath)) {
      void releaseResolvedImage(fullPath);
    }
  }
}

function buildParsedBaseCards(): ParsedBaseCardConfig[] {
  const structure = cardInfo.value?.structure || [];

  return structure.map((baseCard) => {
    const runtimeType = resolveBaseCardRuntimeType(baseCard);
    const baseConfig = isPlainObject(baseCard.config) ? baseCard.config : {};

    return {
      id: baseCard.id,
      type: runtimeType,
      config: runtimeType === 'ImageCard'
        ? resolveImageCardConfig(baseConfig)
        : runtimeType === 'RichTextCard'
          ? resolveRichTextCardConfig(baseConfig)
        : cloneConfig(baseConfig),
    };
  });
}

function buildParsedCardData(baseCards: ParsedBaseCardConfig[]): ParsedCardData {
  const metadata = cardInfo.value?.metadata;
  const now = new Date().toISOString();

  return {
    metadata: {
      id: String(metadata?.card_id ?? props.config.cardId),
      name: String(metadata?.name ?? t('card_window.untitled')),
      version: String(metadata?.version ?? '1.0.0'),
      description: typeof metadata?.description === 'string' ? metadata.description : undefined,
      createdAt: String(metadata?.created_at ?? now),
      modifiedAt: String(metadata?.modified_at ?? now),
      themeId: typeof metadata?.theme === 'string' ? metadata.theme : undefined,
      tags: Array.isArray(metadata?.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
      chipsStandardsVersion: String(metadata?.chip_standards_version ?? '1.0.0'),
    },
    structure: {
      baseCardIds: baseCards.map((baseCard) => baseCard.id),
    },
    baseCards,
  };
}

function destroyPreviewMount(): void {
  previewRenderVersion += 1;

  if (previewDestroy) {
    previewDestroy();
    previewDestroy = null;
  }

  const container = previewContainer.value;
  if (container) {
    container.innerHTML = '';
  }
}

function syncRenderedCardState(): void {
  const container = previewContainer.value;
  if (!container) return;

  const baseCardElements = container.querySelectorAll<HTMLElement>('.chips-base-card-wrapper[data-card-id]');

  baseCardElements.forEach((element, index) => {
    const baseCardId = element.dataset.cardId;
    if (!baseCardId) return;

    element.dataset.baseCardId = baseCardId;
    element.dataset.baseCardIndex = String(index);

    element.classList.toggle(
      'chips-editor-base-card--selected',
      cardStore.selectedBaseCardId === baseCardId
    );
    element.classList.toggle('chips-editor-base-card--editing', isEditing.value);
  });
}

async function renderCardPreview(): Promise<void> {
  const container = previewContainer.value;
  const currentCard = cardInfo.value;

  if (!container || !currentCard || currentCard.isLoading || windowState.value === 'cover') {
    destroyPreviewMount();
    previewRenderError.value = null;
    return;
  }

  if (!currentCard.structure?.length) {
    destroyPreviewMount();
    previewRenderError.value = null;
    return;
  }

  const renderVersion = ++previewRenderVersion;

  try {
    const baseCards = buildParsedBaseCards();
    const parsedCardData = buildParsedCardData(baseCards);
    const cardTypes = baseCards.map((baseCard) => baseCard.type);
    const renderers = await previewFetcher.fetchRenderers(cardTypes);

    if (renderVersion !== previewRenderVersion) {
      return;
    }

    destroyPreviewMount();

    const renderManager = new CardRenderManager({
      isolationMode: 'iframe',
      cardGap: 12,
      containerPadding: 0,
    });

    const mountResult = renderManager.render(parsedCardData, renderers, container);

    if (!mountResult.success) {
      previewRenderError.value = mountResult.error || t('plugin_host.error');
      return;
    }

    previewRenderError.value = null;
    previewDestroy = mountResult.destroy ?? null;
    syncRenderedCardState();
  } catch (error) {
    if (renderVersion !== previewRenderVersion) {
      return;
    }

    destroyPreviewMount();
    previewRenderError.value = error instanceof Error ? error.message : String(error);
  }
}

function schedulePreviewRender(): void {
  const currentScheduleVersion = ++scheduledPreviewRenderVersion;

  void nextTick(async () => {
    if (currentScheduleVersion !== scheduledPreviewRenderVersion) {
      return;
    }

    await renderCardPreview();
  });
}

watch(
  () => cardInfo.value?.structure,
  () => {
    cleanupStaleImageResources();
    schedulePreviewRender();
  },
  { deep: true, immediate: true }
);

watch(
  () => cardInfo.value?.isLoading,
  () => {
    schedulePreviewRender();
  },
  { immediate: true }
);

watch(
  () => props.config.cardId,
  () => {
    releaseAllResolvedImages();
    destroyPreviewMount();
    schedulePreviewRender();
  }
);

watch(
  () => windowState.value,
  (state) => {
    if (state === 'cover') {
      destroyPreviewMount();
      return;
    }

    schedulePreviewRender();
  }
);

watch(
  () => resolvedImageMap.value,
  () => {
    schedulePreviewRender();
  },
  { deep: true }
);

watch(
  () => cardStore.selectedBaseCardId,
  () => {
    syncRenderedCardState();
  }
);

watch(
  () => isEditing.value,
  () => {
    syncRenderedCardState();
  }
);

watch(
  () => props.config.position,
  (position) => {
    if (!isCoverDragging.value) {
      coverRenderPosition.value = { ...position };
    }
  },
  { immediate: true, deep: true }
);

onUnmounted(() => {
  document.removeEventListener('mousemove', handleCoverMouseMove);
  document.removeEventListener('mouseup', handleCoverMouseUp);

  if (coverDragRafId !== null) {
    cancelAnimationFrame(coverDragRafId);
    coverDragRafId = null;
  }

  destroyPreviewMount();
  releaseAllResolvedImages();
  previewFetcher.clearCache();
});
</script>

<template>
  <!-- 封面模式 -->
  <div
    v-if="windowState === 'cover'"
    class="card-cover"
    :class="{ 'card-cover--dragging': isCoverDragging }"
    data-chips-card-window="true"
    :data-card-id="config.cardId"
    :style="coverStyle"
    @mousedown="handleCoverMouseDown"
  >
    <div
      class="card-cover__image"
      :style="{ aspectRatio: getCoverAspectRatio(config.coverRatio) }"
    >
      <!-- 封面内容由渲染器提供 -->
      <slot name="cover">
        <div class="card-cover__placeholder">
          {{ cardInfo?.metadata.name || t('card_window.untitled') }}
        </div>
      </slot>
    </div>
    <div class="card-cover__title">
      {{ cardInfo?.metadata.name || t('card_window.untitled') }}
    </div>
  </div>

  <!-- 正常窗口模式 -->
  <CardWindowBase
    v-else
    :config="config"
    data-chips-card-window="true"
    :data-card-id="config.cardId"
    @update:position="updatePosition"
    @update:size="updateSize"
    @focus="handleFocus"
    @close="handleClose"
    @minimize="handleMinimize"
    @collapse="handleCollapse"
  >
    <template #header>
      <WindowMenu
        :title="cardInfo?.metadata.name || t('card_window.untitled')"
        :is-editing="isEditing"
        :show-lock="true"
        :show-cover="true"
        :show-settings="true"
        @toggle-edit="toggleEditMode"
        @switch-to-cover="switchToCover"
        @settings="handleSettings"
        @update:title="updateTitle"
      />
    </template>

    <template #default>
      <div class="card-window__content">
        <!-- 卡片内容由渲染器提供 -->
        <slot>
          <div v-if="cardInfo?.isLoading" class="card-window__loading">
            <span class="card-window__loading-icon">⏳</span>
            <span class="card-window__loading-text">{{ t('card_window.loading') }}</span>
          </div>
          <div v-else class="card-window__body">
            <div
              v-if="cardInfo?.structure?.length"
              ref="previewContainer"
              class="card-window__renderer-host"
              @click="handlePreviewClick"
            ></div>

            <div
              v-if="cardInfo?.structure?.length && previewRenderError"
              class="card-window__render-error"
            >
              <span class="card-window__render-error-icon">⚠️</span>
              <span>{{ t('plugin_host.error') }}: {{ previewRenderError }}</span>
            </div>

            <!-- 空状态 -->
            <div
              v-if="!cardInfo?.structure?.length"
              class="card-window__empty"
            >
              <span class="card-window__empty-icon">📄</span>
              <span class="card-window__empty-text">{{ t('card_window.empty') }}</span>
              <span v-if="isEditing" class="card-window__empty-hint">
                {{ t('card_window.empty_hint') }}
              </span>
            </div>
          </div>
        </slot>
      </div>
    </template>
  </CardWindowBase>

  <!-- 卡片设置对话框 -->
  <CardSettingsDialog
    :card-id="config.cardId"
    :visible="showSettingsDialog"
    @close="handleCloseSettings"
    @save="handleCloseSettings"
  />
</template>

<style scoped>
/* 封面模式样式 */
.card-cover {
  position: absolute;
  cursor: pointer;
  transition: box-shadow var(--chips-transition-fast, 0.15s) ease;
  will-change: transform;
}

.card-cover:hover {
  transform: scale(1.02);
}

.card-cover--dragging,
.card-cover--dragging:hover {
  cursor: grabbing;
  transition: none;
}

.card-cover__image {
  width: 200px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-md, 8px);
  overflow: hidden;
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  transition: box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.card-cover:hover .card-cover__image {
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
}

.card-cover__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chips-color-surface-variant, #f5f5f5);
  color: var(--chips-color-text-secondary, #666666);
  padding: var(--chips-spacing-md, 12px);
  text-align: center;
  font-size: var(--chips-font-size-sm, 14px);
}

.card-cover__title {
  margin-top: var(--chips-spacing-sm, 8px);
  text-align: center;
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 窗口内容样式 */
.card-window__content {
  padding: var(--chips-spacing-md, 16px);
}

.card-window__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: var(--chips-spacing-sm, 8px);
}

.card-window__loading-icon {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-window__loading-text {
  color: var(--chips-color-text-secondary, #666666);
  font-size: var(--chips-font-size-sm, 14px);
}

.card-window__body {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-md, 12px);
}

.card-window__renderer-host {
  width: 100%;
  min-height: 40px;
}

.card-window__renderer-host :deep(.chips-base-card-wrapper) {
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 6px);
  overflow: hidden;
  transition: border-color var(--chips-transition-fast, 0.15s) ease,
    box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.card-window__renderer-host :deep(.chips-base-card-wrapper.chips-editor-base-card--editing) {
  cursor: pointer;
}

.card-window__renderer-host :deep(.chips-base-card-wrapper.chips-editor-base-card--editing:hover) {
  border-color: var(--chips-color-primary, #3b82f6);
}

.card-window__renderer-host :deep(.chips-base-card-wrapper.chips-editor-base-card--selected) {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(59, 130, 246, 0.2));
}

.card-window__renderer-host :deep(.chips-base-card-wrapper.chips-editor-base-card--editing iframe) {
  pointer-events: none;
}

.card-window__render-error {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 6px);
  color: var(--chips-color-danger, #d32f2f);
  font-size: var(--chips-font-size-sm, 14px);
  background: rgba(211, 47, 47, 0.08);
  border: 1px solid rgba(211, 47, 47, 0.2);
  border-radius: var(--chips-radius-sm, 6px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
}

.card-window__render-error-icon {
  font-size: 16px;
}

/* 空状态样式 */
.card-window__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 48px) var(--chips-spacing-md, 16px);
  text-align: center;
  gap: var(--chips-spacing-sm, 8px);
}

.card-window__empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.card-window__empty-text {
  font-size: var(--chips-font-size-md, 16px);
  color: var(--chips-color-text-secondary, #666666);
}

.card-window__empty-hint {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-tertiary, #999999);
}
</style>
