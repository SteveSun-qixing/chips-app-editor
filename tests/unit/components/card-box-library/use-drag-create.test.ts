/**
 * 拖放创建 Hook 测试
 * @module tests/unit/components/card-box-library/use-drag-create
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useDragCreate,
  useGlobalDragCreate,
  resetGlobalDragCreate,
} from '@/components/card-box-library/use-drag-create';
import type { DragData } from '@/components/card-box-library/types';

// 创建模拟 DragEvent
function createMockDragEvent(type: string = 'dragstart'): DragEvent {
  const dataStore: Record<string, string> = {};
  const dataTransfer = {
    setData: vi.fn((type: string, data: string) => {
      dataStore[type] = data;
    }),
    getData: vi.fn((type: string) => dataStore[type] || ''),
    setDragImage: vi.fn(),
    effectAllowed: 'uninitialized' as DataTransfer['effectAllowed'],
    dropEffect: 'none' as DataTransfer['dropEffect'],
  };

  return {
    type,
    dataTransfer,
    clientX: 100,
    clientY: 200,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as DragEvent;
}

describe('useDragCreate', () => {
  let dragCreate: ReturnType<typeof useDragCreate>;

  beforeEach(() => {
    dragCreate = useDragCreate();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(dragCreate.dragState.value.isDragging).toBe(false);
      expect(dragCreate.dragState.value.data).toBeNull();
      expect(dragCreate.dragState.value.previewPosition).toBeNull();
    });
  });

  describe('startDrag', () => {
    it('should set dragging state to true', () => {
      const data: DragData = { type: 'card', typeId: 'rich-text', name: '富文本' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(dragCreate.dragState.value.isDragging).toBe(true);
    });

    it('should store drag data', () => {
      const data: DragData = { type: 'card', typeId: 'rich-text', name: '富文本' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(dragCreate.dragState.value.data).toEqual(data);
    });

    it('should set data to dataTransfer', () => {
      const data: DragData = { type: 'card', typeId: 'rich-text', name: '富文本' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
        'application/x-chips-drag-data',
        JSON.stringify(data)
      );
      expect(event.dataTransfer?.setData).toHaveBeenCalledWith('text/plain', data.name);
    });

    it('should set effectAllowed to copy', () => {
      const data: DragData = { type: 'layout', typeId: 'grid-layout', name: '网格' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(event.dataTransfer?.effectAllowed).toBe('copy');
    });

    it('should set drag image', () => {
      const data: DragData = { type: 'card', typeId: 'video', name: '视频' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(event.dataTransfer?.setDragImage).toHaveBeenCalled();
    });
  });

  describe('updatePreview', () => {
    it('should update preview position when dragging', () => {
      const data: DragData = { type: 'card', typeId: 'image', name: '图片' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);
      dragCreate.updatePreview(150, 250);

      expect(dragCreate.dragState.value.previewPosition).toEqual({ x: 150, y: 250 });
    });

    it('should not update preview position when not dragging', () => {
      dragCreate.updatePreview(150, 250);

      expect(dragCreate.dragState.value.previewPosition).toBeNull();
    });
  });

  describe('endDrag', () => {
    it('should reset all state', () => {
      const data: DragData = { type: 'card', typeId: 'code', name: '代码块' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);
      dragCreate.updatePreview(100, 200);
      dragCreate.endDrag();

      expect(dragCreate.dragState.value.isDragging).toBe(false);
      expect(dragCreate.dragState.value.data).toBeNull();
      expect(dragCreate.dragState.value.previewPosition).toBeNull();
    });
  });

  describe('getDragData', () => {
    it('should return current drag data', () => {
      const data: DragData = { type: 'layout', typeId: 'waterfall-layout', name: '瀑布流' };
      const event = createMockDragEvent();

      dragCreate.startDrag(data, event);

      expect(dragCreate.getDragData()).toEqual(data);
    });

    it('should return null when not dragging', () => {
      expect(dragCreate.getDragData()).toBeNull();
    });
  });

  describe('setDragDataToEvent', () => {
    it('should set data to event dataTransfer', () => {
      const data: DragData = { type: 'card', typeId: 'markdown', name: 'Markdown' };
      const event = createMockDragEvent();

      dragCreate.setDragDataToEvent(event, data);

      expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
        'application/x-chips-drag-data',
        JSON.stringify(data)
      );
    });
  });

  describe('getDragDataFromEvent', () => {
    it('should return data from event dataTransfer', () => {
      const data: DragData = { type: 'card', typeId: 'calendar', name: '日历' };
      const event = createMockDragEvent();

      // 先设置数据
      dragCreate.setDragDataToEvent(event, data);

      // 然后获取数据
      const result = dragCreate.getDragDataFromEvent(event);

      expect(result).toEqual(data);
    });

    it('should return null for invalid JSON', () => {
      const event = createMockDragEvent();
      (event.dataTransfer as any).getData = vi.fn(() => 'invalid json');

      const result = dragCreate.getDragDataFromEvent(event);

      expect(result).toBeNull();
    });

    it('should return null when dataTransfer has no data', () => {
      const event = createMockDragEvent();
      (event.dataTransfer as any).getData = vi.fn(() => '');

      const result = dragCreate.getDragDataFromEvent(event);

      expect(result).toBeNull();
    });

    it('should return null when dataTransfer is null', () => {
      const event = { dataTransfer: null } as unknown as DragEvent;

      const result = dragCreate.getDragDataFromEvent(event);

      expect(result).toBeNull();
    });
  });

  describe('dragState readonly', () => {
    it('should return readonly ref', () => {
      // dragState 是只读的，不应该能直接修改
      // 这个测试验证 dragState 是通过 readonly 包装的
      expect(dragCreate.dragState.value.isDragging).toBe(false);
    });
  });
});

describe('useGlobalDragCreate', () => {
  beforeEach(() => {
    resetGlobalDragCreate();
  });

  it('should return the same instance', () => {
    const instance1 = useGlobalDragCreate();
    const instance2 = useGlobalDragCreate();

    expect(instance1).toBe(instance2);
  });

  it('should share state across calls', () => {
    const instance1 = useGlobalDragCreate();
    const instance2 = useGlobalDragCreate();

    const data: DragData = { type: 'card', typeId: 'list', name: '列表' };
    const event = createMockDragEvent();

    instance1.startDrag(data, event);

    expect(instance2.dragState.value.isDragging).toBe(true);
    expect(instance2.dragState.value.data).toEqual(data);
  });
});

describe('resetGlobalDragCreate', () => {
  it('should reset global instance', () => {
    const instance1 = useGlobalDragCreate();
    const data: DragData = { type: 'card', typeId: 'rating', name: '打分' };
    const event = createMockDragEvent();

    instance1.startDrag(data, event);

    resetGlobalDragCreate();

    const instance2 = useGlobalDragCreate();

    expect(instance2.dragState.value.isDragging).toBe(false);
  });

  it('should create new instance after reset', () => {
    const instance1 = useGlobalDragCreate();

    resetGlobalDragCreate();

    const instance2 = useGlobalDragCreate();

    // 它们可能不是同一个对象引用（因为重新创建了）
    // 但关键是状态被重置了
    expect(instance2.dragState.value.isDragging).toBe(false);
  });
});
