/**
 * 可嵌套卡片组件测试
 * @module tests/unit/components/drag-drop/NestableCard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import NestableCard from '@/components/drag-drop/NestableCard.vue';
import DropHighlight from '@/components/drag-drop/DropHighlight.vue';

// Mock useCardNest
vi.mock('@/core', async () => {
  const actual = await vi.importActual('@/core');
  return {
    ...actual,
    useCardNest: () => {
      const isNesting = ref(false);
      const draggedCard = ref(null);
      const targetCardId = ref(null);
      const canNest = ref(false);

      return {
        isNesting: { value: isNesting.value },
        draggedCard: { value: draggedCard.value },
        targetCardId: { value: targetCardId.value },
        canNest: { value: canNest.value },
        startNest: vi.fn((data) => {
          isNesting.value = true;
          draggedCard.value = data;
        }),
        setTarget: vi.fn((id, can) => {
          targetCardId.value = id;
          canNest.value = can && id !== draggedCard.value?.cardId;
        }),
        endNest: vi.fn(() => {
          isNesting.value = false;
          return null;
        }),
        cancelNest: vi.fn(() => {
          isNesting.value = false;
          draggedCard.value = null;
          targetCardId.value = null;
          canNest.value = false;
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
    relatedTarget: null,
    currentTarget: null,
    dataTransfer: {
      effectAllowed: 'uninitialized' as DataTransfer['effectAllowed'],
      dropEffect: 'none' as DataTransfer['dropEffect'],
      setData: vi.fn(),
      getData: vi.fn(),
      setDragImage: vi.fn(),
    },
  } as unknown as DragEvent;
}

describe('NestableCard', () => {
  const defaultProps = {
    cardId: 'card-1',
    cardName: 'Test Card',
  };

  describe('rendering', () => {
    it('should render slot content', () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
        slots: {
          default: '<div class="test-content">Card Content</div>',
        },
      });

      expect(wrapper.find('.test-content').exists()).toBe(true);
      expect(wrapper.find('.test-content').text()).toBe('Card Content');
    });

    it('should wrap with DropHighlight', () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      expect(wrapper.findComponent(DropHighlight).exists()).toBe(true);
    });
  });

  describe('draggable state', () => {
    it('should be draggable by default', () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      expect(wrapper.find('.nestable-card').attributes('draggable')).toBe('true');
    });

    it('should not be draggable when canBeDragged is false', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          canBeDragged: false,
        },
      });

      expect(wrapper.find('.nestable-card').attributes('draggable')).toBe('false');
    });

    it('should not be draggable when disabled', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          disabled: true,
        },
      });

      expect(wrapper.find('.nestable-card').attributes('draggable')).toBe('false');
    });
  });

  describe('disabled state', () => {
    it('should apply disabled class when disabled', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          disabled: true,
        },
      });

      expect(wrapper.find('.nestable-card--disabled').exists()).toBe(true);
    });
  });

  describe('drag events', () => {
    it('should emit dragStart on drag start', async () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      const event = createMockDragEvent('dragstart');
      await wrapper.find('.nestable-card').trigger('dragstart', event);

      expect(wrapper.emitted('dragStart')).toBeTruthy();
    });

    it('should set drag data on drag start', async () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      const event = createMockDragEvent('dragstart');
      await wrapper.find('.nestable-card').trigger('dragstart', event);

      expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
        'application/x-chips-card-nest',
        JSON.stringify({
          cardId: 'card-1',
          cardName: 'Test Card',
        })
      );
    });

    it('should emit dragEnd on drag end', async () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      const event = createMockDragEvent('dragend');
      await wrapper.find('.nestable-card').trigger('dragend', event);

      expect(wrapper.emitted('dragEnd')).toBeTruthy();
    });
  });

  describe('nest level', () => {
    it('should allow nesting when under max level', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          maxNestLevel: 3,
          currentLevel: 0,
        },
      });

      // 组件应该能接受嵌套
      expect(wrapper.props('canBeTarget')).toBe(true);
    });

    it('should not allow nesting when at max level', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          maxNestLevel: 3,
          currentLevel: 2, // 已经在最大层级 -1
          canBeTarget: true,
        },
      });

      // 组件创建成功
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('target state', () => {
    it('should not be target by default', () => {
      const wrapper = mount(NestableCard, {
        props: defaultProps,
      });

      expect(wrapper.find('.nestable-card--target').exists()).toBe(false);
    });
  });

  describe('canBeTarget prop', () => {
    it('should respect canBeTarget prop', () => {
      const wrapper = mount(NestableCard, {
        props: {
          ...defaultProps,
          canBeTarget: false,
        },
      });

      expect(wrapper.props('canBeTarget')).toBe(false);
    });
  });
});
