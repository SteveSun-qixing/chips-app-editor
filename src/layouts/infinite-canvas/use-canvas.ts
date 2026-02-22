/**
 * 画布控制 Hook
 * @module layouts/infinite-canvas/use-canvas
 * @description 提供缩放、平移等画布操作功能
 */

import { ref, watch, computed, type Ref } from 'vue';
import { useUIStore } from '@/core/state';

/** 画布控制选项 */
export interface CanvasControlsOptions {
  /** 最小缩放值 */
  minZoom?: number;
  /** 最大缩放值 */
  maxZoom?: number;
  /** 缩放步长 */
  zoomStep?: number;
  /** 是否以鼠标位置为中心缩放 */
  smoothZoom?: boolean;
}

/** 内容边界 */
export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 画布控制 Hook 返回值 */
export interface CanvasControlsReturn {
  // 状态
  zoom: Ref<number>;
  panX: Ref<number>;
  panY: Ref<number>;
  isPanning: Ref<boolean>;
  zoomPercent: Ref<number>;

  // 事件处理
  handleWheel: (e: WheelEvent) => void;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: () => void;

  // 控制方法
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (value: number) => void;
  resetView: () => void;
  fitToContent: (contentBounds?: ContentBounds) => void;
  panTo: (x: number, y: number) => void;

  // 工具方法
  screenToWorld: (screenX: number, screenY: number) => Point;
  worldToScreen: (worldX: number, worldY: number) => Point;
}

/**
 * 画布控制 Hook
 * 提供缩放、平移等画布操作
 *
 * @param options - 画布控制选项
 * @returns 画布控制方法和状态
 *
 * @example
 * ```typescript
 * const {
 *   zoom,
 *   panX,
 *   panY,
 *   handleWheel,
 *   handleMouseDown,
 *   handleMouseMove,
 *   handleMouseUp,
 *   zoomIn,
 *   zoomOut,
 *   resetView,
 * } = useCanvasControls();
 * ```
 */
export function useCanvasControls(options: CanvasControlsOptions = {}): CanvasControlsReturn {
  const {
    minZoom = 0.1,
    maxZoom = 5,
    zoomStep = 0.1,
    smoothZoom = true,
  } = options;

  const uiStore = useUIStore();

  // 状态
  const zoom = ref(uiStore.canvas.zoom);
  const panX = ref(uiStore.canvas.panX);
  const panY = ref(uiStore.canvas.panY);
  const isPanning = ref(false);
  const panStart = ref<Point>({ x: 0, y: 0 });
  const panOrigin = ref<Point>({ x: 0, y: 0 });

  // 同步到 store
  watch([zoom, panX, panY], () => {
    uiStore.updateCanvas({
      zoom: zoom.value,
      panX: panX.value,
      panY: panY.value,
    });
  });

  // 缩放百分比
  const zoomPercent = computed(() => Math.round(zoom.value * 100));

  /**
   * 处理鼠标滚轮事件（在桌面空白区域）
   * 
   * 滚动行为设计：
   * - 在桌面空白区域滚轮 = 以鼠标位置为中心缩放桌面
   * - Ctrl/Command + 滚轮 = 强制缩放（在任何位置）
   * 
   * @param e - 鼠标滚轮事件
   */
  function handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    // 滚轮 = 缩放桌面
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value + delta));

    if (smoothZoom && e.currentTarget instanceof HTMLElement) {
      // 以鼠标位置为中心缩放
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 计算缩放前后的世界坐标差异
      const worldX = (mouseX - panX.value) / zoom.value;
      const worldY = (mouseY - panY.value) / zoom.value;

      zoom.value = newZoom;

      // 调整平移以保持鼠标位置不变
      panX.value = mouseX - worldX * newZoom;
      panY.value = mouseY - worldY * newZoom;
    } else {
      zoom.value = newZoom;
    }
  }

  /**
   * 处理鼠标按下（开始平移）
   * @param e - 鼠标事件
   */
  function handleMouseDown(e: MouseEvent): void {
    // 鼠标中键或在画布空白处按下左键时开始平移
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      isPanning.value = true;
      panStart.value = { x: e.clientX, y: e.clientY };
      panOrigin.value = { x: panX.value, y: panY.value };
      e.preventDefault();
    }
  }

  /**
   * 处理鼠标移动（平移中）
   * @param e - 鼠标事件
   */
  function handleMouseMove(e: MouseEvent): void {
    if (!isPanning.value) return;

    const deltaX = e.clientX - panStart.value.x;
    const deltaY = e.clientY - panStart.value.y;

    panX.value = panOrigin.value.x + deltaX;
    panY.value = panOrigin.value.y + deltaY;
  }

  /**
   * 处理鼠标抬起（结束平移）
   */
  function handleMouseUp(): void {
    isPanning.value = false;
  }

  /**
   * 放大
   */
  function zoomIn(): void {
    zoom.value = Math.min(maxZoom, zoom.value + zoomStep);
  }

  /**
   * 缩小
   */
  function zoomOut(): void {
    zoom.value = Math.max(minZoom, zoom.value - zoomStep);
  }

  /**
   * 缩放到指定值
   * @param value - 目标缩放值
   */
  function zoomTo(value: number): void {
    zoom.value = Math.max(minZoom, Math.min(maxZoom, value));
  }

  /**
   * 获取所有卡片窗口的边界
   * @returns 所有卡片组成的边界，如果没有卡片返回 null
   */
  function getAllCardsBounds(): ContentBounds | null {
    const cardWindows = uiStore.cardWindows;
    if (cardWindows.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    cardWindows.forEach((card) => {
      const x = card.position.x;
      const y = card.position.y;
      const width = card.size.width;
      const height = card.size.height || 500; // 默认高度

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * 重置视图
   * 将缩放比例重置为 100%，视觉中心移动到所有卡片中心
   */
  function resetView(): void {
    zoom.value = 1;

    // 获取所有卡片的边界
    const bounds = getAllCardsBounds();
    if (bounds) {
      // 计算卡片中心
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      // 计算视口中心
      const viewportWidth = globalThis.innerWidth;
      const viewportHeight = globalThis.innerHeight;

      // 将卡片中心移动到视口中心
      panX.value = viewportWidth / 2 - centerX * zoom.value;
      panY.value = viewportHeight / 2 - centerY * zoom.value;
    } else {
      panX.value = 0;
      panY.value = 0;
    }
  }

  /**
   * 适应内容
   * 缩放到能看到所有卡片的比例，最小不低于 25%
   * @param contentBounds - 内容边界（可选，不传则自动计算）
   */
  function fitToContent(contentBounds?: ContentBounds): void {
    // 如果没有传入边界，自动计算所有卡片的边界
    const bounds = contentBounds || getAllCardsBounds();
    
    if (!bounds) {
      // 没有卡片，重置到默认位置
      zoom.value = 1;
      panX.value = 0;
      panY.value = 0;
      return;
    }

    // 计算适应视口的缩放比例
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;
    const padding = 80; // 边距

    const scaleX = (viewportWidth - padding * 2) / bounds.width;
    const scaleY = (viewportHeight - padding * 2) / bounds.height;
    let newZoom = Math.min(scaleX, scaleY);

    // 限制缩放范围：最小 25%，最大不超过 100%（或 maxZoom）
    const maxFitZoom = Math.min(1, maxZoom);
    newZoom = Math.max(0.25, Math.min(maxFitZoom, newZoom));

    zoom.value = newZoom;

    // 计算卡片中心
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // 将卡片中心移动到视口中心
    panX.value = viewportWidth / 2 - centerX * zoom.value;
    panY.value = viewportHeight / 2 - centerY * zoom.value;
  }

  /**
   * 平移到指定位置
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  function panTo(x: number, y: number): void {
    panX.value = x;
    panY.value = y;
  }

  /**
   * 将屏幕坐标转换为世界坐标
   * @param screenX - 屏幕 X 坐标
   * @param screenY - 屏幕 Y 坐标
   * @returns 世界坐标
   */
  function screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - panX.value) / zoom.value,
      y: (screenY - panY.value) / zoom.value,
    };
  }

  /**
   * 将世界坐标转换为屏幕坐标
   * @param worldX - 世界 X 坐标
   * @param worldY - 世界 Y 坐标
   * @returns 屏幕坐标
   */
  function worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: worldX * zoom.value + panX.value,
      y: worldY * zoom.value + panY.value,
    };
  }

  return {
    // 状态
    zoom,
    panX,
    panY,
    isPanning,
    zoomPercent,

    // 事件处理
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // 控制方法
    zoomIn,
    zoomOut,
    zoomTo,
    resetView,
    fitToContent,
    panTo,

    // 工具方法
    screenToWorld,
    worldToScreen,
  };
}
