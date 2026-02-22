/**
 * 可排序列表组件测试
 * @module tests/unit/components/drag-drop/SortableList
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';
import SortableList from '@/components/drag-drop/SortableList.vue';

// Mock useCardSort
vi.mock('@/core', async () => {
  const actual = await vi.importActual('@/core');
  return {
    ...actual,
    useCardSort: () => {
      const isSorting = ref(false);
      const draggedCard = ref(null);
      const insertIndex = ref(-1);

      return {
        isSorting: { value: isSorting.value },
        draggedCard: { value: draggedCard.value },
        insertIndex: { value: insertIndex.value },
        startSort: vi.fn((data) => {
          isSorting.value = true;
          draggedCard.value = data;
          insertIndex.value = data.originalIndex;
        }),
        updateInsertIndex: vi.fn((index) => {
          insertIndex.value = index;
        }),
        endSort: vi.fn(() => {
          isSorting.value = false;
          return null;
        }),
        cancelSort: vi.fn(() => {
          isSorting.value = false;
          draggedCard.value = null;
          insertIndex.value = -1;
        }),
      };
    },
  };
});

// 创建模拟 DragEvent
function createMockDragEvent(type: string): DragEvent {
  return {
    type,
    clientX: 100,
    clientY: 200,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      effectAllowed: 'uninitialized' as DataTransfer['effectAllowed'],
      dropEffect: 'none' as DataTransfer['dropEffect'],
      setData: vi.fn(),
      getData: vi.fn(),
      setDragImage: vi.fn(),
    },
  } as unknown as DragEvent;
}

describe('SortableList', () => {
  const items = [
    { id: 'item-1', type: 'text' },
    { id: 'item-2', type: 'image' },
    { id: 'item-3', type: 'video' },
  ];

  describe('rendering', () => {
    it('should render all items', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      const itemElements = wrapper.findAll('.sortable-list__item');
      expect(itemElements).toHaveLength(3);
    });

    it('should render with default slot content', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      const itemElements = wrapper.findAll('.sortable-list__item');
      expect(itemElements[0].text()).toBe('item-1');
      expect(itemElements[1].text()).toBe('item-2');
      expect(itemElements[2].text()).toBe('item-3');
    });

    it('should render custom slot content', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
        slots: {
          default: ({ item, index }) => `Custom: ${item.id} at ${index}`,
        },
      });

      const itemElements = wrapper.findAll('.sortable-list__item');
      expect(itemElements[0].text()).toContain('Custom: item-1 at 0');
    });
  });

  describe('direction', () => {
    it('should apply vertical class by default', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      expect(wrapper.find('.sortable-list--vertical').exists()).toBe(true);
    });

    it('should apply horizontal class when direction is horizontal', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
          direction: 'horizontal',
        },
      });

      expect(wrapper.find('.sortable-list--horizontal').exists()).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('should apply disabled class when disabled', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
          disabled: true,
        },
      });

      expect(wrapper.find('.sortable-list--disabled').exists()).toBe(true);
    });
  });

  describe('drag events', () => {
    it('should emit dragStart on drag start', async () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      const event = createMockDragEvent('dragstart');
      const firstItem = wrapper.findAll('.sortable-list__item')[0];
      await firstItem.trigger('dragstart', event);

      expect(wrapper.emitted('dragStart')).toBeTruthy();
    });

    it('should set drag data on drag start', async () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      const event = createMockDragEvent('dragstart');
      const firstItem = wrapper.findAll('.sortable-list__item')[0];
      await firstItem.trigger('dragstart', event);

      expect(event.dataTransfer?.setData).toHaveBeenCalled();
    });

    it('should emit dragEnd on drag end', async () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
        },
      });

      const event = createMockDragEvent('dragend');
      const firstItem = wrapper.findAll('.sortable-list__item')[0];
      await firstItem.trigger('dragend', event);

      expect(wrapper.emitted('dragEnd')).toBeTruthy();
    });
  });

  describe('gap styling', () => {
    it('should apply custom gap', () => {
      const wrapper = mount(SortableList, {
        props: {
          items,
          containerId: 'container-1',
          gap: 16,
        },
      });

      const list = wrapper.find('.sortable-list');
      expect(list.attributes('style')).toContain('gap: 16px');
    });
  });

  describe('empty items', () => {
    it('should render empty list', () => {
      const wrapper = mount(SortableList, {
        props: {
          items: [],
          containerId: 'container-1',
        },
      });

      const itemElements = wrapper.findAll('.sortable-list__item');
      expect(itemElements).toHaveLength(0);
    });
  });
});
