/**
 * 布局切换集成测试
 * @module tests/integration/layout-switch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';
import { useEditorStore, useUIStore } from '@/core/state';

describe('布局切换', () => {
  let editor: ChipsEditor;
  let editorStore: ReturnType<typeof useEditorStore>;
  let uiStore: ReturnType<typeof useUIStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    editorStore = useEditorStore();
    uiStore = useUIStore();
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

  describe('布局状态管理', () => {
    it('应初始化为无限画布布局', () => {
      expect(editor.getLayout()).toBe('infinite-canvas');
      expect(editorStore.currentLayout).toBe('infinite-canvas');
    });

    it('应切换到工作台布局', () => {
      editor.setLayout('workbench');

      expect(editor.getLayout()).toBe('workbench');
      expect(editorStore.currentLayout).toBe('workbench');
    });

    it('应切换回无限画布布局', () => {
      editor.setLayout('workbench');
      editor.setLayout('infinite-canvas');

      expect(editor.getLayout()).toBe('infinite-canvas');
    });
  });

  describe('布局切换事件', () => {
    it('应在切换布局时发出事件', () => {
      const eventHandler = vi.fn();
      editor.on('layout:changed', eventHandler);

      editor.setLayout('workbench');

      expect(eventHandler).toHaveBeenCalledWith({ layout: 'workbench' });
    });

    it('应在多次切换时发出多次事件', () => {
      const eventHandler = vi.fn();
      editor.on('layout:changed', eventHandler);

      editor.setLayout('workbench');
      editor.setLayout('infinite-canvas');
      editor.setLayout('workbench');

      expect(eventHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('布局切换时的窗口状态', () => {
    it('应在布局切换时保留窗口', () => {
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

      // 切换布局
      editor.setLayout('workbench');

      // 窗口应该仍然存在
      expect(uiStore.windowCount).toBe(1);
    });

    it('应在布局切换后保留窗口焦点', () => {
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: '测试窗口',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });

      editor.focusWindow('win1');
      expect(uiStore.focusedWindowId).toBe('win1');

      editor.setLayout('workbench');

      expect(uiStore.focusedWindowId).toBe('win1');
    });
  });

  describe('布局特定设置', () => {
    it('应在无限画布布局中保留画布状态', () => {
      uiStore.setZoom(1.5);
      uiStore.setCanvasPosition(100, 200);

      editor.setLayout('workbench');
      editor.setLayout('infinite-canvas');

      // 画布状态应该保留
      expect(uiStore.canvas.zoom).toBe(1.5);
      expect(uiStore.canvas.panX).toBe(100);
      expect(uiStore.canvas.panY).toBe(200);
    });

    it('应在工作台布局中保留侧边栏状态', () => {
      uiStore.setSidebarExpanded(false);
      uiStore.setSidebarWidth(320);

      editor.setLayout('workbench');

      expect(uiStore.sidebarExpanded).toBe(false);
      expect(uiStore.sidebarWidth).toBe(320);
    });
  });

  describe('并发布局切换', () => {
    it('应正确处理连续快速切换', () => {
      editor.setLayout('workbench');
      editor.setLayout('infinite-canvas');
      editor.setLayout('workbench');
      editor.setLayout('infinite-canvas');

      expect(editor.getLayout()).toBe('infinite-canvas');
    });
  });

  describe('UI Store 布局方法', () => {
    it('应通过 UI Store 设置布局', () => {
      editorStore.setLayout('workbench');

      expect(editorStore.currentLayout).toBe('workbench');
    });

    it('应正确报告是否为无限画布布局', () => {
      expect(editorStore.currentLayout).toBe('infinite-canvas');

      editorStore.setLayout('workbench');
      expect(editorStore.currentLayout).toBe('workbench');
    });
  });
});
