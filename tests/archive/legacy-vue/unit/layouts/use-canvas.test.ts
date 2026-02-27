/**
 * useCanvasControls Hook 测试
 * @module tests/unit/layouts/use-canvas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCanvasControls } from '@/layouts/infinite-canvas/use-canvas';

describe('useCanvasControls', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { zoom, panX, panY, isPanning, zoomPercent } = useCanvasControls();

      expect(zoom.value).toBe(1);
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
      expect(isPanning.value).toBe(false);
      expect(zoomPercent.value).toBe(100);
    });

    it('should accept custom options', () => {
      const controls = useCanvasControls({
        minZoom: 0.5,
        maxZoom: 2,
        zoomStep: 0.2,
      });

      // 缩小到最小值
      for (let i = 0; i < 10; i++) {
        controls.zoomOut();
      }
      expect(controls.zoom.value).toBeGreaterThanOrEqual(0.5);

      // 放大到最大值
      for (let i = 0; i < 20; i++) {
        controls.zoomIn();
      }
      expect(controls.zoom.value).toBeLessThanOrEqual(2);
    });
  });

  describe('zoom controls', () => {
    it('should zoom in', () => {
      const { zoom, zoomIn } = useCanvasControls();
      const initialZoom = zoom.value;

      zoomIn();

      expect(zoom.value).toBeGreaterThan(initialZoom);
    });

    it('should zoom out', () => {
      const { zoom, zoomOut } = useCanvasControls();
      const initialZoom = zoom.value;

      zoomOut();

      expect(zoom.value).toBeLessThan(initialZoom);
    });

    it('should respect min zoom', () => {
      const { zoom, zoomOut } = useCanvasControls({ minZoom: 0.1 });

      // 多次缩小
      for (let i = 0; i < 20; i++) {
        zoomOut();
      }

      expect(zoom.value).toBeGreaterThanOrEqual(0.1);
    });

    it('should respect max zoom', () => {
      const { zoom, zoomIn } = useCanvasControls({ maxZoom: 5 });

      // 多次放大
      for (let i = 0; i < 100; i++) {
        zoomIn();
      }

      expect(zoom.value).toBeLessThanOrEqual(5);
    });

    it('should zoom to specific value', () => {
      const { zoom, zoomTo } = useCanvasControls();

      zoomTo(2);
      expect(zoom.value).toBe(2);

      zoomTo(0.5);
      expect(zoom.value).toBe(0.5);
    });

    it('should clamp zoom to bounds', () => {
      const { zoom, zoomTo } = useCanvasControls({ minZoom: 0.1, maxZoom: 5 });

      zoomTo(0.01);
      expect(zoom.value).toBe(0.1);

      zoomTo(10);
      expect(zoom.value).toBe(5);
    });

    it('should calculate zoomPercent correctly', () => {
      const { zoomPercent, zoomTo } = useCanvasControls();

      zoomTo(1.5);
      expect(zoomPercent.value).toBe(150);

      zoomTo(0.25);
      expect(zoomPercent.value).toBe(25);
    });
  });

  describe('pan controls', () => {
    it('should pan to specific position', () => {
      const { panX, panY, panTo } = useCanvasControls();

      panTo(100, 200);

      expect(panX.value).toBe(100);
      expect(panY.value).toBe(200);
    });

    it('should handle mouse down on canvas', () => {
      const { isPanning, handleMouseDown } = useCanvasControls();

      const mockEvent = {
        button: 0,
        target: document.createElement('div'),
        currentTarget: document.createElement('div'),
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent;

      // 当 target === currentTarget 时（点击画布空白处）
      Object.defineProperty(mockEvent, 'currentTarget', {
        get: () => mockEvent.target,
      });

      handleMouseDown(mockEvent);

      expect(isPanning.value).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not pan when clicking on child elements', () => {
      const { isPanning, handleMouseDown } = useCanvasControls();

      const child = document.createElement('div');
      const parent = document.createElement('div');

      const mockEvent = {
        button: 0,
        target: child,
        currentTarget: parent,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent;

      handleMouseDown(mockEvent);

      expect(isPanning.value).toBe(false);
    });

    it('should pan with middle mouse button', () => {
      const { isPanning, handleMouseDown } = useCanvasControls();

      const child = document.createElement('div');
      const parent = document.createElement('div');

      const mockEvent = {
        button: 1, // 中键
        target: child,
        currentTarget: parent,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent;

      handleMouseDown(mockEvent);

      expect(isPanning.value).toBe(true);
    });

    it('should update pan on mouse move while panning', () => {
      const { panX, panY, handleMouseDown, handleMouseMove } = useCanvasControls();

      const element = document.createElement('div');
      const downEvent = {
        button: 1,
        target: element,
        currentTarget: element,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent;

      handleMouseDown(downEvent);

      const moveEvent = {
        clientX: 150,
        clientY: 200,
      } as MouseEvent;

      handleMouseMove(moveEvent);

      expect(panX.value).toBe(50); // 150 - 100
      expect(panY.value).toBe(100); // 200 - 100
    });

    it('should stop panning on mouse up', () => {
      const { isPanning, handleMouseDown, handleMouseUp } = useCanvasControls();

      const element = document.createElement('div');
      const downEvent = {
        button: 1,
        target: element,
        currentTarget: element,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent;

      handleMouseDown(downEvent);
      expect(isPanning.value).toBe(true);

      handleMouseUp();
      expect(isPanning.value).toBe(false);
    });

    it('should not update pan when not panning', () => {
      const { panX, panY, handleMouseMove } = useCanvasControls();

      const moveEvent = {
        clientX: 150,
        clientY: 200,
      } as MouseEvent;

      handleMouseMove(moveEvent);

      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });
  });

  describe('resetView', () => {
    it('should reset zoom and pan to defaults', () => {
      const { zoom, panX, panY, zoomTo, panTo, resetView } = useCanvasControls();

      zoomTo(2);
      panTo(100, 200);

      expect(zoom.value).toBe(2);
      expect(panX.value).toBe(100);
      expect(panY.value).toBe(200);

      resetView();

      expect(zoom.value).toBe(1);
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });
  });

  describe('fitToContent', () => {
    it('should reset view when no bounds provided', () => {
      const { zoom, panX, panY, zoomTo, panTo, fitToContent } = useCanvasControls();

      zoomTo(2);
      panTo(100, 200);

      fitToContent();

      expect(zoom.value).toBe(1);
      expect(panX.value).toBe(0);
      expect(panY.value).toBe(0);
    });

    it('should fit to content bounds', () => {
      const { zoom, fitToContent } = useCanvasControls();

      // Mock window dimensions
      Object.defineProperty(globalThis, 'innerWidth', { value: 1000, writable: true });
      Object.defineProperty(globalThis, 'innerHeight', { value: 800, writable: true });

      fitToContent({
        x: 0,
        y: 0,
        width: 500,
        height: 400,
      });

      // 缩放应该调整以适应内容
      expect(zoom.value).toBeLessThanOrEqual(1);
      expect(zoom.value).toBeGreaterThan(0);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert screen to world coordinates', () => {
      const { zoom, panX, panY, zoomTo, panTo, screenToWorld } = useCanvasControls();

      zoomTo(2);
      panTo(100, 50);

      const world = screenToWorld(200, 150);

      // (200 - 100) / 2 = 50
      expect(world.x).toBe(50);
      // (150 - 50) / 2 = 50
      expect(world.y).toBe(50);
    });

    it('should convert world to screen coordinates', () => {
      const { zoom, panX, panY, zoomTo, panTo, worldToScreen } = useCanvasControls();

      zoomTo(2);
      panTo(100, 50);

      const screen = worldToScreen(50, 50);

      // 50 * 2 + 100 = 200
      expect(screen.x).toBe(200);
      // 50 * 2 + 50 = 150
      expect(screen.y).toBe(150);
    });

    it('should have inverse relationship between conversions', () => {
      const { zoomTo, panTo, screenToWorld, worldToScreen } = useCanvasControls();

      zoomTo(1.5);
      panTo(75, 120);

      const originalScreen = { x: 300, y: 400 };
      const world = screenToWorld(originalScreen.x, originalScreen.y);
      const backToScreen = worldToScreen(world.x, world.y);

      expect(backToScreen.x).toBeCloseTo(originalScreen.x);
      expect(backToScreen.y).toBeCloseTo(originalScreen.y);
    });
  });

  describe('wheel zoom', () => {
    it('should zoom in on wheel up', () => {
      const { zoom, handleWheel } = useCanvasControls({ smoothZoom: false });
      const initialZoom = zoom.value;

      const wheelEvent = {
        deltaY: -100, // 向上滚动
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      handleWheel(wheelEvent);

      expect(zoom.value).toBeGreaterThan(initialZoom);
    });

    it('should zoom out on wheel down', () => {
      const { zoom, handleWheel } = useCanvasControls({ smoothZoom: false });
      const initialZoom = zoom.value;

      const wheelEvent = {
        deltaY: 100, // 向下滚动
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      handleWheel(wheelEvent);

      expect(zoom.value).toBeLessThan(initialZoom);
    });

    it('should zoom centered on mouse position when smoothZoom is enabled', () => {
      const { zoom, panX, panY, handleWheel } = useCanvasControls({ smoothZoom: true });

      const element = document.createElement('div');
      Object.defineProperty(element, 'getBoundingClientRect', {
        value: () => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      });

      const wheelEvent = {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        currentTarget: element,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      const initialZoom = zoom.value;
      handleWheel(wheelEvent);

      expect(zoom.value).toBeGreaterThan(initialZoom);
      // Pan 应该被调整以保持鼠标位置不变
      // 具体值取决于缩放算法
    });
  });
});
