/**
 * 拖放操作集成测试
 * @module tests/integration/drag-drop
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  DragDropManager,
  useDragDropManager,
  resetDragDropManager,
  detectFileType,
  detectFileTypes,
  useFileDrop,
  useCardSort,
  useCardNest,
} from '@/core/drag-drop-manager';

describe('拖放操作', () => {
  let manager: DragDropManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    resetDragDropManager();
    manager = useDragDropManager();
  });

  afterEach(() => {
    resetDragDropManager();
  });

  describe('拖放管理器基础操作', () => {
    describe('注册/注销', () => {
      it('应注册拖放源', () => {
        manager.registerSource('source1', {
          type: 'card-library',
          data: { cardType: 'text' },
        });

        const source = manager.getSource('source1');
        expect(source).toBeDefined();
        expect(source?.type).toBe('card-library');
      });

      it('应注销拖放源', () => {
        manager.registerSource('source1', {
          type: 'card-library',
          data: {},
        });

        manager.unregisterSource('source1');

        expect(manager.getSource('source1')).toBeUndefined();
      });

      it('应注册拖放目标', () => {
        manager.registerTarget('target1', {
          type: 'canvas',
          id: 'target1',
        });

        const target = manager.getTarget('target1');
        expect(target).toBeDefined();
        expect(target?.type).toBe('canvas');
      });

      it('应注销拖放目标', () => {
        manager.registerTarget('target1', {
          type: 'canvas',
          id: 'target1',
        });

        manager.unregisterTarget('target1');

        expect(manager.getTarget('target1')).toBeUndefined();
      });
    });

    describe('拖放状态', () => {
      it('应开始拖放', () => {
        const source = manager.startDrag({
          type: 'card-library',
          data: { cardType: 'text' },
        });

        expect(manager.state.value.isDragging).toBe(true);
        expect(manager.state.value.source).toBeDefined();
        expect(manager.state.value.source?.id).toBe(source.id);
      });

      it('应更新拖放位置', () => {
        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.updatePosition({ x: 100, y: 200 });

        expect(manager.state.value.position).toEqual({ x: 100, y: 200 });
      });

      it('应结束拖放', () => {
        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.endDrag(true);

        expect(manager.state.value.isDragging).toBe(false);
        expect(manager.state.value.source).toBeNull();
      });

      it('应取消拖放', () => {
        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.cancelDrag();

        expect(manager.state.value.isDragging).toBe(false);
      });
    });

    describe('悬停目标', () => {
      it('应设置悬停目标', () => {
        manager.registerTarget('canvas', {
          type: 'canvas',
          id: 'canvas',
        });

        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.setHoverTarget('canvas');

        expect(manager.state.value.hoverTarget).toBeDefined();
        expect(manager.state.value.hoverTarget?.id).toBe('canvas');
      });

      it('应清除悬停目标', () => {
        manager.registerTarget('canvas', {
          type: 'canvas',
          id: 'canvas',
        });

        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.setHoverTarget('canvas');
        manager.setHoverTarget(null);

        expect(manager.state.value.hoverTarget).toBeNull();
      });
    });

    describe('放置检测', () => {
      it('应检测是否可以放置', () => {
        const source = manager.startDrag({
          type: 'card-library',
          data: {},
          allowedTargets: ['canvas'],
        });

        const canDrop = manager.checkCanDrop(source, {
          id: 'canvas',
          type: 'canvas',
          config: {
            type: 'canvas',
            id: 'canvas',
            acceptedSources: ['card-library'],
          },
        });

        expect(canDrop).toBe(true);
      });

      it('应拒绝不接受的源类型', () => {
        const source = manager.startDrag({
          type: 'file',
          data: {},
        });

        const canDrop = manager.checkCanDrop(source, {
          id: 'canvas',
          type: 'canvas',
          config: {
            type: 'canvas',
            id: 'canvas',
            acceptedSources: ['card-library'],
          },
        });

        expect(canDrop).toBe(false);
      });
    });

    describe('放置操作', () => {
      it('应执行放置', async () => {
        const dropHandler = vi.fn();

        manager.registerTarget('canvas', {
          type: 'canvas',
          id: 'canvas',
          acceptedSources: ['card-library'],
          onDrop: dropHandler,
        });

        manager.startDrag({
          type: 'card-library',
          data: { cardType: 'text' },
        });

        manager.updatePosition({ x: 100, y: 100 });
        manager.setHoverTarget('canvas');

        const result = await manager.drop();

        expect(result).toBe(true);
        expect(dropHandler).toHaveBeenCalled();
      });

      it('应在无效目标时取消放置', async () => {
        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        const result = await manager.drop();

        expect(result).toBe(false);
      });
    });

    describe('回调触发', () => {
      it('应触发开始拖放回调', () => {
        const onDragStart = vi.fn();

        manager.startDrag({
          type: 'card-library',
          data: {},
          onDragStart,
        });

        expect(onDragStart).toHaveBeenCalled();
      });

      it('应触发结束拖放回调', () => {
        const onDragEnd = vi.fn();

        manager.startDrag({
          type: 'card-library',
          data: {},
          onDragEnd,
        });

        manager.endDrag(true);

        expect(onDragEnd).toHaveBeenCalledWith(true);
      });

      it('应触发进入目标回调', () => {
        const onDragEnter = vi.fn();

        manager.registerTarget('canvas', {
          type: 'canvas',
          id: 'canvas',
          onDragEnter,
        });

        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.setHoverTarget('canvas');

        expect(onDragEnter).toHaveBeenCalled();
      });

      it('应触发离开目标回调', () => {
        const onDragLeave = vi.fn();

        manager.registerTarget('canvas', {
          type: 'canvas',
          id: 'canvas',
          onDragLeave,
        });

        manager.startDrag({
          type: 'card-library',
          data: {},
        });

        manager.setHoverTarget('canvas');
        manager.setHoverTarget(null);

        expect(onDragLeave).toHaveBeenCalled();
      });
    });
  });

  describe('文件类型检测', () => {
    it('应检测图片文件', () => {
      const file = new File([], 'test.jpg', { type: 'image/jpeg' });
      expect(detectFileType(file)).toBe('image');
    });

    it('应检测视频文件', () => {
      const file = new File([], 'test.mp4', { type: 'video/mp4' });
      expect(detectFileType(file)).toBe('video');
    });

    it('应检测音频文件', () => {
      const file = new File([], 'test.mp3', { type: 'audio/mpeg' });
      expect(detectFileType(file)).toBe('audio');
    });

    it('应检测卡片文件', () => {
      const file = new File([], 'test.chip', { type: '' });
      expect(detectFileType(file)).toBe('card-file');
    });

    it('应检测箱子文件', () => {
      const file = new File([], 'test.box', { type: '' });
      expect(detectFileType(file)).toBe('box-file');
    });

    it('应检测文档文件', () => {
      const file = new File([], 'test.pdf', { type: 'application/pdf' });
      expect(detectFileType(file)).toBe('document');
    });

    it('应检测未知文件', () => {
      const file = new File([], 'test.xyz', { type: '' });
      expect(detectFileType(file)).toBe('unknown');
    });

    it('应批量检测文件类型', () => {
      const files = [
        new File([], 'image.jpg', { type: 'image/jpeg' }),
        new File([], 'video.mp4', { type: 'video/mp4' }),
        new File([], 'unknown.xyz', { type: '' }),
      ];

      const types = detectFileTypes(files);

      expect(types).toEqual(['image', 'video', 'unknown']);
    });
  });

  describe('文件拖入 Hook', () => {
    it('应创建文件拖入 Hook', () => {
      const hook = useFileDrop();

      expect(hook.isFileDragOver.value).toBe(false);
      expect(hook.draggedFiles.value).toBeNull();
      expect(typeof hook.handleDragEnter).toBe('function');
      expect(typeof hook.handleDragOver).toBe('function');
      expect(typeof hook.handleDragLeave).toBe('function');
      expect(typeof hook.handleDrop).toBe('function');
    });
  });

  describe('卡片排序 Hook', () => {
    it('应创建卡片排序 Hook', () => {
      const hook = useCardSort();

      expect(hook.isSorting.value).toBe(false);
      expect(hook.draggedCard.value).toBeNull();
      expect(hook.insertIndex.value).toBe(-1);
    });

    it('应开始排序', () => {
      const hook = useCardSort();

      hook.startSort({
        cardId: 'card-1',
        baseCardId: 'base-1',
        baseCardType: 'text',
        originalIndex: 2,
      });

      expect(hook.isSorting.value).toBe(true);
      expect(hook.draggedCard.value?.baseCardId).toBe('base-1');
      expect(hook.insertIndex.value).toBe(2);
    });

    it('应更新插入位置', () => {
      const hook = useCardSort();

      hook.startSort({
        cardId: 'card-1',
        baseCardId: 'base-1',
        baseCardType: 'text',
        originalIndex: 0,
      });

      hook.updateInsertIndex(3);

      expect(hook.insertIndex.value).toBe(3);
    });

    it('应结束排序并返回结果', () => {
      const hook = useCardSort();

      hook.startSort({
        cardId: 'card-1',
        baseCardId: 'base-1',
        baseCardType: 'text',
        originalIndex: 0,
      });

      hook.updateInsertIndex(2);
      const result = hook.endSort();

      expect(result).toEqual({ from: 0, to: 2 });
      expect(hook.isSorting.value).toBe(false);
    });

    it('应在位置未变时返回 null', () => {
      const hook = useCardSort();

      hook.startSort({
        cardId: 'card-1',
        baseCardId: 'base-1',
        baseCardType: 'text',
        originalIndex: 2,
      });

      // 不更新位置
      const result = hook.endSort();

      expect(result).toBeNull();
    });

    it('应取消排序', () => {
      const hook = useCardSort();

      hook.startSort({
        cardId: 'card-1',
        baseCardId: 'base-1',
        baseCardType: 'text',
        originalIndex: 0,
      });

      hook.cancelSort();

      expect(hook.isSorting.value).toBe(false);
      expect(hook.draggedCard.value).toBeNull();
    });
  });

  describe('卡片嵌套 Hook', () => {
    it('应创建卡片嵌套 Hook', () => {
      const hook = useCardNest();

      expect(hook.isNesting.value).toBe(false);
      expect(hook.draggedCard.value).toBeNull();
      expect(hook.targetCardId.value).toBeNull();
      expect(hook.canNest.value).toBe(false);
    });

    it('应开始嵌套', () => {
      const hook = useCardNest();

      hook.startNest({
        cardId: 'card-1',
        cardName: '测试卡片',
      });

      expect(hook.isNesting.value).toBe(true);
      expect(hook.draggedCard.value?.cardId).toBe('card-1');
    });

    it('应设置目标卡片', () => {
      const hook = useCardNest();

      hook.startNest({
        cardId: 'card-1',
        cardName: '测试卡片',
      });

      hook.setTarget('card-2', true);

      expect(hook.targetCardId.value).toBe('card-2');
      expect(hook.canNest.value).toBe(true);
    });

    it('应阻止嵌套到自身', () => {
      const hook = useCardNest();

      hook.startNest({
        cardId: 'card-1',
        cardName: '测试卡片',
      });

      hook.setTarget('card-1', true);

      expect(hook.canNest.value).toBe(false);
    });

    it('应结束嵌套并返回结果', () => {
      const hook = useCardNest();

      hook.startNest({
        cardId: 'card-1',
        cardName: '测试卡片',
      });

      hook.setTarget('card-2', true);
      const result = hook.endNest();

      expect(result).toEqual({ sourceId: 'card-1', targetId: 'card-2' });
      expect(hook.isNesting.value).toBe(false);
    });

    it('应取消嵌套', () => {
      const hook = useCardNest();

      hook.startNest({
        cardId: 'card-1',
        cardName: '测试卡片',
      });

      hook.cancelNest();

      expect(hook.isNesting.value).toBe(false);
      expect(hook.draggedCard.value).toBeNull();
    });
  });

  describe('辅助方法', () => {
    /**
     * 创建模拟的 DOMRect 对象
     * 因为在测试环境中 DOMRect 的 getter 可能不工作
     */
    function createRect(x: number, y: number, width: number, height: number): DOMRect {
      return {
        x,
        y,
        width,
        height,
        top: y,
        left: x,
        right: x + width,
        bottom: y + height,
        toJSON: () => ({ x, y, width, height }),
      } as DOMRect;
    }

    describe('插入位置计算', () => {
      it('应计算垂直方向插入索引', () => {
        const items = [
          { rect: createRect(0, 0, 100, 50), id: '1' },
          { rect: createRect(0, 50, 100, 50), id: '2' },
          { rect: createRect(0, 100, 100, 50), id: '3' },
        ];

        // 在第一个元素上方（y=10，第一个元素中点是 y=25）
        expect(manager.calculateInsertIndex(items, { x: 50, y: 10 }, 'vertical')).toBe(0);

        // 在第二个元素中间（y=60，第二个元素中点是 y=75）
        expect(manager.calculateInsertIndex(items, { x: 50, y: 60 }, 'vertical')).toBe(1);

        // 在最后一个元素下方
        expect(manager.calculateInsertIndex(items, { x: 50, y: 150 }, 'vertical')).toBe(3);
      });

      it('应计算水平方向插入索引', () => {
        const items = [
          { rect: createRect(0, 0, 50, 100), id: '1' },
          { rect: createRect(50, 0, 50, 100), id: '2' },
          { rect: createRect(100, 0, 50, 100), id: '3' },
        ];

        // x=10，第一个元素中点是 x=25
        expect(manager.calculateInsertIndex(items, { x: 10, y: 50 }, 'horizontal')).toBe(0);
        // x=60，第二个元素中点是 x=75
        expect(manager.calculateInsertIndex(items, { x: 60, y: 50 }, 'horizontal')).toBe(1);
        // 在最后一个元素右侧
        expect(manager.calculateInsertIndex(items, { x: 160, y: 50 }, 'horizontal')).toBe(3);
      });
    });

    describe('点位检测', () => {
      it('应检测点是否在矩形内', () => {
        const rect = createRect(0, 0, 100, 100);

        expect(manager.isPointInRect({ x: 50, y: 50 }, rect)).toBe(true);
        expect(manager.isPointInRect({ x: 0, y: 0 }, rect)).toBe(true);
        expect(manager.isPointInRect({ x: 100, y: 100 }, rect)).toBe(true);
        expect(manager.isPointInRect({ x: 150, y: 50 }, rect)).toBe(false);
      });

      it('应查找包含点的目标', () => {
        const targetRects = new Map([
          ['target1', createRect(0, 0, 100, 100)],
          ['target2', createRect(100, 0, 100, 100)],
        ]);

        expect(manager.findTargetAtPoint({ x: 50, y: 50 }, targetRects)).toBe('target1');
        expect(manager.findTargetAtPoint({ x: 150, y: 50 }, targetRects)).toBe('target2');
        expect(manager.findTargetAtPoint({ x: 250, y: 50 }, targetRects)).toBeNull();
      });
    });
  });

  describe('重置管理器', () => {
    it('应重置管理器状态', () => {
      manager.registerSource('source1', { type: 'card-library', data: {} });
      manager.registerTarget('target1', { type: 'canvas', id: 'target1' });
      manager.startDrag({ type: 'card-library', data: {} });

      manager.reset();

      expect(manager.state.value.isDragging).toBe(false);
      expect(manager.getSource('source1')).toBeUndefined();
      expect(manager.getTarget('target1')).toBeUndefined();
    });
  });
});
