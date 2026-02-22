/**
 * 拖放管理器测试
 * @module tests/unit/core/drag-drop-manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DragDropManager,
  useDragDropManager,
  resetDragDropManager,
  useFileDrop,
  useCardSort,
  useCardNest,
  detectFileType,
  detectFileTypes,
  type DragSourceConfig,
  type DropTargetConfig,
  type DragSource,
  type Position,
} from '@/core/drag-drop-manager';

describe('DragDropManager', () => {
  let manager: DragDropManager;

  beforeEach(() => {
    manager = new DragDropManager();
  });

  describe('source registration', () => {
    it('should register a drag source', () => {
      const config: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
      };

      manager.registerSource('source-1', config);

      expect(manager.getSource('source-1')).toBe(config);
    });

    it('should unregister a drag source', () => {
      const config: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
      };

      manager.registerSource('source-1', config);
      manager.unregisterSource('source-1');

      expect(manager.getSource('source-1')).toBeUndefined();
    });
  });

  describe('target registration', () => {
    it('should register a drop target', () => {
      const config: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
      };

      manager.registerTarget('target-1', config);

      expect(manager.getTarget('target-1')).toBe(config);
    });

    it('should unregister a drop target', () => {
      const config: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
      };

      manager.registerTarget('target-1', config);
      manager.unregisterTarget('target-1');

      expect(manager.getTarget('target-1')).toBeUndefined();
    });
  });

  describe('drag operations', () => {
    it('should start drag', () => {
      const config: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
      };

      const source = manager.startDrag(config);

      expect(manager.state.value.isDragging).toBe(true);
      expect(manager.state.value.source?.id).toBe(source.id);
      expect(source.type).toBe('file');
    });

    it('should call onDragStart callback', () => {
      const onDragStart = vi.fn();
      const config: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
        onDragStart,
      };

      manager.startDrag(config);

      expect(onDragStart).toHaveBeenCalled();
    });

    it('should throw if canDrag returns false', () => {
      const config: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
        canDrag: () => false,
      };

      expect(() => manager.startDrag(config)).toThrow('Cannot drag this source');
    });

    it('should update position', () => {
      const config: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      manager.startDrag(config);
      manager.updatePosition({ x: 100, y: 200 });

      expect(manager.state.value.position).toEqual({ x: 100, y: 200 });
    });

    it('should not update position when not dragging', () => {
      manager.updatePosition({ x: 100, y: 200 });

      expect(manager.state.value.position).toBeNull();
    });

    it('should end drag', () => {
      const onDragEnd = vi.fn();
      const config: DragSourceConfig = {
        type: 'file',
        data: {},
        onDragEnd,
      };

      manager.startDrag(config);
      manager.endDrag(true);

      expect(manager.state.value.isDragging).toBe(false);
      expect(manager.state.value.source).toBeNull();
      expect(onDragEnd).toHaveBeenCalledWith(true);
    });

    it('should cancel drag', () => {
      const onDragEnd = vi.fn();
      const config: DragSourceConfig = {
        type: 'file',
        data: {},
        onDragEnd,
      };

      manager.startDrag(config);
      manager.cancelDrag();

      expect(manager.state.value.isDragging).toBe(false);
      expect(onDragEnd).toHaveBeenCalledWith(false);
    });
  });

  describe('hover target', () => {
    it('should set hover target', () => {
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
      };

      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');

      expect(manager.state.value.hoverTarget?.id).toBe('target-1');
    });

    it('should call onDragEnter callback', () => {
      const onDragEnter = vi.fn();
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        onDragEnter,
      };

      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');

      expect(onDragEnter).toHaveBeenCalled();
    });

    it('should call onDragLeave when changing target', () => {
      const onDragLeave = vi.fn();
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig1: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        onDragLeave,
      };

      const targetConfig2: DropTargetConfig = {
        type: 'card',
        id: 'target-2',
      };

      manager.registerTarget('target-1', targetConfig1);
      manager.registerTarget('target-2', targetConfig2);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');
      manager.setHoverTarget('target-2');

      expect(onDragLeave).toHaveBeenCalled();
    });

    it('should clear hover target', () => {
      const onDragLeave = vi.fn();
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        onDragLeave,
      };

      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');
      manager.setHoverTarget(null);

      expect(manager.state.value.hoverTarget).toBeNull();
      expect(onDragLeave).toHaveBeenCalled();
    });
  });

  describe('drop', () => {
    it('should execute drop', async () => {
      const onDrop = vi.fn();
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: { files: [] },
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        onDrop,
      };

      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');
      manager.updatePosition({ x: 100, y: 200 });

      const result = await manager.drop();

      expect(result).toBe(true);
      expect(onDrop).toHaveBeenCalled();
      expect(manager.state.value.isDragging).toBe(false);
    });

    it('should fail drop when canDrop is false', async () => {
      const onDrop = vi.fn();
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        onDrop,
        canDrop: () => false,
      };

      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);
      manager.setHoverTarget('target-1');

      // canDrop 返回 false，所以 canDrop 状态也是 false
      expect(manager.state.value.canDrop).toBe(false);
    });
  });

  describe('checkCanDrop', () => {
    it('should return true when source and target are compatible', () => {
      const source: DragSource = {
        id: 'source-1',
        type: 'file',
        data: {},
        config: { type: 'file', data: {} },
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        acceptedSources: ['file', 'card-library'],
      };

      manager.registerTarget('target-1', targetConfig);

      const target = {
        id: 'target-1',
        type: 'canvas' as const,
        config: targetConfig,
      };

      expect(manager.checkCanDrop(source, target)).toBe(true);
    });

    it('should return false when source type not accepted', () => {
      const source: DragSource = {
        id: 'source-1',
        type: 'card',
        data: {},
        config: { type: 'card', data: {} },
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
        acceptedSources: ['file'],
      };

      const target = {
        id: 'target-1',
        type: 'canvas' as const,
        config: targetConfig,
      };

      expect(manager.checkCanDrop(source, target)).toBe(false);
    });

    it('should return false when target type not allowed', () => {
      const source: DragSource = {
        id: 'source-1',
        type: 'file',
        data: {},
        config: {
          type: 'file',
          data: {},
          allowedTargets: ['card'],
        },
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
      };

      const target = {
        id: 'target-1',
        type: 'canvas' as const,
        config: targetConfig,
      };

      expect(manager.checkCanDrop(source, target)).toBe(false);
    });
  });

  describe('calculateInsertIndex', () => {
    it('should calculate correct insert index for vertical direction', () => {
      const items = [
        { id: 'item-1', rect: { top: 0, bottom: 50, height: 50 } as DOMRect },
        { id: 'item-2', rect: { top: 60, bottom: 110, height: 50 } as DOMRect },
        { id: 'item-3', rect: { top: 120, bottom: 170, height: 50 } as DOMRect },
      ];

      // 在第一个项目上方
      expect(manager.calculateInsertIndex(items, { x: 0, y: 10 }, 'vertical')).toBe(0);

      // 在第一个和第二个之间
      expect(manager.calculateInsertIndex(items, { x: 0, y: 55 }, 'vertical')).toBe(1);

      // 在最后一个项目下方
      expect(manager.calculateInsertIndex(items, { x: 0, y: 200 }, 'vertical')).toBe(3);
    });

    it('should calculate correct insert index for horizontal direction', () => {
      const items = [
        { id: 'item-1', rect: { left: 0, right: 50, width: 50 } as DOMRect },
        { id: 'item-2', rect: { left: 60, right: 110, width: 50 } as DOMRect },
      ];

      // 在第一个项目左边
      expect(manager.calculateInsertIndex(items, { x: 10, y: 0 }, 'horizontal')).toBe(0);

      // 在最后
      expect(manager.calculateInsertIndex(items, { x: 200, y: 0 }, 'horizontal')).toBe(2);
    });

    it('should return 0 for empty items', () => {
      expect(manager.calculateInsertIndex([], { x: 0, y: 0 }, 'vertical')).toBe(0);
    });
  });

  describe('isPointInRect', () => {
    it('should return true when point is inside rect', () => {
      const rect = { left: 0, right: 100, top: 0, bottom: 100 } as DOMRect;

      expect(manager.isPointInRect({ x: 50, y: 50 }, rect)).toBe(true);
    });

    it('should return false when point is outside rect', () => {
      const rect = { left: 0, right: 100, top: 0, bottom: 100 } as DOMRect;

      expect(manager.isPointInRect({ x: 150, y: 50 }, rect)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const sourceConfig: DragSourceConfig = {
        type: 'file',
        data: {},
      };

      const targetConfig: DropTargetConfig = {
        type: 'canvas',
        id: 'target-1',
      };

      manager.registerSource('source-1', sourceConfig);
      manager.registerTarget('target-1', targetConfig);
      manager.startDrag(sourceConfig);

      manager.reset();

      expect(manager.state.value.isDragging).toBe(false);
      expect(manager.getSource('source-1')).toBeUndefined();
      expect(manager.getTarget('target-1')).toBeUndefined();
    });
  });
});

describe('useDragDropManager', () => {
  beforeEach(() => {
    resetDragDropManager();
  });

  it('should return the same instance', () => {
    const instance1 = useDragDropManager();
    const instance2 = useDragDropManager();

    expect(instance1).toBe(instance2);
  });
});

describe('detectFileType', () => {
  it('should detect image files', () => {
    expect(detectFileType({ name: 'test.jpg', type: 'image/jpeg' } as File)).toBe('image');
    expect(detectFileType({ name: 'test.png', type: 'image/png' } as File)).toBe('image');
    expect(detectFileType({ name: 'test.gif', type: 'image/gif' } as File)).toBe('image');
    expect(detectFileType({ name: 'test.webp', type: 'image/webp' } as File)).toBe('image');
  });

  it('should detect video files', () => {
    expect(detectFileType({ name: 'test.mp4', type: 'video/mp4' } as File)).toBe('video');
    expect(detectFileType({ name: 'test.webm', type: 'video/webm' } as File)).toBe('video');
  });

  it('should detect audio files', () => {
    expect(detectFileType({ name: 'test.mp3', type: 'audio/mpeg' } as File)).toBe('audio');
    expect(detectFileType({ name: 'test.wav', type: 'audio/wav' } as File)).toBe('audio');
  });

  it('should detect card files', () => {
    expect(detectFileType({ name: 'test.chip', type: '' } as File)).toBe('card-file');
  });

  it('should detect box files', () => {
    expect(detectFileType({ name: 'test.box', type: '' } as File)).toBe('box-file');
  });

  it('should detect document files', () => {
    expect(detectFileType({ name: 'test.pdf', type: 'application/pdf' } as File)).toBe('document');
    expect(detectFileType({ name: 'test.txt', type: 'text/plain' } as File)).toBe('document');
  });

  it('should return unknown for unknown files', () => {
    expect(detectFileType({ name: 'test.xyz', type: '' } as File)).toBe('unknown');
  });

  it('should detect by extension when mime type is missing', () => {
    expect(detectFileType({ name: 'test.jpg', type: '' } as File)).toBe('image');
    expect(detectFileType({ name: 'test.mp4', type: '' } as File)).toBe('video');
    expect(detectFileType({ name: 'test.mp3', type: '' } as File)).toBe('audio');
  });
});

describe('detectFileTypes', () => {
  it('should detect multiple file types', () => {
    const files = [
      { name: 'image.jpg', type: 'image/jpeg' } as File,
      { name: 'video.mp4', type: 'video/mp4' } as File,
      { name: 'card.chip', type: '' } as File,
    ];

    const types = detectFileTypes(files);

    expect(types).toEqual(['image', 'video', 'card-file']);
  });
});

describe('useFileDrop', () => {
  it('should have correct initial state', () => {
    const { isFileDragOver, draggedFiles } = useFileDrop();

    expect(isFileDragOver.value).toBe(false);
    expect(draggedFiles.value).toBeNull();
  });

  it('should handle drag enter', () => {
    const { isFileDragOver, handleDragEnter } = useFileDrop();

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['Files'],
      },
    } as unknown as DragEvent;

    handleDragEnter(event);

    expect(isFileDragOver.value).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should handle drag leave', () => {
    const { isFileDragOver, handleDragEnter, handleDragLeave } = useFileDrop();

    const enterEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        types: ['Files'],
      },
    } as unknown as DragEvent;

    const leaveEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    handleDragEnter(enterEvent);
    handleDragLeave(leaveEvent);

    expect(isFileDragOver.value).toBe(false);
  });

  it('should handle drop with files', () => {
    const { handleDrop } = useFileDrop();

    const files = [
      { name: 'test.jpg', type: 'image/jpeg' },
    ];

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: files,
      },
    } as unknown as DragEvent;

    const result = handleDrop(event);

    expect(result).not.toBeNull();
    expect(result?.files).toHaveLength(1);
    expect(result?.types).toEqual(['image']);
  });

  it('should return null when no files', () => {
    const { handleDrop } = useFileDrop();

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [],
      },
    } as unknown as DragEvent;

    const result = handleDrop(event);

    expect(result).toBeNull();
  });
});

describe('useCardSort', () => {
  it('should have correct initial state', () => {
    const { isSorting, draggedCard, insertIndex } = useCardSort();

    expect(isSorting.value).toBe(false);
    expect(draggedCard.value).toBeNull();
    expect(insertIndex.value).toBe(-1);
  });

  it('should start sorting', () => {
    const { isSorting, draggedCard, insertIndex, startSort } = useCardSort();

    startSort({
      cardId: 'card-1',
      baseCardId: 'base-1',
      baseCardType: 'text',
      originalIndex: 2,
    });

    expect(isSorting.value).toBe(true);
    expect(draggedCard.value?.cardId).toBe('card-1');
    expect(insertIndex.value).toBe(2);
  });

  it('should update insert index', () => {
    const { insertIndex, startSort, updateInsertIndex } = useCardSort();

    startSort({
      cardId: 'card-1',
      baseCardId: 'base-1',
      baseCardType: 'text',
      originalIndex: 0,
    });

    updateInsertIndex(3);

    expect(insertIndex.value).toBe(3);
  });

  it('should not update insert index when not sorting', () => {
    const { insertIndex, updateInsertIndex } = useCardSort();

    updateInsertIndex(3);

    expect(insertIndex.value).toBe(-1);
  });

  it('should end sorting and return result', () => {
    const { isSorting, startSort, updateInsertIndex, endSort } = useCardSort();

    startSort({
      cardId: 'card-1',
      baseCardId: 'base-1',
      baseCardType: 'text',
      originalIndex: 0,
    });

    updateInsertIndex(3);

    const result = endSort();

    expect(result).toEqual({ from: 0, to: 3 });
    expect(isSorting.value).toBe(false);
  });

  it('should return null when from equals to', () => {
    const { startSort, endSort } = useCardSort();

    startSort({
      cardId: 'card-1',
      baseCardId: 'base-1',
      baseCardType: 'text',
      originalIndex: 2,
    });

    // insertIndex 默认等于 originalIndex
    const result = endSort();

    expect(result).toBeNull();
  });

  it('should cancel sorting', () => {
    const { isSorting, draggedCard, insertIndex, startSort, cancelSort } = useCardSort();

    startSort({
      cardId: 'card-1',
      baseCardId: 'base-1',
      baseCardType: 'text',
      originalIndex: 0,
    });

    cancelSort();

    expect(isSorting.value).toBe(false);
    expect(draggedCard.value).toBeNull();
    expect(insertIndex.value).toBe(-1);
  });
});

describe('useCardNest', () => {
  it('should have correct initial state', () => {
    const { isNesting, draggedCard, targetCardId, canNest } = useCardNest();

    expect(isNesting.value).toBe(false);
    expect(draggedCard.value).toBeNull();
    expect(targetCardId.value).toBeNull();
    expect(canNest.value).toBe(false);
  });

  it('should start nesting', () => {
    const { isNesting, draggedCard, startNest } = useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    expect(isNesting.value).toBe(true);
    expect(draggedCard.value?.cardId).toBe('card-1');
  });

  it('should set target', () => {
    const { targetCardId, canNest, startNest, setTarget } = useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    setTarget('card-2', true);

    expect(targetCardId.value).toBe('card-2');
    expect(canNest.value).toBe(true);
  });

  it('should not allow nesting to self', () => {
    const { canNest, startNest, setTarget } = useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    setTarget('card-1', true);

    expect(canNest.value).toBe(false);
  });

  it('should end nesting and return result', () => {
    const { isNesting, startNest, setTarget, endNest } = useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    setTarget('card-2', true);

    const result = endNest();

    expect(result).toEqual({ sourceId: 'card-1', targetId: 'card-2' });
    expect(isNesting.value).toBe(false);
  });

  it('should return null when cannot nest', () => {
    const { startNest, setTarget, endNest } = useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    setTarget('card-2', false);

    const result = endNest();

    expect(result).toBeNull();
  });

  it('should cancel nesting', () => {
    const { isNesting, draggedCard, targetCardId, canNest, startNest, setTarget, cancelNest } =
      useCardNest();

    startNest({
      cardId: 'card-1',
      cardName: 'Test Card',
    });

    setTarget('card-2', true);
    cancelNest();

    expect(isNesting.value).toBe(false);
    expect(draggedCard.value).toBeNull();
    expect(targetCardId.value).toBeNull();
    expect(canNest.value).toBe(false);
  });
});
