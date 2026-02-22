/**
 * UI Store 测试
 * @module tests/unit/core/state/ui
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '@/core/state/stores/ui';
import type { WindowConfig, CardWindowConfig, ToolWindowConfig } from '@/types';

// 创建测试用的模拟窗口配置
function createMockCardWindow(id: string): CardWindowConfig {
  return {
    id,
    type: 'card',
    title: `Card ${id}`,
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    state: 'normal',
    zIndex: 100,
    cardId: `card-${id}`,
    isEditing: false,
  };
}

function createMockToolWindow(id: string): ToolWindowConfig {
  return {
    id,
    type: 'tool',
    title: `Tool ${id}`,
    position: { x: 200, y: 200 },
    size: { width: 300, height: 400 },
    state: 'normal',
    zIndex: 100,
    component: 'ToolComponent',
  };
}

describe('useUIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useUIStore();
      expect(store.windows.size).toBe(0);
      expect(store.focusedWindowId).toBeNull();
      expect(store.maxZIndex).toBe(100);
      expect(store.canvas).toEqual({ zoom: 1, panX: 0, panY: 0 });
      expect(store.sidebarExpanded).toBe(true);
      expect(store.sidebarWidth).toBe(280);
      expect(store.dockPosition).toBe('bottom');
      expect(store.dockVisible).toBe(true);
      expect(store.theme).toBe('default-light');
      expect(store.showGrid).toBe(true);
      expect(store.snapToGrid).toBe(true);
      expect(store.gridSize).toBe(20);
      expect(store.minimizedTools.size).toBe(0);
      expect(store.isFullscreen).toBe(false);
      expect(store.isDragging).toBe(false);
    });
  });

  describe('getters', () => {
    it('windowList should return array of windows', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.addWindow(createMockCardWindow('win2'));
      expect(store.windowList).toHaveLength(2);
    });

    it('cardWindows should return only card windows', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('card1'));
      store.addWindow(createMockToolWindow('tool1'));
      expect(store.cardWindows).toHaveLength(1);
      expect(store.cardWindows[0]?.id).toBe('card1');
    });

    it('toolWindows should return only tool windows', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('card1'));
      store.addWindow(createMockToolWindow('tool1'));
      expect(store.toolWindows).toHaveLength(1);
      expect(store.toolWindows[0]?.id).toBe('tool1');
    });

    it('focusedWindow should return focused window', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.focusWindow('win1');
      expect(store.focusedWindow).not.toBeNull();
      expect(store.focusedWindow?.id).toBe('win1');
    });

    it('zoomPercent should return percentage', () => {
      const store = useUIStore();
      expect(store.zoomPercent).toBe(100);
      store.setZoom(1.5);
      expect(store.zoomPercent).toBe(150);
    });

    it('windowCount should return correct count', () => {
      const store = useUIStore();
      expect(store.windowCount).toBe(0);
      store.addWindow(createMockCardWindow('win1'));
      expect(store.windowCount).toBe(1);
    });

    it('hasWindows should return true when there are windows', () => {
      const store = useUIStore();
      expect(store.hasWindows).toBe(false);
      store.addWindow(createMockCardWindow('win1'));
      expect(store.hasWindows).toBe(true);
    });

    it('isDarkTheme should return true for dark themes', () => {
      const store = useUIStore();
      expect(store.isDarkTheme).toBe(false);
      store.setTheme('default-dark');
      expect(store.isDarkTheme).toBe(true);
    });
  });

  describe('window actions', () => {
    it('addWindow should add window with zIndex', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      expect(store.windows.has('win1')).toBe(true);
      expect(store.getWindow('win1')?.zIndex).toBe(101);
    });

    it('removeWindow should remove window', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.removeWindow('win1');
      expect(store.windows.has('win1')).toBe(false);
    });

    it('removeWindow should clear focus if removing focused window', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.focusWindow('win1');
      store.removeWindow('win1');
      expect(store.focusedWindowId).toBeNull();
    });

    it('updateWindow should update window config', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.updateWindow('win1', { title: 'New Title' });
      expect(store.getWindow('win1')?.title).toBe('New Title');
    });

    it('focusWindow should update zIndex', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.addWindow(createMockCardWindow('win2'));
      store.focusWindow('win1');
      const win1 = store.getWindow('win1');
      expect(win1?.zIndex).toBeGreaterThan(102);
    });

    it('blurWindow should clear focus', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.focusWindow('win1');
      store.blurWindow();
      expect(store.focusedWindowId).toBeNull();
    });

    it('moveWindow should update position', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.moveWindow('win1', 500, 300);
      const win = store.getWindow('win1');
      expect(win?.position).toEqual({ x: 500, y: 300 });
    });

    it('resizeWindow should update size', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.resizeWindow('win1', 800, 600);
      const win = store.getWindow('win1');
      expect(win?.size).toEqual({ width: 800, height: 600 });
    });

    it('setWindowState should update state', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.setWindowState('win1', 'minimized');
      expect(store.getWindow('win1')?.state).toBe('minimized');
    });
  });

  describe('canvas actions', () => {
    it('updateCanvas should update canvas state', () => {
      const store = useUIStore();
      store.updateCanvas({ zoom: 2, panX: 100 });
      expect(store.canvas.zoom).toBe(2);
      expect(store.canvas.panX).toBe(100);
    });

    it('setZoom should clamp value between 0.1 and 5', () => {
      const store = useUIStore();
      store.setZoom(0.05);
      expect(store.canvas.zoom).toBe(0.1);
      store.setZoom(10);
      expect(store.canvas.zoom).toBe(5);
    });

    it('zoomIn should increase zoom', () => {
      const store = useUIStore();
      store.zoomIn(0.5);
      expect(store.canvas.zoom).toBe(1.5);
    });

    it('zoomOut should decrease zoom', () => {
      const store = useUIStore();
      store.zoomOut(0.5);
      expect(store.canvas.zoom).toBe(0.5);
    });

    it('pan should update position', () => {
      const store = useUIStore();
      store.pan(50, 30);
      expect(store.canvas.panX).toBe(50);
      expect(store.canvas.panY).toBe(30);
    });

    it('setCanvasPosition should set absolute position', () => {
      const store = useUIStore();
      store.setCanvasPosition(200, 150);
      expect(store.canvas.panX).toBe(200);
      expect(store.canvas.panY).toBe(150);
    });

    it('resetCanvas should reset to default', () => {
      const store = useUIStore();
      store.updateCanvas({ zoom: 2, panX: 100, panY: 50 });
      store.resetCanvas();
      expect(store.canvas).toEqual({ zoom: 1, panX: 0, panY: 0 });
    });
  });

  describe('sidebar actions', () => {
    it('toggleSidebar should toggle state', () => {
      const store = useUIStore();
      expect(store.sidebarExpanded).toBe(true);
      store.toggleSidebar();
      expect(store.sidebarExpanded).toBe(false);
      store.toggleSidebar();
      expect(store.sidebarExpanded).toBe(true);
    });

    it('setSidebarExpanded should set state', () => {
      const store = useUIStore();
      store.setSidebarExpanded(false);
      expect(store.sidebarExpanded).toBe(false);
    });

    it('setSidebarWidth should clamp value', () => {
      const store = useUIStore();
      store.setSidebarWidth(100);
      expect(store.sidebarWidth).toBe(200);
      store.setSidebarWidth(500);
      expect(store.sidebarWidth).toBe(400);
    });
  });

  describe('dock actions', () => {
    it('setDockPosition should update position', () => {
      const store = useUIStore();
      store.setDockPosition('left');
      expect(store.dockPosition).toBe('left');
    });

    it('toggleDockVisible should toggle visibility', () => {
      const store = useUIStore();
      store.toggleDockVisible();
      expect(store.dockVisible).toBe(false);
    });

    it('setDockVisible should set visibility', () => {
      const store = useUIStore();
      store.setDockVisible(false);
      expect(store.dockVisible).toBe(false);
    });
  });

  describe('theme and grid actions', () => {
    it('setTheme should update theme', () => {
      const store = useUIStore();
      store.setTheme('dark-modern');
      expect(store.theme).toBe('dark-modern');
    });

    it('toggleGrid should toggle grid visibility', () => {
      const store = useUIStore();
      store.toggleGrid();
      expect(store.showGrid).toBe(false);
    });

    it('setShowGrid should set grid visibility', () => {
      const store = useUIStore();
      store.setShowGrid(false);
      expect(store.showGrid).toBe(false);
    });

    it('toggleSnapToGrid should toggle snap', () => {
      const store = useUIStore();
      store.toggleSnapToGrid();
      expect(store.snapToGrid).toBe(false);
    });

    it('setGridSize should clamp value', () => {
      const store = useUIStore();
      store.setGridSize(5);
      expect(store.gridSize).toBe(10);
      store.setGridSize(200);
      expect(store.gridSize).toBe(100);
    });
  });

  describe('tool minimize actions', () => {
    it('minimizeTool should add to minimizedTools and update state', () => {
      const store = useUIStore();
      store.addWindow(createMockToolWindow('tool1'));
      store.minimizeTool('tool1');
      expect(store.minimizedTools.has('tool1')).toBe(true);
      expect(store.getWindow('tool1')?.state).toBe('minimized');
    });

    it('restoreTool should remove from minimizedTools and update state', () => {
      const store = useUIStore();
      store.addWindow(createMockToolWindow('tool1'));
      store.minimizeTool('tool1');
      store.restoreTool('tool1');
      expect(store.minimizedTools.has('tool1')).toBe(false);
      expect(store.getWindow('tool1')?.state).toBe('normal');
    });
  });

  describe('fullscreen and dragging actions', () => {
    it('toggleFullscreen should toggle state', () => {
      const store = useUIStore();
      store.toggleFullscreen();
      expect(store.isFullscreen).toBe(true);
    });

    it('setFullscreen should set state', () => {
      const store = useUIStore();
      store.setFullscreen(true);
      expect(store.isFullscreen).toBe(true);
    });

    it('setDragging should set state', () => {
      const store = useUIStore();
      store.setDragging(true);
      expect(store.isDragging).toBe(true);
    });
  });

  describe('clearWindows and reset', () => {
    it('clearWindows should clear all windows', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.addWindow(createMockToolWindow('tool1'));
      store.focusWindow('win1');
      store.minimizeTool('tool1');
      store.clearWindows();
      expect(store.windows.size).toBe(0);
      expect(store.focusedWindowId).toBeNull();
      expect(store.minimizedTools.size).toBe(0);
    });

    it('reset should reset all UI state', () => {
      const store = useUIStore();
      store.addWindow(createMockCardWindow('win1'));
      store.updateCanvas({ zoom: 2, panX: 100, panY: 50 });
      store.setSidebarExpanded(false);
      store.setDockVisible(false);
      store.setFullscreen(true);
      store.setDragging(true);
      store.reset();
      expect(store.windows.size).toBe(0);
      expect(store.canvas).toEqual({ zoom: 1, panX: 0, panY: 0 });
      expect(store.sidebarExpanded).toBe(true);
      expect(store.dockVisible).toBe(true);
      expect(store.isFullscreen).toBe(false);
      expect(store.isDragging).toBe(false);
    });
  });
});
