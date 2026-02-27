/**
 * 主题切换端到端测试
 * @module tests/e2e/theme-switch
 * @description 测试主题切换的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';
import { useUIStore, useEditorStore } from '@/core/state';

describe('E2E: 主题切换流程', () => {
  let editor: ChipsEditor;
  let uiStore: ReturnType<typeof useUIStore>;
  let editorStore: ReturnType<typeof useEditorStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    uiStore = useUIStore();
    editorStore = useEditorStore();
    editor = createEditor({
      layout: 'infinite-canvas',
      debug: false,
      autoSaveInterval: 0,
    });
    await editor.initialize();
  });

  afterEach(() => {
    if (editor && editor.state !== 'destroyed') {
      editor.destroy();
    }
  });

  describe('场景1: 基本主题切换', () => {
    it('应有默认主题', () => {
      expect(uiStore.theme).toBeDefined();
      expect(uiStore.theme).toBe('default-light');
    });

    it('应切换到深色主题', () => {
      uiStore.setTheme('default-dark');

      expect(uiStore.theme).toBe('default-dark');
      expect(uiStore.isDarkTheme).toBe(true);
    });

    it('应切换回浅色主题', () => {
      uiStore.setTheme('default-dark');
      uiStore.setTheme('default-light');

      expect(uiStore.theme).toBe('default-light');
      expect(uiStore.isDarkTheme).toBe(false);
    });

    it('应切换到自定义主题', () => {
      uiStore.setTheme('custom-blue');

      expect(uiStore.theme).toBe('custom-blue');
    });
  });

  describe('场景2: 主题与 UI 状态', () => {
    it('应在主题切换时保持窗口状态', () => {
      // 创建窗口
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: '测试窗口',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });

      expect(uiStore.windowCount).toBe(1);

      // 切换主题
      uiStore.setTheme('default-dark');

      // 窗口应该仍然存在
      expect(uiStore.windowCount).toBe(1);
      const window = uiStore.getWindow('win1');
      expect(window).toBeDefined();
      expect(window?.position).toEqual({ x: 100, y: 100 });
    });

    it('应在主题切换时保持画布状态', () => {
      // 设置画布状态
      uiStore.setZoom(1.5);
      uiStore.setCanvasPosition(200, 300);

      // 切换主题
      uiStore.setTheme('default-dark');

      // 画布状态应该保持
      expect(uiStore.canvas.zoom).toBe(1.5);
      expect(uiStore.canvas.panX).toBe(200);
      expect(uiStore.canvas.panY).toBe(300);
    });

    it('应在主题切换时保持侧边栏状态', () => {
      // 设置侧边栏状态
      uiStore.setSidebarExpanded(false);
      uiStore.setSidebarWidth(320);

      // 切换主题
      uiStore.setTheme('default-dark');

      // 侧边栏状态应该保持
      expect(uiStore.sidebarExpanded).toBe(false);
      expect(uiStore.sidebarWidth).toBe(320);
    });
  });

  describe('场景3: 主题检测辅助方法', () => {
    it('应正确检测深色主题', () => {
      uiStore.setTheme('default-dark');
      expect(uiStore.isDarkTheme).toBe(true);

      uiStore.setTheme('custom-dark');
      expect(uiStore.isDarkTheme).toBe(true);

      uiStore.setTheme('night-dark');
      expect(uiStore.isDarkTheme).toBe(true);
    });

    it('应正确检测浅色主题', () => {
      uiStore.setTheme('default-light');
      expect(uiStore.isDarkTheme).toBe(false);

      uiStore.setTheme('custom-light');
      expect(uiStore.isDarkTheme).toBe(false);

      uiStore.setTheme('ocean-blue');
      expect(uiStore.isDarkTheme).toBe(false);
    });
  });

  describe('场景4: 网格设置', () => {
    it('应切换网格显示', () => {
      expect(uiStore.showGrid).toBe(true);

      uiStore.toggleGrid();
      expect(uiStore.showGrid).toBe(false);

      uiStore.toggleGrid();
      expect(uiStore.showGrid).toBe(true);
    });

    it('应设置网格显示状态', () => {
      uiStore.setShowGrid(false);
      expect(uiStore.showGrid).toBe(false);

      uiStore.setShowGrid(true);
      expect(uiStore.showGrid).toBe(true);
    });

    it('应切换网格吸附', () => {
      expect(uiStore.snapToGrid).toBe(true);

      uiStore.toggleSnapToGrid();
      expect(uiStore.snapToGrid).toBe(false);

      uiStore.toggleSnapToGrid();
      expect(uiStore.snapToGrid).toBe(true);
    });

    it('应设置网格大小', () => {
      uiStore.setGridSize(30);
      expect(uiStore.gridSize).toBe(30);

      // 测试边界值
      uiStore.setGridSize(5); // 小于最小值
      expect(uiStore.gridSize).toBe(10); // 应该被限制到最小值

      uiStore.setGridSize(150); // 大于最大值
      expect(uiStore.gridSize).toBe(100); // 应该被限制到最大值
    });
  });

  describe('场景5: 程序坞设置', () => {
    it('应设置程序坞位置', () => {
      expect(uiStore.dockPosition).toBe('bottom');

      uiStore.setDockPosition('left');
      expect(uiStore.dockPosition).toBe('left');

      uiStore.setDockPosition('right');
      expect(uiStore.dockPosition).toBe('right');

      uiStore.setDockPosition('bottom');
      expect(uiStore.dockPosition).toBe('bottom');
    });

    it('应切换程序坞可见性', () => {
      expect(uiStore.dockVisible).toBe(true);

      uiStore.toggleDockVisible();
      expect(uiStore.dockVisible).toBe(false);

      uiStore.toggleDockVisible();
      expect(uiStore.dockVisible).toBe(true);
    });

    it('应设置程序坞可见性', () => {
      uiStore.setDockVisible(false);
      expect(uiStore.dockVisible).toBe(false);

      uiStore.setDockVisible(true);
      expect(uiStore.dockVisible).toBe(true);
    });
  });

  describe('场景6: 全屏模式', () => {
    it('应切换全屏模式', () => {
      expect(uiStore.isFullscreen).toBe(false);

      uiStore.toggleFullscreen();
      expect(uiStore.isFullscreen).toBe(true);

      uiStore.toggleFullscreen();
      expect(uiStore.isFullscreen).toBe(false);
    });

    it('应设置全屏模式', () => {
      uiStore.setFullscreen(true);
      expect(uiStore.isFullscreen).toBe(true);

      uiStore.setFullscreen(false);
      expect(uiStore.isFullscreen).toBe(false);
    });
  });

  describe('场景7: UI 状态重置', () => {
    it('应重置所有 UI 状态', () => {
      // 修改各种状态
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: '测试窗口',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });
      uiStore.setZoom(2);
      uiStore.setCanvasPosition(100, 200);
      uiStore.setSidebarExpanded(false);
      uiStore.setFullscreen(true);

      // 重置
      uiStore.reset();

      // 验证状态已重置
      expect(uiStore.windowCount).toBe(0);
      expect(uiStore.canvas.zoom).toBe(1);
      expect(uiStore.canvas.panX).toBe(0);
      expect(uiStore.canvas.panY).toBe(0);
      expect(uiStore.sidebarExpanded).toBe(true);
      expect(uiStore.isFullscreen).toBe(false);
    });
  });
});
