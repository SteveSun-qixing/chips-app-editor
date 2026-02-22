/**
 * WindowManager 测试
 * @module tests/unit/core/window-manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  WindowManager,
  useWindowManager,
  resetWindowManager,
} from '@/core/window-manager';
import { useUIStore, useCardStore } from '@/core/state';
import type { CardWindowConfig, ToolWindowConfig } from '@/types';

describe('WindowManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetWindowManager();
  });

  afterEach(() => {
    resetWindowManager();
  });

  describe('useWindowManager', () => {
    it('should return singleton instance', () => {
      const manager1 = useWindowManager();
      const manager2 = useWindowManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset correctly', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Test');
      expect(manager.getAllWindows()).toHaveLength(1);

      resetWindowManager();
      const newManager = useWindowManager();
      expect(newManager.getAllWindows()).toHaveLength(0);
    });
  });

  describe('createCardWindow', () => {
    it('should create card window with correct config', () => {
      const manager = useWindowManager();
      const windowId = manager.createCardWindow('card-123', {
        title: '测试卡片',
      });

      expect(windowId).toMatch(/^card-window_/);

      const window = manager.getWindow(windowId) as CardWindowConfig;
      expect(window).toBeDefined();
      expect(window.type).toBe('card');
      expect(window.cardId).toBe('card-123');
      expect(window.title).toBe('测试卡片');
      expect(window.state).toBe('normal');
      expect(window.isEditing).toBe(false);
    });

    it('should use default position and size', () => {
      const manager = useWindowManager();
      const windowId = manager.createCardWindow('card-123');

      const window = manager.getWindow(windowId);
      expect(window?.position).toEqual({ x: 100, y: 100 });
      expect(window?.size).toEqual({ width: 400, height: 600 });
    });

    it('should use custom position and size', () => {
      const manager = useWindowManager();
      const windowId = manager.createCardWindow('card-123', {
        position: { x: 200, y: 300 },
        size: { width: 500, height: 400 },
      });

      const window = manager.getWindow(windowId);
      expect(window?.position).toEqual({ x: 200, y: 300 });
      expect(window?.size).toEqual({ width: 500, height: 400 });
    });

    it('should cascade window positions', () => {
      const manager = useWindowManager();
      const windowId1 = manager.createCardWindow('card-1');
      const windowId2 = manager.createCardWindow('card-2');
      const windowId3 = manager.createCardWindow('card-3');

      const window1 = manager.getWindow(windowId1);
      const window2 = manager.getWindow(windowId2);
      const window3 = manager.getWindow(windowId3);

      expect(window1?.position).toEqual({ x: 100, y: 100 });
      expect(window2?.position).toEqual({ x: 130, y: 130 });
      expect(window3?.position).toEqual({ x: 160, y: 160 });
    });
  });

  describe('createToolWindow', () => {
    it('should create tool window with correct config', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('FileManager', {
        title: '文件管理器',
        icon: '📁',
      });

      expect(windowId).toMatch(/^tool-window_/);

      const window = manager.getWindow(windowId) as ToolWindowConfig;
      expect(window).toBeDefined();
      expect(window.type).toBe('tool');
      expect(window.component).toBe('FileManager');
      expect(window.title).toBe('文件管理器');
      expect(window.icon).toBe('📁');
      expect(window.state).toBe('normal');
    });

    it('should use component name as default title', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('FileManager');

      const window = manager.getWindow(windowId);
      expect(window?.title).toBe('FileManager');
    });

    it('should set dockable to true by default', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('TestTool');

      const window = manager.getWindow(windowId) as ToolWindowConfig;
      expect(window.dockable).toBe(true);
    });
  });

  describe('closeWindow', () => {
    it('should remove window from store', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      expect(manager.hasWindow(windowId)).toBe(true);

      manager.closeWindow(windowId);

      expect(manager.hasWindow(windowId)).toBe(false);
      expect(manager.getWindow(windowId)).toBeUndefined();
    });

    it('should handle closing non-existent window', () => {
      const manager = useWindowManager();
      // Should not throw
      expect(() => manager.closeWindow('non-existent')).not.toThrow();
    });
  });

  describe('focusWindow', () => {
    it('should update focused window and z-index', () => {
      const manager = useWindowManager();
      const uiStore = useUIStore();
      const windowId = manager.createToolWindow('Test');

      manager.focusWindow(windowId);

      expect(uiStore.focusedWindowId).toBe(windowId);
    });

    it('should bring window to front', () => {
      const manager = useWindowManager();
      const windowId1 = manager.createToolWindow('Tool1');
      const windowId2 = manager.createToolWindow('Tool2');

      manager.focusWindow(windowId1);

      const window1 = manager.getWindow(windowId1);
      const window2 = manager.getWindow(windowId2);

      expect(window1!.zIndex).toBeGreaterThan(window2!.zIndex);
    });
  });

  describe('blurWindow', () => {
    it('should clear focus', () => {
      const manager = useWindowManager();
      const uiStore = useUIStore();
      const windowId = manager.createToolWindow('Test');

      manager.focusWindow(windowId);
      expect(uiStore.focusedWindowId).toBe(windowId);

      manager.blurWindow();
      expect(uiStore.focusedWindowId).toBeNull();
    });
  });

  describe('moveWindow', () => {
    it('should update window position', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.moveWindow(windowId, { x: 500, y: 300 });

      const window = manager.getWindow(windowId);
      expect(window?.position).toEqual({ x: 500, y: 300 });
    });
  });

  describe('resizeWindow', () => {
    it('should update window size', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.resizeWindow(windowId, { width: 800, height: 600 });

      const window = manager.getWindow(windowId);
      expect(window?.size).toEqual({ width: 800, height: 600 });
    });
  });

  describe('updateWindow', () => {
    it('should update window configuration', () => {
      const manager = useWindowManager();
      const windowId = manager.createCardWindow('card-1', { title: 'Original' });

      manager.updateWindow(windowId, { title: 'Updated' });

      const window = manager.getWindow(windowId);
      expect(window?.title).toBe('Updated');
    });

    it('should update multiple properties', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.updateWindow(windowId, {
        title: 'New Title',
        state: 'collapsed',
      });

      const window = manager.getWindow(windowId);
      expect(window?.title).toBe('New Title');
      expect(window?.state).toBe('collapsed');
    });
  });

  describe('setWindowState', () => {
    it('should update window state', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.setWindowState(windowId, 'minimized');

      expect(manager.getWindow(windowId)?.state).toBe('minimized');
    });
  });

  describe('minimizeWindow', () => {
    it('should set state to minimized', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.minimizeWindow(windowId);

      expect(manager.getWindow(windowId)?.state).toBe('minimized');
    });
  });

  describe('restoreWindow', () => {
    it('should set state to normal', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      manager.minimizeWindow(windowId);
      expect(manager.getWindow(windowId)?.state).toBe('minimized');

      manager.restoreWindow(windowId);
      expect(manager.getWindow(windowId)?.state).toBe('normal');
    });

    it('should restore tool from minimized set', () => {
      const manager = useWindowManager();
      const uiStore = useUIStore();
      const windowId = manager.createToolWindow('Test');

      uiStore.minimizeTool(windowId);
      expect(uiStore.minimizedTools.has(windowId)).toBe(true);

      manager.restoreWindow(windowId);
      expect(uiStore.minimizedTools.has(windowId)).toBe(false);
    });
  });

  describe('toggleCollapse', () => {
    it('should toggle between normal and collapsed', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      expect(manager.getWindow(windowId)?.state).toBe('normal');

      manager.toggleCollapse(windowId);
      expect(manager.getWindow(windowId)?.state).toBe('collapsed');

      manager.toggleCollapse(windowId);
      expect(manager.getWindow(windowId)?.state).toBe('normal');
    });

    it('should handle non-existent window', () => {
      const manager = useWindowManager();
      expect(() => manager.toggleCollapse('non-existent')).not.toThrow();
    });
  });

  describe('getWindow', () => {
    it('should return window config', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');

      const window = manager.getWindow(windowId);
      expect(window).toBeDefined();
      expect(window?.id).toBe(windowId);
    });

    it('should return undefined for non-existent window', () => {
      const manager = useWindowManager();
      expect(manager.getWindow('non-existent')).toBeUndefined();
    });
  });

  describe('getAllWindows', () => {
    it('should return all windows', () => {
      const manager = useWindowManager();
      manager.createCardWindow('card-1');
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      const windows = manager.getAllWindows();
      expect(windows).toHaveLength(3);
    });

    it('should return empty array when no windows', () => {
      const manager = useWindowManager();
      expect(manager.getAllWindows()).toHaveLength(0);
    });
  });

  describe('getCardWindows', () => {
    it('should return only card windows', () => {
      const manager = useWindowManager();
      manager.createCardWindow('card-1');
      manager.createCardWindow('card-2');
      manager.createToolWindow('Tool1');

      const cardWindows = manager.getCardWindows();
      expect(cardWindows).toHaveLength(2);
      expect(cardWindows.every((w) => w.type === 'card')).toBe(true);
    });
  });

  describe('getToolWindows', () => {
    it('should return only tool windows', () => {
      const manager = useWindowManager();
      manager.createCardWindow('card-1');
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      const toolWindows = manager.getToolWindows();
      expect(toolWindows).toHaveLength(2);
      expect(toolWindows.every((w) => w.type === 'tool')).toBe(true);
    });
  });

  describe('getFocusedWindow', () => {
    it('should return focused window', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');
      manager.focusWindow(windowId);

      const focused = manager.getFocusedWindow();
      expect(focused).toBeDefined();
      expect(focused?.id).toBe(windowId);
    });

    it('should return null when no window is focused', () => {
      const manager = useWindowManager();
      expect(manager.getFocusedWindow()).toBeNull();
    });
  });

  describe('hasWindow', () => {
    it('should return true for existing window', () => {
      const manager = useWindowManager();
      const windowId = manager.createToolWindow('Test');
      expect(manager.hasWindow(windowId)).toBe(true);
    });

    it('should return false for non-existent window', () => {
      const manager = useWindowManager();
      expect(manager.hasWindow('non-existent')).toBe(false);
    });
  });

  describe('tileWindows', () => {
    it('should arrange windows in grid', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');
      manager.createToolWindow('Tool3');
      manager.createToolWindow('Tool4');

      manager.tileWindows();

      const windows = manager.getAllWindows();
      // 2x2 grid
      expect(windows[0]?.position).toEqual({ x: 50, y: 50 });
      expect(windows[1]?.position).toEqual({ x: 470, y: 50 }); // 50 + 400 + 20
      expect(windows[2]?.position).toEqual({ x: 50, y: 370 }); // 50 + 300 + 20
      expect(windows[3]?.position).toEqual({ x: 470, y: 370 });
    });

    it('should use custom options', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      manager.tileWindows({
        windowWidth: 300,
        windowHeight: 200,
        gap: 10,
        startX: 100,
        startY: 100,
      });

      const windows = manager.getAllWindows();
      expect(windows[0]?.position).toEqual({ x: 100, y: 100 });
      expect(windows[0]?.size).toEqual({ width: 300, height: 200 });
      expect(windows[1]?.position).toEqual({ x: 410, y: 100 }); // 100 + 300 + 10
    });

    it('should skip minimized windows', () => {
      const manager = useWindowManager();
      const windowId1 = manager.createToolWindow('Tool1');
      const windowId2 = manager.createToolWindow('Tool2');

      manager.minimizeWindow(windowId1);
      manager.tileWindows();

      const window1 = manager.getWindow(windowId1);
      expect(window1?.state).toBe('minimized');
    });

    it('should handle no windows', () => {
      const manager = useWindowManager();
      expect(() => manager.tileWindows()).not.toThrow();
    });
  });

  describe('cascadeWindows', () => {
    it('should arrange windows in cascade', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');
      manager.createToolWindow('Tool3');

      manager.cascadeWindows();

      const windows = manager.getAllWindows();
      expect(windows[0]?.position).toEqual({ x: 50, y: 50 });
      expect(windows[1]?.position).toEqual({ x: 80, y: 80 });
      expect(windows[2]?.position).toEqual({ x: 110, y: 110 });
    });

    it('should use custom options', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      manager.cascadeWindows({
        startX: 100,
        startY: 100,
        offsetX: 50,
        offsetY: 50,
      });

      const windows = manager.getAllWindows();
      expect(windows[0]?.position).toEqual({ x: 100, y: 100 });
      expect(windows[1]?.position).toEqual({ x: 150, y: 150 });
    });
  });

  describe('closeAllWindows', () => {
    it('should close all windows', () => {
      const manager = useWindowManager();
      manager.createCardWindow('card-1');
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      expect(manager.getAllWindows()).toHaveLength(3);

      manager.closeAllWindows();

      expect(manager.getAllWindows()).toHaveLength(0);
    });
  });

  describe('minimizeAllWindows', () => {
    it('should minimize all normal windows', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');
      manager.createToolWindow('Tool3');

      manager.minimizeAllWindows();

      const windows = manager.getAllWindows();
      expect(windows.every((w) => w.state === 'minimized')).toBe(true);
    });
  });

  describe('restoreAllWindows', () => {
    it('should restore all minimized windows', () => {
      const manager = useWindowManager();
      manager.createToolWindow('Tool1');
      manager.createToolWindow('Tool2');

      manager.minimizeAllWindows();
      expect(manager.getAllWindows().every((w) => w.state === 'minimized')).toBe(
        true
      );

      manager.restoreAllWindows();
      expect(manager.getAllWindows().every((w) => w.state === 'normal')).toBe(
        true
      );
    });
  });

  describe('findWindowByCardId', () => {
    it('should find card window by card ID', () => {
      const manager = useWindowManager();
      const windowId = manager.createCardWindow('card-123');

      const found = manager.findWindowByCardId('card-123');
      expect(found).toBeDefined();
      expect(found?.id).toBe(windowId);
      expect(found?.cardId).toBe('card-123');
    });

    it('should return undefined if not found', () => {
      const manager = useWindowManager();
      expect(manager.findWindowByCardId('non-existent')).toBeUndefined();
    });
  });

  describe('findWindowsByComponent', () => {
    it('should find tool windows by component name', () => {
      const manager = useWindowManager();
      manager.createToolWindow('FileManager');
      manager.createToolWindow('EditPanel');
      manager.createToolWindow('FileManager');

      const found = manager.findWindowsByComponent('FileManager');
      expect(found).toHaveLength(2);
      expect(found.every((w) => w.component === 'FileManager')).toBe(true);
    });

    it('should return empty array if not found', () => {
      const manager = useWindowManager();
      expect(manager.findWindowsByComponent('NonExistent')).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should clear all windows', () => {
      const manager = useWindowManager();
      manager.createCardWindow('card-1');
      manager.createToolWindow('Tool1');

      manager.reset();

      expect(manager.getAllWindows()).toHaveLength(0);
    });
  });
});
