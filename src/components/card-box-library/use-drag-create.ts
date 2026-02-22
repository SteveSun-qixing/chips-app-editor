/**
 * 拖放创建 Hook
 * @module components/card-box-library/use-drag-create
 * @description 处理从卡箱库拖放到画布创建卡片/箱子的逻辑
 */

import { ref, readonly, type Ref } from 'vue';
import type { DragData, DragState } from './types';

/** 拖放创建 Hook 返回值 */
export interface UseDragCreateReturn {
  /** 拖放状态（只读） */
  dragState: Readonly<Ref<DragState>>;
  /** 开始拖放 */
  startDrag: (data: DragData, event: DragEvent) => void;
  /** 更新预览位置 */
  updatePreview: (x: number, y: number) => void;
  /** 结束拖放 */
  endDrag: () => void;
  /** 获取拖放数据 */
  getDragData: () => DragData | null;
  /** 设置拖放数据到事件 */
  setDragDataToEvent: (event: DragEvent, data: DragData) => void;
  /** 从事件获取拖放数据 */
  getDragDataFromEvent: (event: DragEvent) => DragData | null;
}

/** 拖放数据的 MIME 类型 */
const DRAG_DATA_TYPE = 'application/x-chips-drag-data';

/** 预加载的透明拖拽图像（避免显示浏览器默认图标） */
let transparentDragImage: HTMLImageElement | null = null;

/**
 * 获取透明拖拽图像（懒加载单例）
 */
function getTransparentDragImage(): HTMLImageElement {
  if (!transparentDragImage) {
    transparentDragImage = new Image(1, 1);
    // 1x1 透明 GIF
    transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
  return transparentDragImage;
}

// 预先初始化透明图像（确保在拖拽开始前已加载）
if (typeof window !== 'undefined') {
  getTransparentDragImage();
}

/**
 * 拖放创建 Hook
 *
 * 提供从卡箱库拖放到画布创建新卡片或箱子的功能。
 *
 * @example
 * ```typescript
 * const {
 *   dragState,
 *   startDrag,
 *   updatePreview,
 *   endDrag,
 *   getDragDataFromEvent,
 * } = useDragCreate();
 *
 * // 开始拖放
 * function handleDragStart(data: DragData, event: DragEvent) {
 *   startDrag(data, event);
 * }
 *
 * // 在画布上放置
 * function handleDrop(event: DragEvent) {
 *   const data = getDragDataFromEvent(event);
 *   if (data) {
 *     // 创建卡片或箱子
 *   }
 *   endDrag();
 * }
 * ```
 */
export function useDragCreate(): UseDragCreateReturn {
  /** 拖放状态 */
  const dragState = ref<DragState>({
    isDragging: false,
    data: null,
    previewPosition: null,
  });

  /** 全局 drag 事件处理器引用（用于清理） */
  let globalDragHandler: ((e: DragEvent) => void) | null = null;
  let globalDragEndHandler: ((e: DragEvent) => void) | null = null;

  /**
   * 开始拖放
   * @param data - 拖放数据
   * @param event - 拖放事件
   */
  function startDrag(data: DragData, event: DragEvent): void {
    // 使用事件的鼠标位置作为初始预览位置，避免从左上角飞来
    const initialPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    dragState.value = {
      isDragging: true,
      data,
      previewPosition: initialPosition,
    };

    // 设置拖放数据
    setDragDataToEvent(event, data);

    // 设置拖放效果
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      // 使用预加载的透明图像隐藏浏览器默认的拖拽图标
      const transparentImg = getTransparentDragImage();
      event.dataTransfer.setDragImage(transparentImg, 0, 0);
    }

    // 添加全局 drag 事件监听器来持续更新预览位置
    globalDragHandler = (e: DragEvent) => {
      if (dragState.value.isDragging && e.clientX !== 0 && e.clientY !== 0) {
        dragState.value.previewPosition = { x: e.clientX, y: e.clientY };
      }
    };
    globalDragEndHandler = () => {
      endDrag();
    };
    
    document.addEventListener('drag', globalDragHandler);
    document.addEventListener('dragend', globalDragEndHandler);
  }

  /**
   * 更新预览位置
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  function updatePreview(x: number, y: number): void {
    if (dragState.value.isDragging) {
      dragState.value.previewPosition = { x, y };
    }
  }

  /**
   * 结束拖放
   */
  function endDrag(): void {
    // 移除全局事件监听器
    if (globalDragHandler) {
      document.removeEventListener('drag', globalDragHandler);
      globalDragHandler = null;
    }
    if (globalDragEndHandler) {
      document.removeEventListener('dragend', globalDragEndHandler);
      globalDragEndHandler = null;
    }

    dragState.value = {
      isDragging: false,
      data: null,
      previewPosition: null,
    };
  }

  /**
   * 获取拖放数据
   * @returns 拖放数据或 null
   */
  function getDragData(): DragData | null {
    return dragState.value.data;
  }

  /**
   * 设置拖放数据到事件
   * @param event - 拖放事件
   * @param data - 拖放数据
   */
  function setDragDataToEvent(event: DragEvent, data: DragData): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
      // 同时设置 text/plain 作为降级
      event.dataTransfer.setData('text/plain', data.name);
    }
  }

  /**
   * 从事件获取拖放数据
   * @param event - 拖放事件
   * @returns 拖放数据或 null
   */
  function getDragDataFromEvent(event: DragEvent): DragData | null {
    if (!event.dataTransfer) return null;

    const dataStr = event.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!dataStr) return null;

    try {
      return JSON.parse(dataStr) as DragData;
    } catch {
      return null;
    }
  }

  return {
    dragState: readonly(dragState),
    startDrag,
    updatePreview,
    endDrag,
    getDragData,
    setDragDataToEvent,
    getDragDataFromEvent,
  };
}

// 全局拖放状态（供跨组件使用）
let globalDragCreate: UseDragCreateReturn | null = null;

/**
 * 获取全局拖放创建实例
 * @returns 拖放创建实例
 */
export function useGlobalDragCreate(): UseDragCreateReturn {
  if (!globalDragCreate) {
    globalDragCreate = useDragCreate();
  }
  return globalDragCreate;
}

/**
 * 重置全局拖放创建（主要用于测试）
 */
export function resetGlobalDragCreate(): void {
  if (globalDragCreate) {
    globalDragCreate.endDrag();
  }
  globalDragCreate = null;
}
