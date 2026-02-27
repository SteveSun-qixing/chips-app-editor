/**
 * 画布控制 Hook
 * @module layouts/infinite-canvas/use-canvas
 * @description 提供缩放、平移等画布操作功能
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useUIStore, getUIStore } from '@/core/state';

export interface CanvasControlsOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  smoothZoom?: boolean;
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CanvasControlsReturn {
  zoom: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  zoomPercent: number;
  handleWheel: (e: React.WheelEvent | WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent | MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent | MouseEvent) => void;
  handleMouseUp: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (value: number) => void;
  resetView: () => void;
  fitToContent: (contentBounds?: ContentBounds) => void;
  panTo: (x: number, y: number) => void;
  screenToWorld: (screenX: number, screenY: number) => Point;
  worldToScreen: (worldX: number, worldY: number) => Point;
}

export function useCanvasControls(options: CanvasControlsOptions = {}): CanvasControlsReturn {
  const {
    minZoom = 0.1,
    maxZoom = 5,
    zoomStep = 0.1,
    smoothZoom = true,
  } = options;

  // React State from UIStore
  const zoom = useUIStore((s) => s.canvas.zoom);
  const panX = useUIStore((s) => s.canvas.panX);
  const panY = useUIStore((s) => s.canvas.panY);

  const uiStore = getUIStore();

  const [isPanning, setIsPanning] = useState(false);

  // Use refs for panning state to avoid stale closures in handleMouseMove
  const panStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    isPanning: false,
  });

  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

  const updateCanvas = useCallback((updates: Partial<{ zoom: number; panX: number; panY: number }>) => {
    uiStore.updateCanvas(updates);
  }, [uiStore]);

  const handleWheel = useCallback((e: React.WheelEvent | WheelEvent) => {
    e.preventDefault();

    // 滚轮 = 缩放桌面
    const currentZoom = uiStore.getState().canvas.zoom;
    const currentPanX = uiStore.getState().canvas.panX;
    const currentPanY = uiStore.getState().canvas.panY;

    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));

    if (smoothZoom && e.currentTarget instanceof HTMLElement) {
      // 防止缩放中心偏移
      let rectLeft = 0;
      let rectTop = 0;

      // React 合成事件或原生事件都可以有 currentTarget，但在某些情况下原生的绑定更稳妥。
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      rectLeft = rect.left;
      rectTop = rect.top;

      const clientX = 'clientX' in e ? e.clientX : 0;
      const clientY = 'clientY' in e ? e.clientY : 0;

      const mouseX = clientX - rectLeft;
      const mouseY = clientY - rectTop;

      const worldX = (mouseX - currentPanX) / currentZoom;
      const worldY = (mouseY - currentPanY) / currentZoom;

      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      updateCanvas({ zoom: newZoom, panX: newPanX, panY: newPanY });
    } else {
      updateCanvas({ zoom: newZoom });
    }
  }, [minZoom, maxZoom, smoothZoom, updateCanvas, zoomStep, uiStore]);

  const handleMouseDown = useCallback((e: React.MouseEvent | MouseEvent) => {
    // 鼠标中键或在画布空白处按下左键时开始平移
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      panStateRef.current = {
        startX: 'clientX' in e ? e.clientX : 0,
        startY: 'clientY' in e ? e.clientY : 0,
        originX: uiStore.getState().canvas.panX,
        originY: uiStore.getState().canvas.panY,
        isPanning: true,
      };
      setIsPanning(true);
      e.preventDefault();
    }
  }, [uiStore]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!panStateRef.current.isPanning) return;

    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;

    const deltaX = clientX - panStateRef.current.startX;
    const deltaY = clientY - panStateRef.current.startY;

    const newPanX = panStateRef.current.originX + deltaX;
    const newPanY = panStateRef.current.originY + deltaY;

    updateCanvas({ panX: newPanX, panY: newPanY });
  }, [updateCanvas]);

  const handleMouseUp = useCallback(() => {
    panStateRef.current.isPanning = false;
    setIsPanning(false);
  }, []);

  const zoomIn = useCallback(() => {
    const currentZoom = uiStore.getState().canvas.zoom;
    updateCanvas({ zoom: Math.min(maxZoom, currentZoom + zoomStep) });
  }, [maxZoom, updateCanvas, zoomStep, uiStore]);

  const zoomOut = useCallback(() => {
    const currentZoom = uiStore.getState().canvas.zoom;
    updateCanvas({ zoom: Math.max(minZoom, currentZoom - zoomStep) });
  }, [minZoom, updateCanvas, zoomStep, uiStore]);

  const zoomTo = useCallback((value: number) => {
    updateCanvas({ zoom: Math.max(minZoom, Math.min(maxZoom, value)) });
  }, [maxZoom, minZoom, updateCanvas]);

  const getAllCardsBounds = useCallback((): ContentBounds | null => {

    const state = uiStore.getState();
    const actualCardWindows = state.windowList.filter(w => w.type === 'card');

    if (actualCardWindows.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    actualCardWindows.forEach((card) => {
      const x = card.position.x;
      const y = card.position.y;
      const width = card.size.width;
      const height = card.size.height || 500;

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
  }, [uiStore]);

  const resetView = useCallback(() => {
    const bounds = getAllCardsBounds();
    let newPanX = 0;
    let newPanY = 0;

    if (bounds) {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      newPanX = viewportWidth / 2 - centerX * 1;
      newPanY = viewportHeight / 2 - centerY * 1;
    }

    updateCanvas({ zoom: 1, panX: newPanX, panY: newPanY });
  }, [getAllCardsBounds, updateCanvas]);

  const fitToContent = useCallback((contentBounds?: ContentBounds) => {
    const bounds = contentBounds || getAllCardsBounds();

    if (!bounds) {
      updateCanvas({ zoom: 1, panX: 0, panY: 0 });
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 80;

    const scaleX = (viewportWidth - padding * 2) / bounds.width;
    const scaleY = (viewportHeight - padding * 2) / bounds.height;
    let newZoom = Math.min(scaleX, scaleY);

    const maxFitZoom = Math.min(1, maxZoom);
    newZoom = Math.max(0.25, Math.min(maxFitZoom, newZoom));

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const newPanX = viewportWidth / 2 - centerX * newZoom;
    const newPanY = viewportHeight / 2 - centerY * newZoom;

    updateCanvas({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }, [getAllCardsBounds, updateCanvas, maxZoom]);

  const panTo = useCallback((x: number, y: number) => {
    updateCanvas({ panX: x, panY: y });
  }, [updateCanvas]);

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const state = uiStore.getState();
    return {
      x: (screenX - state.canvas.panX) / state.canvas.zoom,
      y: (screenY - state.canvas.panY) / state.canvas.zoom,
    };
  }, [uiStore]);

  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const state = uiStore.getState();
    return {
      x: worldX * state.canvas.zoom + state.canvas.panX,
      y: worldY * state.canvas.zoom + state.canvas.panY,
    };
  }, [uiStore]);

  return {
    zoom,
    panX,
    panY,
    isPanning,
    zoomPercent,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    zoomTo,
    resetView,
    fitToContent,
    panTo,
    screenToWorld,
    worldToScreen,
  };
}
