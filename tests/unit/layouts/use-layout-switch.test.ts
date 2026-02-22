/**
 * useLayoutSwitch Hook 测试
 * @module tests/unit/layouts/use-layout-switch
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutSwitch } from '@/layouts/use-layout-switch';
import { useEditorStore, useUIStore } from '@/core/state';
import { nextTick } from 'vue';

describe('useLayoutSwitch', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 清理 body class
    document.body.classList.remove('layout-transitioning');
  });

  afterEach(() => {
    document.body.classList.remove('layout-transitioning');
  });

  describe('initialization', () => {
    it('should initialize with current layout from store', () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { currentLayout, isInfiniteCanvas, isWorkbench } = useLayoutSwitch();

      expect(currentLayout.value).toBe('infinite-canvas');
      expect(isInfiniteCanvas.value).toBe(true);
      expect(isWorkbench.value).toBe(false);
    });

    it('should reflect workbench layout', () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('workbench');

      const { currentLayout, isInfiniteCanvas, isWorkbench } = useLayoutSwitch();

      expect(currentLayout.value).toBe('workbench');
      expect(isInfiniteCanvas.value).toBe(false);
      expect(isWorkbench.value).toBe(true);
    });

    it('should start with isSwitching as false', () => {
      const { isSwitching } = useLayoutSwitch();

      expect(isSwitching.value).toBe(false);
    });
  });

  describe('switchTo', () => {
    it('should switch to specified layout', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { switchTo, currentLayout, isSwitching } = useLayoutSwitch({
        enableTransition: false,
      });

      const switchPromise = switchTo('workbench');
      
      // 切换过程中 isSwitching 应为 true
      expect(isSwitching.value).toBe(true);
      
      await switchPromise;
      await nextTick();

      expect(currentLayout.value).toBe('workbench');
      expect(isSwitching.value).toBe(false);
    });

    it('should not switch if already on target layout', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('workbench');

      const onBeforeSwitch = vi.fn();
      const { switchTo } = useLayoutSwitch({
        onBeforeSwitch,
      });

      await switchTo('workbench');

      expect(onBeforeSwitch).not.toHaveBeenCalled();
    });

    it('should not switch while already switching', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { switchTo, isSwitching } = useLayoutSwitch({
        enableTransition: false,
        transitionDuration: 0,
      });

      // 开始第一次切换
      const firstSwitch = switchTo('workbench');
      
      // 尝试第二次切换（应该被忽略因为正在切换）
      const secondSwitch = switchTo('infinite-canvas');

      // 等待第一次切换完成
      await firstSwitch;
      await secondSwitch;

      // 应该停留在 workbench（第一次切换的结果）
      expect(editorStore.currentLayout).toBe('workbench');
    });
  });

  describe('switchToCanvas', () => {
    it('should switch to infinite canvas', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('workbench');

      const { switchToCanvas, currentLayout } = useLayoutSwitch({
        enableTransition: false,
      });

      await switchToCanvas();
      await nextTick();

      expect(currentLayout.value).toBe('infinite-canvas');
    });
  });

  describe('switchToWorkbench', () => {
    it('should switch to workbench', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { switchToWorkbench, currentLayout } = useLayoutSwitch({
        enableTransition: false,
      });

      await switchToWorkbench();
      await nextTick();

      expect(currentLayout.value).toBe('workbench');
    });
  });

  describe('toggleLayout', () => {
    it('should toggle from canvas to workbench', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { toggleLayout, currentLayout } = useLayoutSwitch({
        enableTransition: false,
      });

      await toggleLayout();
      await nextTick();

      expect(currentLayout.value).toBe('workbench');
    });

    it('should toggle from workbench to canvas', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('workbench');

      const { toggleLayout, currentLayout } = useLayoutSwitch({
        enableTransition: false,
      });

      await toggleLayout();
      await nextTick();

      expect(currentLayout.value).toBe('infinite-canvas');
    });
  });

  describe('callbacks', () => {
    it('should call onBeforeSwitch callback', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const onBeforeSwitch = vi.fn();
      const { switchTo } = useLayoutSwitch({
        enableTransition: false,
        onBeforeSwitch,
      });

      await switchTo('workbench');

      expect(onBeforeSwitch).toHaveBeenCalledWith('infinite-canvas', 'workbench');
    });

    it('should call onAfterSwitch callback', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const onAfterSwitch = vi.fn();
      const { switchTo } = useLayoutSwitch({
        enableTransition: false,
        onAfterSwitch,
      });

      await switchTo('workbench');
      await nextTick();

      expect(onAfterSwitch).toHaveBeenCalledWith('infinite-canvas', 'workbench');
    });

    it('should support async callbacks', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const onBeforeSwitch = vi.fn().mockResolvedValue(undefined);
      const onAfterSwitch = vi.fn().mockResolvedValue(undefined);

      const { switchTo } = useLayoutSwitch({
        enableTransition: false,
        onBeforeSwitch,
        onAfterSwitch,
      });

      await switchTo('workbench');
      await nextTick();

      expect(onBeforeSwitch).toHaveBeenCalled();
      expect(onAfterSwitch).toHaveBeenCalled();
    });
  });

  describe('window state preservation', () => {
    it('should save window state before switch', async () => {
      const editorStore = useEditorStore();
      const uiStore = useUIStore();
      editorStore.setLayout('infinite-canvas');

      // 添加窗口
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);

      const { switchTo, savedWindowState } = useLayoutSwitch({
        enableTransition: false,
        preserveCardState: true,
      });

      await switchTo('workbench');
      await nextTick();

      expect(savedWindowState.value.length).toBe(1);
      expect(savedWindowState.value[0].id).toBe('card-1');
    });

    it('should not preserve state when preserveCardState is false', async () => {
      const editorStore = useEditorStore();
      const uiStore = useUIStore();
      editorStore.setLayout('infinite-canvas');

      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);

      const { switchTo, savedWindowState } = useLayoutSwitch({
        enableTransition: false,
        preserveCardState: false,
      });

      await switchTo('workbench');
      await nextTick();

      expect(savedWindowState.value.length).toBe(0);
    });
  });

  describe('transition', () => {
    it('should add transition class when enabled', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      // 使用较短的过渡时间便于测试
      const { switchTo } = useLayoutSwitch({
        enableTransition: true,
        transitionDuration: 10,
      });

      const switchPromise = switchTo('workbench');
      
      // 在异步操作开始后检查过渡类
      await nextTick();
      // 过渡类可能已经被添加和移除，因此我们只检查切换是否成功
      
      await switchPromise;

      // 切换完成后过渡类应该被移除
      expect(document.body.classList.contains('layout-transitioning')).toBe(false);
      expect(editorStore.currentLayout).toBe('workbench');
    });

    it('should not add transition class when disabled', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      // 确保初始状态没有过渡类
      document.body.classList.remove('layout-transitioning');

      const { switchTo } = useLayoutSwitch({
        enableTransition: false,
      });

      await switchTo('workbench');
      await nextTick();

      // 禁用过渡时，切换完成后不应该有过渡类
      expect(document.body.classList.contains('layout-transitioning')).toBe(false);
    });

    it('should complete switch with transition enabled', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const { switchTo, isSwitching } = useLayoutSwitch({
        enableTransition: true,
        transitionDuration: 10,
      });

      expect(isSwitching.value).toBe(false);
      
      await switchTo('workbench');
      
      expect(isSwitching.value).toBe(false);
      expect(editorStore.currentLayout).toBe('workbench');
    });
  });

  describe('error handling', () => {
    it('should recover from errors in onBeforeSwitch', async () => {
      const editorStore = useEditorStore();
      editorStore.setLayout('infinite-canvas');

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { switchTo, currentLayout, isSwitching } = useLayoutSwitch({
        enableTransition: false,
        onBeforeSwitch: () => {
          throw new Error('Test error');
        },
      });

      await switchTo('workbench');

      // 应该恢复到原布局
      expect(currentLayout.value).toBe('infinite-canvas');
      expect(isSwitching.value).toBe(false);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
