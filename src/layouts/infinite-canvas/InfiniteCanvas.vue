<script setup lang="ts">
/**
 * 无限画布主组件
 * @module layouts/infinite-canvas/InfiniteCanvas
 * @description 编辑器核心布局 - 两层界面设计（桌面层 + 窗口层）
 */

import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import DesktopLayer from './DesktopLayer.vue';
import WindowLayer from './WindowLayer.vue';
import ZoomControl from './ZoomControl.vue';
import { useUIStore } from '@/core/state';
import { useCanvasControls } from './use-canvas';
import { DragPreview } from '@/components/card-box-library';
import { useGlobalDragCreate } from '@/components/card-box-library/use-drag-create';
import type { DragData } from '@/components/card-box-library/types';

interface CardWindowDropTarget {
  type: 'card-window';
  cardId: string;
  insertIndex?: number;
}

const emit = defineEmits<{
  /** 拖放创建卡片/箱子 */
  dropCreate: [
    data: DragData,
    worldPosition: { x: number; y: number },
    target?: CardWindowDropTarget
  ];
  /** 打开引擎设置 */
  'open-settings': [];
}>();

const uiStore = useUIStore();
const WHEEL_INTERRUPT_EMPTY_FRAMES = 12;

/** 画布容器引用 */
const canvasRef = ref<HTMLElement | null>(null);

/** 全局拖放创建实例 */
const dragCreate = useGlobalDragCreate();

/** 拖放悬停状态 */
const isDragOver = ref(false);
const insertIndicator = ref<{ left: number; top: number; width: number } | null>(null);
const cardWheelSequenceLocked = ref(false);
const wheelSequenceActive = ref(false);
let wheelSequenceRafId: number | null = null;
let wheelEventSeenInFrame = false;
let emptyWheelFrames = 0;

/** 拖放预览位置 - 使用 dragState 中的位置，确保拖拽开始时就有正确的初始位置 */
const dragPreviewPosition = computed(() => 
  dragCreate.dragState.value.previewPosition ?? { x: 0, y: 0 }
);
const desktopInsertIndicatorStyle = computed(() => {
  if (!insertIndicator.value) return undefined;
  const worldPoint = screenToWorld(insertIndicator.value.left, insertIndicator.value.top);
  return {
    left: `${worldPoint.x}px`,
    top: `${worldPoint.y}px`,
    width: `${insertIndicator.value.width / zoom.value}px`,
    '--chips-insert-indicator-scale': `${1 / Math.max(zoom.value, 0.001)}`,
  };
});

/** 使用画布控制 hook */
const {
  zoom,
  panX,
  panY,
  isPanning,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  zoomIn,
  zoomOut,
  zoomTo,
  resetView,
  fitToContent,
  screenToWorld,
  worldToScreen,
} = useCanvasControls();

/** 桌面层样式（应用缩放和平移） */
const desktopStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
}));

/** 网格样式 */
const gridStyle = computed(() => {
  const gridSize = uiStore.gridSize * zoom.value;
  return {
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${panX.value % gridSize}px ${panY.value % gridSize}px`,
  };
});

/** 画布光标样式 */
const canvasCursor = computed(() => {
  if (isPanning.value) return 'grabbing';
  return 'grab';
});

/** 提供给子组件的上下文 */
provide('canvas', {
  zoom,
  panX,
  panY,
  zoomIn,
  zoomOut,
  zoomTo,
  resetView,
  fitToContent,
  screenToWorld,
  worldToScreen,
});

/**
 * 处理画布滚轮事件
 * 
 * 滚动行为：
 * - 在桌面空白区域滚动 = 缩放桌面
 * - 在复合卡片上滚动 = 平移桌面（优先垂直）
 * - 在工具窗口上滚动 = 窗口内部滚动（由窗口处理）
 * - Ctrl/Command + 滚轮 = 在任何位置强制缩放桌面
 * 
 * @param e - 滚轮事件
 */
function onCanvasWheel(e: WheelEvent): void {
  const target = e.target as HTMLElement;

  // 检查是否在桌面空白区域（画布背景、网格或桌面层）
  const isDesktopBackground =
    target === canvasRef.value ||
    target.classList.contains('infinite-canvas__grid') ||
    target.classList.contains('desktop-layer');

  const isToolWindow = Boolean(target.closest('.base-window'));
  const isCardWindow = Boolean(target.closest('.card-window-base, .card-cover'));
  const isCardContentWheel = isCardWindow && !isToolWindow;
  markWheelSequence(isCardContentWheel);

  // Ctrl/Command + 滚轮 = 强制缩放（在任何位置）
  if (e.ctrlKey || e.metaKey) {
    handleWheel(e);
    return;
  }

  // 从复合卡片连续滚动滑出后，桌面先屏蔽滚轮缩放，直到用户中断本次滚动
  if (isDesktopBackground && cardWheelSequenceLocked.value) {
    e.preventDefault();
    return;
  }

  // 在桌面空白区域滚动 = 缩放桌面
  if (isDesktopBackground) {
    handleWheel(e);
    return;
  }

  // 在复合卡片上滚轮 = 上下平移桌面
  if (isCardContentWheel) {
    e.preventDefault();
    const zoomFactor = zoom.value || 1;
    panX.value -= e.deltaX / zoomFactor;
    panY.value -= e.deltaY / zoomFactor;
  }
}

function markWheelSequence(lockDesktopZoom: boolean): void {
  wheelEventSeenInFrame = true;
  if (lockDesktopZoom) {
    cardWheelSequenceLocked.value = true;
  }

  if (wheelSequenceActive.value) return;
  wheelSequenceActive.value = true;
  emptyWheelFrames = 0;
  startWheelSequenceMonitor();
}

function startWheelSequenceMonitor(): void {
  const tick = () => {
    if (!wheelSequenceActive.value) {
      wheelSequenceRafId = null;
      return;
    }

    if (wheelEventSeenInFrame) {
      wheelEventSeenInFrame = false;
      emptyWheelFrames = 0;
      wheelSequenceRafId = requestAnimationFrame(tick);
      return;
    }

    emptyWheelFrames += 1;
    if (emptyWheelFrames < WHEEL_INTERRUPT_EMPTY_FRAMES) {
      wheelSequenceRafId = requestAnimationFrame(tick);
      return;
    }

    // 连续多帧没有滚轮事件，视为用户中断了当前滚动手势
    wheelSequenceActive.value = false;
    cardWheelSequenceLocked.value = false;
    emptyWheelFrames = 0;
    wheelSequenceRafId = null;
  };

  wheelSequenceRafId = requestAnimationFrame(tick);
}

/**
 * 监听键盘快捷键
 * @param e - 键盘事件
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Ctrl/Cmd + 0: 重置视图
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    resetView();
  }
  // Ctrl/Cmd + +: 放大
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  // Ctrl/Cmd + -: 缩小
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
}

/**
 * 处理拖放进入
 * @param e - 拖放事件
 */
function handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  const hasExternalFiles = Boolean(
    e.dataTransfer?.types.includes('Files') &&
    !e.dataTransfer.types.includes('application/x-chips-drag-data')
  );
  isDragOver.value = hasExternalFiles;
}

/**
 * 处理拖放悬停
 * @param e - 拖放事件
 */
function handleDragOver(e: DragEvent): void {
  e.preventDefault();

  // 更新拖放效果
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }

  const data = dragCreate.dragState.value.data ?? dragCreate.getDragDataFromEvent(e);
  const resolved = resolveCardWindowDropTarget(e);

  if (data?.type === 'card' && resolved.indicator) {
    insertIndicator.value = resolved.indicator;
  } else {
    insertIndicator.value = null;
  }

  // 更新预览位置（dragPreviewPosition 现在是 computed，从 dragState 获取）
  dragCreate.updatePreview(e.clientX, e.clientY);
}

/**
 * 处理拖放离开
 * @param e - 拖放事件
 */
function handleDragLeave(e: DragEvent): void {
  // 检查是否真正离开了画布（而不是进入了子元素）
  const rect = canvasRef.value?.getBoundingClientRect();
  if (rect) {
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      isDragOver.value = false;
      insertIndicator.value = null;
    }
  }
}

function resolveCardWindowDropTarget(
  event: DragEvent
): { target?: CardWindowDropTarget; indicator?: { left: number; top: number; width: number } } {
  const pointElement = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
  const targetElement = pointElement ?? (event.target as HTMLElement | null);
  const cardWindowElement = targetElement?.closest<HTMLElement>('[data-chips-card-window="true"]');
  if (!cardWindowElement?.dataset.cardId) return {};

  const cardId = cardWindowElement.dataset.cardId;
  const baseCards = Array.from(
    cardWindowElement.querySelectorAll<HTMLElement>('[data-base-card-id]')
  );

  if (baseCards.length > 0) {
    const rects = baseCards.map((card) => card.getBoundingClientRect());
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    if (!firstRect || !lastRect) {
      return { target: { type: 'card-window', cardId } };
    }

    let insertIndex = rects.length;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect) continue;
      if (event.clientY < rect.top + rect.height / 2) {
        insertIndex = i;
        break;
      }
    }

    const seamPositions: number[] = [];
    seamPositions.push(firstRect.top - 4);
    for (let i = 1; i < rects.length; i++) {
      const prev = rects[i - 1];
      const curr = rects[i];
      if (!prev || !curr) continue;
      seamPositions.push((prev.bottom + curr.top) / 2);
    }
    seamPositions.push(lastRect.bottom + 4);

    const minLeft = Math.min(...rects.map((rect) => rect.left));
    const maxRight = Math.max(...rects.map((rect) => rect.right));

    return {
      target: { type: 'card-window', cardId, insertIndex },
      indicator: {
        left: minLeft,
        top: seamPositions[insertIndex] ?? seamPositions[seamPositions.length - 1] ?? lastRect.bottom,
        width: maxRight - minLeft,
      },
    };
  }

  return { target: { type: 'card-window', cardId } };
}

/**
 * 处理拖放释放
 * @param e - 拖放事件
 */
function handleDrop(e: DragEvent): void {
  e.preventDefault();
  isDragOver.value = false;
  insertIndicator.value = null;

  // 获取拖放数据
  const data = dragCreate.dragState.value.data ?? dragCreate.getDragDataFromEvent(e);
  if (!data) return;

  // 计算世界坐标
  const worldPosition = screenToWorld(e.clientX, e.clientY);

  // 检测是否放到复合卡片窗口内（用于插入基础卡片）
  const dropTarget = resolveCardWindowDropTarget(e).target;

  // 触发创建事件
  emit('dropCreate', data, worldPosition, dropTarget);

  // 结束拖放
  dragCreate.endDrag();
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('dragend', clearDragVisualState);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('dragend', clearDragVisualState);
  insertIndicator.value = null;
  wheelSequenceActive.value = false;
  cardWheelSequenceLocked.value = false;
  if (wheelSequenceRafId !== null) {
    cancelAnimationFrame(wheelSequenceRafId);
    wheelSequenceRafId = null;
  }
  emptyWheelFrames = 0;
});

function clearDragVisualState(): void {
  isDragOver.value = false;
  insertIndicator.value = null;
}
</script>

<template>
  <div
    ref="canvasRef"
    class="infinite-canvas"
    :class="{ 'infinite-canvas--drag-over': isDragOver }"
    :style="{ cursor: canvasCursor }"
    @wheel="onCanvasWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 网格背景 -->
    <div
      v-if="uiStore.showGrid"
      class="infinite-canvas__grid"
      :style="gridStyle"
    ></div>

    <!-- 桌面层 -->
    <DesktopLayer :style="desktopStyle">
      <div
        v-if="desktopInsertIndicatorStyle"
        class="infinite-canvas__insert-indicator"
        :style="desktopInsertIndicatorStyle"
      ></div>
      <slot name="desktop"></slot>
    </DesktopLayer>

    <!-- 窗口层（不受缩放影响） -->
    <WindowLayer @open-settings="emit('open-settings')">
      <slot name="window"></slot>

      <!-- 工具窗口动态插槽转发 -->
      <template
        v-for="(_, name) in $slots"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps ?? {}"></slot>
      </template>
    </WindowLayer>

    <!-- 缩放控制器 -->
    <ZoomControl
      :zoom="zoom"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-to="zoomTo"
      @reset="resetView"
      @fit="fitToContent"
    />

    <!-- 拖放预览（从拖拽开始就显示，不仅是在画布内） -->
    <DragPreview
      v-if="dragCreate.dragState.value.isDragging && dragCreate.dragState.value.data"
      :data="dragCreate.dragState.value.data"
      :position="dragPreviewPosition"
    />

  </div>
</template>

<style scoped>
.infinite-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--chips-color-background, #f0f2f5);
  user-select: none;
  transition: background-color 0.2s ease;
}

.infinite-canvas--drag-over {
  background-color: var(--chips-color-primary-subtle, rgba(37, 99, 235, 0.06));
}

.infinite-canvas__grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image:
    linear-gradient(to right, var(--chips-color-border, #d1d5db) 1px, transparent 1px),
    linear-gradient(to bottom, var(--chips-color-border, #d1d5db) 1px, transparent 1px);
  opacity: 0.4;
}

.infinite-canvas__insert-indicator {
  position: absolute;
  height: 3px;
  transform: translateY(-50%) scaleY(var(--chips-insert-indicator-scale, 1));
  transform-origin: center;
  background: linear-gradient(
    90deg,
    rgba(43, 165, 255, 0.92) 0%,
    rgba(24, 144, 255, 1) 50%,
    rgba(43, 165, 255, 0.92) 100%
  );
  border-radius: 999px;
  box-shadow:
    0 0 0 1px rgba(24, 144, 255, 0.35),
    0 3px 10px rgba(24, 144, 255, 0.22);
  pointer-events: none;
  z-index: 9999;
}

.infinite-canvas__insert-indicator::before {
  content: '';
  position: absolute;
  inset: -4px 0;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.12);
}
</style>
