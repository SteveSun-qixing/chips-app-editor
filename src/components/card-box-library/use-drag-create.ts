import type { DragData, DragState } from './types';

/** 拖放创建 Hook 返回值 */
export interface UseDragCreateReturn {
  /** 拖放状态 */
  getState: () => DragState;
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
  /** 订阅拖放状态变化 */
  subscribe: (listener: (state: DragState) => void) => () => void;
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
    if (typeof Image !== 'undefined') {
      transparentDragImage = new Image(1, 1);
      // 1x1 透明 GIF
      transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
  }
  return transparentDragImage as HTMLImageElement;
}

// 预先初始化透明图像（确保在拖拽开始前已加载）
if (typeof window !== 'undefined') {
  getTransparentDragImage();
}

let dragState: DragState = {
  isDragging: false,
  data: null,
  previewPosition: null,
};

const listeners = new Set<(state: DragState) => void>();

function notify() {
  listeners.forEach(fn => fn(dragState));
}

let globalDragHandler: ((e: DragEvent) => void) | null = null;
let globalDragEndHandler: ((e: DragEvent) => void) | null = null;

function startDrag(data: DragData, event: DragEvent): void {
  const initialPosition = {
    x: event.clientX,
    y: event.clientY,
  };

  dragState = {
    isDragging: true,
    data,
    previewPosition: initialPosition,
  };

  setDragDataToEvent(event, data);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    const transparentImg = getTransparentDragImage();
    if (transparentImg) {
      event.dataTransfer.setDragImage(transparentImg, 0, 0);
    }
  }

  notify();

  globalDragHandler = (e: DragEvent) => {
    if (dragState.isDragging && e.clientX !== 0 && e.clientY !== 0) {
      dragState = {
        ...dragState,
        previewPosition: { x: e.clientX, y: e.clientY },
      };
      notify();
    }
  };
  globalDragEndHandler = () => {
    endDrag();
  };

  document.addEventListener('drag', globalDragHandler);
  document.addEventListener('dragend', globalDragEndHandler);
}

function updatePreview(x: number, y: number): void {
  if (dragState.isDragging) {
    dragState = {
      ...dragState,
      previewPosition: { x, y }
    };
    notify();
  }
}

function endDrag(): void {
  if (globalDragHandler) {
    document.removeEventListener('drag', globalDragHandler);
    globalDragHandler = null;
  }
  if (globalDragEndHandler) {
    document.removeEventListener('dragend', globalDragEndHandler);
    globalDragEndHandler = null;
  }

  dragState = {
    isDragging: false,
    data: null,
    previewPosition: null,
  };
  notify();
}

function getDragData(): DragData | null {
  return dragState.data;
}

function setDragDataToEvent(event: DragEvent, data: DragData): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
    // 同时设置 text/plain 作为降级
    event.dataTransfer.setData('text/plain', data.name);
  }
}

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

function getState(): DragState {
  return dragState;
}

function subscribe(listener: (state: DragState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDragCreate(): UseDragCreateReturn {
  return {
    getState,
    startDrag,
    updatePreview,
    endDrag,
    getDragData,
    setDragDataToEvent,
    getDragDataFromEvent,
    subscribe,
  };
}

let globalDragCreate: UseDragCreateReturn | null = null;

export function useGlobalDragCreate(): UseDragCreateReturn {
  if (!globalDragCreate) {
    globalDragCreate = useDragCreate();
  }
  return globalDragCreate;
}

export function resetGlobalDragCreate(): void {
  if (globalDragCreate) {
    globalDragCreate.endDrag();
  }
  globalDragCreate = null;
}
