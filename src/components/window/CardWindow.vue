<script setup lang="ts">
/* eslint-disable vue/no-v-html */
/**
 * 卡片窗口组件
 * @module components/window/CardWindow
 * @description 用于显示和编辑卡片内容的窗口组件
 */

import { ref, computed, watch, onUnmounted, inject, type Ref } from 'vue';
import CardWindowBase from './CardWindowBase.vue';
import WindowMenu from './WindowMenu.vue';
import { CardSettingsDialog } from '@/components/card-settings';
import { useCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';
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
    // 更新卡片元数据
    cardStore.updateCardMetadata(props.config.cardId, { name: title });
    
    // 同步更新工作区文件名（使用相同的 cardId 作为文件 ID）
    workspaceService.renameFile(props.config.cardId, `${title}.card`);
    
    console.warn('[CardWindow] 更新卡片名称:', title, 'ID:', props.config.cardId);
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
  // 先设置活动卡片
  cardStore.setActiveCard(props.config.cardId);
  // 再设置选中的基础卡片
  cardStore.setSelectedBaseCard(baseCardId);
  
  console.warn('[CardWindow] 选中基础卡片:', baseCardId, '卡片ID:', props.config.cardId);
}

/**
 * 获取封面比例样式
 */
function getCoverAspectRatio(ratio?: string): string {
  return ratio?.replace(':', '/') || '3/4';
}

/**
 * 获取基础卡片类型名称
 */
function getBaseCardTypeName(type: string): string {
  // 类型名统一使用 PascalCase（卡片文件格式规范标准）
  const typeNames: Record<string, string> = {
    RichTextCard: t('card_window.type_rich_text'),
    MarkdownCard: t('card_window.type_markdown'),
    ImageCard: t('card_window.type_image'),
    VideoCard: t('card_window.type_video'),
    AudioCard: t('card_window.type_audio'),
    CodeBlockCard: t('card_window.type_code'),
    ListCard: t('card_window.type_list'),
  };
  return typeNames[type] || type;
}

/**
 * 获取富文本预览内容
 * 兼容历史错误内容（i18n key 直接写入内容）
 */
function getRichTextPreview(baseCard: { config?: Record<string, unknown> }): string {
  const rawContent = typeof baseCard.config?.content_text === 'string'
    ? baseCard.config?.content_text
    : '';
  const placeholderKey = 'card_window.richtext_placeholder';

  if (!rawContent || rawContent.trim() === '' || rawContent.trim() === placeholderKey) {
    return `<p>${t(placeholderKey)}</p>`;
  }

  return rawContent;
}

// ======================================================================
// 图片卡片预览辅助函数
// ======================================================================

interface ImageItemPreview {
  url?: string;
  file_path?: string;
  alt?: string;
  title?: string;
  _overflow?: boolean;
  _overflowCount?: number;
}

/** 获取图片卡片的图片数组 */
function getImageCardImages(baseCard: { config?: Record<string, unknown> }): ImageItemPreview[] {
  const images = baseCard.config?.images;
  return Array.isArray(images) ? images as ImageItemPreview[] : [];
}

/** 获取图片卡片的有效排版类型 */
function getImageEffectiveLayout(baseCard: { config?: Record<string, unknown> }): string {
  const images = getImageCardImages(baseCard);
  if (images.length <= 1) return 'single';
  return (baseCard.config?.layout_type as string) || 'grid';
}

/** 获取图片排版 CSS 类 */
function getImageLayoutClass(baseCard: { config?: Record<string, unknown> }): string {
  return `card-window__image-preview--${getImageEffectiveLayout(baseCard)}`;
}

/** 获取单张图片容器样式 */
function getImageSingleStyle(baseCard: { config?: Record<string, unknown> }): Record<string, string> {
  const opts = (baseCard.config?.layout_options || {}) as Record<string, unknown>;
  const alignment = (opts.single_alignment as string) || 'center';
  const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  return { display: 'flex', justifyContent: justifyMap[alignment] || 'center' };
}

/** 获取单张图片样式 */
function getImageSingleImgStyle(baseCard: { config?: Record<string, unknown> }): Record<string, string> {
  const opts = (baseCard.config?.layout_options || {}) as Record<string, unknown>;
  const widthPct = (opts.single_width_percent as number) || 100;
  return { width: `${widthPct}%`, maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '4px' };
}

/** 获取网格排版样式 */
function getImageGridStyle(baseCard: { config?: Record<string, unknown> }): Record<string, string> {
  const opts = (baseCard.config?.layout_options || {}) as Record<string, unknown>;
  const gridMode = (opts.grid_mode as string) || '2x2';
  const gap = (opts.gap as number) ?? 8;
  const cols = gridMode === '2x2' ? 2 : 3;
  return { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` };
}

/** 获取网格显示项（含溢出标记） */
function getImageGridDisplayItems(baseCard: { config?: Record<string, unknown> }): ImageItemPreview[] {
  const images = getImageCardImages(baseCard);
  const opts = (baseCard.config?.layout_options || {}) as Record<string, unknown>;
  const gridMode = (opts.grid_mode as string) || '2x2';
  if (gridMode === '3-column-infinite') return images;
  const limit = gridMode === '3x3' ? 9 : 4;
  if (images.length <= limit) return images;
  const display = images.slice(0, limit);
  const last = display[display.length - 1];
  if (last) {
    return [
      ...display.slice(0, -1),
      { ...last, _overflow: true, _overflowCount: images.length - limit + 1 },
    ];
  }
  return display;
}

/** 获取长图拼接样式 */
function getImageLongScrollStyle(baseCard: { config?: Record<string, unknown> }): Record<string, string> {
  const opts = (baseCard.config?.layout_options || {}) as Record<string, unknown>;
  const scrollMode = (opts.scroll_mode as string) || 'fixed-window';
  if (scrollMode === 'fixed-window') {
    const height = (opts.fixed_window_height as number) || 600;
    return { maxHeight: `${height}px`, overflowY: 'auto', display: 'flex', flexDirection: 'column' };
  }
  return { display: 'flex', flexDirection: 'column' };
}

const resolvedImageMap = ref<Record<string, CardResolvedResource>>({});
const pendingImageResolveKeys = new Set<string>();
let resolveSession = 0;

function getCardPath(): string {
  return cardInfo.value?.filePath || `TestWorkspace/${props.config.cardId}.card`;
}

function buildCardResourcePath(resourcePath: string): string {
  return buildCardResourceFullPath(getCardPath(), resourcePath);
}

async function resolveImageAsync(fullPath: string): Promise<void> {
  if (pendingImageResolveKeys.has(fullPath) || resolvedImageMap.value[fullPath]) {
    return;
  }
  pendingImageResolveKeys.add(fullPath);
  const currentSession = resolveSession;

  try {
    const resolved = await resolveCardResourceUrl(fullPath);
    if (currentSession !== resolveSession) {
      await releaseCardResourceUrl(resolved);
      return;
    }
    resolvedImageMap.value = { ...resolvedImageMap.value, [fullPath]: resolved };
  } catch {
    // ignore; image will keep placeholder state
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

function collectCurrentImageResourcePaths(): Set<string> {
  const paths = new Set<string>();
  const structure = cardInfo.value?.structure || [];

  for (const baseCard of structure) {
    if (baseCard.type !== 'ImageCard') continue;
    const images = getImageCardImages(baseCard);
    for (const image of images) {
      if (!image.file_path || isDirectResourceUrl(image.file_path)) continue;
      paths.add(buildCardResourcePath(image.file_path));
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

function releaseAllResolvedImages(): void {
  resolveSession += 1;
  for (const fullPath of Object.keys(resolvedImageMap.value)) {
    void releaseResolvedImage(fullPath);
  }
  pendingImageResolveKeys.clear();
}

function getImagePreviewSrc(image?: ImageItemPreview): string {
  if (!image) return '';
  if (image.url) return image.url;
  if (!image.file_path) return '';

  if (isDirectResourceUrl(image.file_path)) {
    return image.file_path;
  }

  const fullPath = buildCardResourcePath(image.file_path);
  const cached = resolvedImageMap.value[fullPath];
  if (cached) {
    return cached.url;
  }

  void resolveImageAsync(fullPath);
  return '';
}

/** 图片加载失败处理 */
function handleImagePreviewError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.opacity = '0.3';
  img.style.filter = 'grayscale(100%)';
}

watch(
  () => cardInfo.value?.structure,
  () => {
    cleanupStaleImageResources();
  },
  { deep: true }
);

watch(
  () => props.config.cardId,
  () => {
    releaseAllResolvedImages();
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
  releaseAllResolvedImages();
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
            <!-- 基础卡片列表 -->
            <div
              v-for="(baseCard, baseCardIndex) in cardInfo?.structure"
              :key="baseCard.id"
              class="card-window__base-card"
              :data-base-card-id="baseCard.id"
              :data-base-card-index="baseCardIndex"
              :class="{
                'card-window__base-card--selected': cardStore.selectedBaseCardId === baseCard.id,
                'card-window__base-card--editing': isEditing,
              }"
              @click="selectBaseCard(baseCard.id)"
            >
              <div class="card-window__base-card-content">
                <!-- 富文本基础卡片预览 -->
                <div 
                  v-if="baseCard.type === 'RichTextCard'"
                  class="card-window__base-card-preview"
                >
                  <div 
                    class="card-window__richtext-preview"
                    v-html="getRichTextPreview(baseCard)"
                  ></div>
                </div>
                <!-- 图片基础卡片预览 -->
                <div
                  v-else-if="baseCard.type === 'ImageCard'"
                  class="card-window__base-card-preview"
                >
                  <div
                    v-if="getImageCardImages(baseCard).length > 0"
                    class="card-window__image-preview"
                    :class="getImageLayoutClass(baseCard)"
                  >
                    <template v-if="getImageEffectiveLayout(baseCard) === 'single'">
                      <div
                        class="card-window__image-single"
                        :style="getImageSingleStyle(baseCard)"
                      >
                        <img
                          :src="getImagePreviewSrc(getImageCardImages(baseCard)[0]) || undefined"
                          :alt="getImageCardImages(baseCard)[0]?.alt || ''"
                          class="card-window__image-single-img"
                          :style="getImageSingleImgStyle(baseCard)"
                          @error="handleImagePreviewError($event)"
                        />
                      </div>
                    </template>
                    <template v-else-if="getImageEffectiveLayout(baseCard) === 'grid'">
                      <div
                        class="card-window__image-grid"
                        :style="getImageGridStyle(baseCard)"
                      >
                        <div
                          v-for="(img, imgIdx) in getImageGridDisplayItems(baseCard)"
                          :key="imgIdx"
                          class="card-window__image-grid-cell"
                        >
                          <img
                            v-if="!img._overflow"
                            :src="getImagePreviewSrc(img) || undefined"
                            :alt="img.alt || ''"
                            class="card-window__image-grid-img"
                            @error="handleImagePreviewError($event)"
                          />
                          <div v-else class="card-window__image-grid-overflow">
                            <img
                              :src="getImagePreviewSrc(img) || undefined"
                              :alt="img.alt || ''"
                              class="card-window__image-grid-img card-window__image-grid-img--dim"
                              @error="handleImagePreviewError($event)"
                            />
                            <span class="card-window__image-grid-count">+{{ img._overflowCount }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <template v-else-if="getImageEffectiveLayout(baseCard) === 'long-scroll'">
                      <div
                        class="card-window__image-longscroll"
                        :style="getImageLongScrollStyle(baseCard)"
                      >
                        <img
                          v-for="(img, imgIdx) in getImageCardImages(baseCard)"
                          :key="imgIdx"
                          :src="getImagePreviewSrc(img) || undefined"
                          :alt="img.alt || ''"
                          class="card-window__image-longscroll-img"
                          @error="handleImagePreviewError($event)"
                        />
                      </div>
                    </template>
                    <template v-else-if="getImageEffectiveLayout(baseCard) === 'horizontal-scroll'">
                      <div class="card-window__image-horizontal">
                        <img
                          v-for="(img, imgIdx) in getImageCardImages(baseCard)"
                          :key="imgIdx"
                          :src="getImagePreviewSrc(img) || undefined"
                          :alt="img.alt || ''"
                          class="card-window__image-horizontal-img"
                          @error="handleImagePreviewError($event)"
                        />
                      </div>
                    </template>
                  </div>
                  <div v-else class="card-window__base-card-placeholder">
                    <span class="card-window__base-card-type-icon">🖼️</span>
                    <span>{{ getBaseCardTypeName(baseCard.type) }}</span>
                  </div>
                </div>
                <!-- 其他类型卡片占位符 -->
                <div v-else class="card-window__base-card-placeholder">
                  <span class="card-window__base-card-type-icon">📄</span>
                  <span>{{ getBaseCardTypeName(baseCard.type) }}</span>
                </div>
              </div>
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

/* 基础卡片样式 */
.card-window__base-card {
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 6px);
  overflow: hidden;
  transition: border-color var(--chips-transition-fast, 0.15s) ease,
              box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.card-window__base-card--editing {
  cursor: pointer;
}

.card-window__base-card--editing:hover {
  border-color: var(--chips-color-primary, #3b82f6);
}

.card-window__base-card--selected {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(59, 130, 246, 0.2));
}

.card-window__base-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  font-size: var(--chips-font-size-xs, 12px);
}

.card-window__base-card-type {
  color: var(--chips-color-text-primary, #1a1a1a);
  font-weight: var(--chips-font-weight-medium, 500);
}

.card-window__base-card-id {
  color: var(--chips-color-text-tertiary, #999999);
  font-family: monospace;
}

.card-window__base-card-content {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
}

.card-window__base-card-preview {
  min-height: 40px;
}

.card-window__richtext-preview {
  font-size: var(--chips-font-size-sm, 14px);
  line-height: 1.6;
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* 使用 :deep() 让样式穿透到 v-html 渲染的内容 */
.card-window__richtext-preview :deep(p) {
  margin: 0.5em 0;
}

.card-window__richtext-preview :deep(p:first-child) {
  margin-top: 0;
}

.card-window__richtext-preview :deep(p:last-child) {
  margin-bottom: 0;
}

/* 文本格式样式 */
.card-window__richtext-preview :deep(b),
.card-window__richtext-preview :deep(strong) {
  font-weight: bold;
}

.card-window__richtext-preview :deep(i),
.card-window__richtext-preview :deep(em) {
  font-style: italic;
}

.card-window__richtext-preview :deep(u) {
  text-decoration: underline;
}

.card-window__richtext-preview :deep(s),
.card-window__richtext-preview :deep(strike),
.card-window__richtext-preview :deep(del) {
  text-decoration: line-through;
}

.card-window__richtext-preview :deep(sub) {
  vertical-align: sub;
  font-size: smaller;
}

.card-window__richtext-preview :deep(sup) {
  vertical-align: super;
  font-size: smaller;
}

.card-window__richtext-preview :deep(code) {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* 列表样式 */
.card-window__richtext-preview :deep(ul),
.card-window__richtext-preview :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.card-window__richtext-preview :deep(ol) {
  list-style-type: decimal;
}

.card-window__richtext-preview :deep(ul) {
  list-style-type: disc;
}

.card-window__richtext-preview :deep(li) {
  margin: 0.25em 0;
}

/* 标题样式 */
.card-window__richtext-preview :deep(h1),
.card-window__richtext-preview :deep(h2),
.card-window__richtext-preview :deep(h3),
.card-window__richtext-preview :deep(h4),
.card-window__richtext-preview :deep(h5),
.card-window__richtext-preview :deep(h6) {
  margin: 0.5em 0;
  font-weight: bold;
}

.card-window__richtext-preview :deep(h1) { font-size: 1.5em; }
.card-window__richtext-preview :deep(h2) { font-size: 1.3em; }
.card-window__richtext-preview :deep(h3) { font-size: 1.1em; }
.card-window__richtext-preview :deep(h4) { font-size: 1em; }
.card-window__richtext-preview :deep(h5) { font-size: 0.9em; }
.card-window__richtext-preview :deep(h6) { font-size: 0.8em; }

/* 引用样式 */
.card-window__richtext-preview :deep(blockquote) {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--chips-color-border, #ddd);
  background: var(--chips-color-surface-variant, #f5f5f5);
}

/* 链接样式 */
.card-window__richtext-preview :deep(a) {
  color: var(--chips-color-primary, #3b82f6);
  text-decoration: underline;
}

/* 图片样式 */
.card-window__richtext-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

/* 分割线样式 */
.card-window__richtext-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--chips-color-border, #ddd);
  margin: 0.5em 0;
}

/* 对齐样式 */
.card-window__richtext-preview :deep([style*="text-align: center"]),
.card-window__richtext-preview :deep([align="center"]) {
  text-align: center;
}

.card-window__richtext-preview :deep([style*="text-align: right"]),
.card-window__richtext-preview :deep([align="right"]) {
  text-align: right;
}

.card-window__richtext-preview :deep([style*="text-align: justify"]) {
  text-align: justify;
}

.card-window__base-card-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-md, 16px);
  text-align: center;
  color: var(--chips-color-text-secondary, #666666);
  background: var(--chips-color-surface-variant, #f5f5f5);
  border-radius: var(--chips-radius-sm, 4px);
}

.card-window__base-card-type-icon {
  font-size: 24px;
  opacity: 0.6;
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

/* ============================================================
 * 图片卡片预览样式
 * ============================================================ */
.card-window__image-preview {
  width: 100%;
}

/* 单张图片 */
.card-window__image-single {
  width: 100%;
}
.card-window__image-single-img {
  object-fit: contain;
  border-radius: var(--chips-radius-sm, 4px);
}

/* 网格排版 */
.card-window__image-grid {
  width: 100%;
}
.card-window__image-grid-cell {
  position: relative;
  overflow: hidden;
  border-radius: var(--chips-radius-sm, 4px);
  aspect-ratio: 1;
  background: var(--chips-color-surface-variant, #f5f5f5);
}
.card-window__image-grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-window__image-grid-img--dim {
  filter: brightness(0.4);
}
.card-window__image-grid-overflow {
  position: relative;
  width: 100%;
  height: 100%;
}
.card-window__image-grid-count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* 长图拼接 */
.card-window__image-longscroll {
  width: 100%;
  border-radius: var(--chips-radius-sm, 4px);
}
.card-window__image-longscroll::-webkit-scrollbar { width: 4px; }
.card-window__image-longscroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15); border-radius: 2px;
}
.card-window__image-longscroll-img {
  width: 100%;
  display: block;
}

/* 横向滑动 */
.card-window__image-horizontal {
  width: 100%;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--chips-radius-sm, 4px);
}
.card-window__image-horizontal::-webkit-scrollbar { height: 4px; }
.card-window__image-horizontal::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15); border-radius: 2px;
}
.card-window__image-horizontal-img {
  height: 200px;
  width: auto;
  flex-shrink: 0;
  border-radius: var(--chips-radius-sm, 4px);
  object-fit: cover;
}
</style>
