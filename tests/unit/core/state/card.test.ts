/**
 * 卡片 Store 测试
 * @module tests/unit/core/state/card
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCardStore } from '@/core/state/stores/card';
import type { Card } from '@/core/state/stores/card';

// 创建测试用的模拟卡片数据
function createMockCard(id: string, name = `Test Card ${id}`): Card {
  const now = new Date().toISOString();
  return {
    id,
    metadata: {
      chip_standards_version: '1.0.0',
      card_id: id,
      name,
      created_at: now,
      modified_at: now,
    },
    structure: {
      structure: [
        { id: 'base1', type: 'TextCard' },
        { id: 'base2', type: 'ImageCard' },
      ],
      manifest: {
        card_count: 2,
        resource_count: 0,
        resources: [],
      },
    },
  };
}

describe('useCardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useCardStore();
      expect(store.openCards.size).toBe(0);
      expect(store.activeCardId).toBeNull();
      expect(store.selectedBaseCardId).toBeNull();
      expect(store.loadingCards.size).toBe(0);
    });
  });

  describe('getters', () => {
    it('openCardList should return array of cards', () => {
      const store = useCardStore();
      store.addCard(createMockCard('card1'));
      store.addCard(createMockCard('card2'));
      expect(store.openCardList).toHaveLength(2);
    });

    it('activeCard should return active card', () => {
      const store = useCardStore();
      store.addCard(createMockCard('card1'));
      store.setActiveCard('card1');
      expect(store.activeCard).not.toBeNull();
      expect(store.activeCard?.id).toBe('card1');
    });

    it('hasOpenCards should return true when there are cards', () => {
      const store = useCardStore();
      expect(store.hasOpenCards).toBe(false);
      store.addCard(createMockCard('card1'));
      expect(store.hasOpenCards).toBe(true);
    });

    it('openCardCount should return correct count', () => {
      const store = useCardStore();
      expect(store.openCardCount).toBe(0);
      store.addCard(createMockCard('card1'));
      store.addCard(createMockCard('card2'));
      expect(store.openCardCount).toBe(2);
    });

    it('hasModifiedCards should return true when there are modified cards', () => {
      const store = useCardStore();
      store.addCard(createMockCard('card1'));
      expect(store.hasModifiedCards).toBe(false);
      store.markCardModified('card1');
      expect(store.hasModifiedCards).toBe(true);
    });

    it('modifiedCards should return only modified cards', () => {
      const store = useCardStore();
      store.addCard(createMockCard('card1'));
      store.addCard(createMockCard('card2'));
      store.markCardModified('card1');
      expect(store.modifiedCards).toHaveLength(1);
      expect(store.modifiedCards[0]?.id).toBe('card1');
    });

    it('openCardIds should return array of ids', () => {
      const store = useCardStore();
      store.addCard(createMockCard('card1'));
      store.addCard(createMockCard('card2'));
      expect(store.openCardIds).toContain('card1');
      expect(store.openCardIds).toContain('card2');
    });

    it('isLoadingAny should return true when loading', () => {
      const store = useCardStore();
      expect(store.isLoadingAny).toBe(false);
      store.setCardLoading('card1', true);
      expect(store.isLoadingAny).toBe(true);
    });
  });

  describe('actions', () => {
    describe('addCard', () => {
      it('should add card to openCards', () => {
        const store = useCardStore();
        const card = createMockCard('card1');
        store.addCard(card);
        expect(store.openCards.has('card1')).toBe(true);
      });

      it('should store file path when provided', () => {
        const store = useCardStore();
        const card = createMockCard('card1');
        store.addCard(card, '/path/to/card.card');
        const cardInfo = store.getCard('card1');
        expect(cardInfo?.filePath).toBe('/path/to/card.card');
      });
    });

    describe('removeCard', () => {
      it('should remove card from openCards', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.removeCard('card1');
        expect(store.openCards.has('card1')).toBe(false);
      });

      it('should switch active card when removing active card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.addCard(createMockCard('card2'));
        store.setActiveCard('card1');
        store.removeCard('card1');
        expect(store.activeCardId).toBe('card2');
      });

      it('should set activeCardId to null when removing last card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.setActiveCard('card1');
        store.removeCard('card1');
        expect(store.activeCardId).toBeNull();
      });
    });

    describe('setActiveCard', () => {
      it('should set active card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.setActiveCard('card1');
        expect(store.activeCardId).toBe('card1');
      });

      it('should clear selected base card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.setActiveCard('card1');
        store.setSelectedBaseCard('base1');
        store.setActiveCard('card1');
        expect(store.selectedBaseCardId).toBeNull();
      });
    });

    describe('setSelectedBaseCard', () => {
      it('should set selected base card', () => {
        const store = useCardStore();
        store.setSelectedBaseCard('base1');
        expect(store.selectedBaseCardId).toBe('base1');
      });
    });

    describe('getCard', () => {
      it('should return card info', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        const card = store.getCard('card1');
        expect(card).not.toBeUndefined();
        expect(card?.id).toBe('card1');
      });

      it('should return undefined for non-existent card', () => {
        const store = useCardStore();
        expect(store.getCard('nonexistent')).toBeUndefined();
      });
    });

    describe('isCardOpen', () => {
      it('should return true for open card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        expect(store.isCardOpen('card1')).toBe(true);
      });

      it('should return false for non-open card', () => {
        const store = useCardStore();
        expect(store.isCardOpen('card1')).toBe(false);
      });
    });

    describe('updateCardMetadata', () => {
      it('should update card metadata', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.updateCardMetadata('card1', { name: 'New Name' });
        const card = store.getCard('card1');
        expect(card?.metadata.name).toBe('New Name');
      });

      it('should mark card as modified', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.updateCardMetadata('card1', { name: 'New Name' });
        const card = store.getCard('card1');
        expect(card?.isModified).toBe(true);
      });
    });

    describe('updateCardStructure', () => {
      it('should update card structure', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        const newStructure = [{ id: 'newBase', type: 'NewCard' }];
        store.updateCardStructure('card1', newStructure);
        const card = store.getCard('card1');
        expect(card?.structure).toEqual(newStructure);
      });
    });

    describe('addBaseCard', () => {
      it('should add base card at end by default', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.addBaseCard('card1', { id: 'newBase', type: 'NewCard' });
        const card = store.getCard('card1');
        expect(card?.structure[card.structure.length - 1]?.id).toBe('newBase');
      });

      it('should add base card at specified position', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.addBaseCard('card1', { id: 'newBase', type: 'NewCard' }, 0);
        const card = store.getCard('card1');
        expect(card?.structure[0]?.id).toBe('newBase');
      });
    });

    describe('removeBaseCard', () => {
      it('should remove base card', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.removeBaseCard('card1', 'base1');
        const card = store.getCard('card1');
        expect(card?.structure.find((bc) => bc.id === 'base1')).toBeUndefined();
      });

      it('should clear selected base card if removed', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.setSelectedBaseCard('base1');
        store.removeBaseCard('card1', 'base1');
        expect(store.selectedBaseCardId).toBeNull();
      });
    });

    describe('reorderBaseCards', () => {
      it('should reorder base cards', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.reorderBaseCards('card1', 0, 1);
        const card = store.getCard('card1');
        expect(card?.structure[0]?.id).toBe('base2');
        expect(card?.structure[1]?.id).toBe('base1');
      });
    });

    describe('markCardSaved', () => {
      it('should mark card as saved', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.markCardModified('card1');
        store.markCardSaved('card1');
        const card = store.getCard('card1');
        expect(card?.isModified).toBe(false);
      });
    });

    describe('setCardLoading', () => {
      it('should set card loading state', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.setCardLoading('card1', true);
        const card = store.getCard('card1');
        expect(card?.isLoading).toBe(true);
        expect(store.loadingCards.has('card1')).toBe(true);
      });
    });

    describe('updateFilePath', () => {
      it('should update file path', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.updateFilePath('card1', '/new/path.card');
        const card = store.getCard('card1');
        expect(card?.filePath).toBe('/new/path.card');
      });
    });

    describe('clearAll', () => {
      it('should clear all cards and state', () => {
        const store = useCardStore();
        store.addCard(createMockCard('card1'));
        store.addCard(createMockCard('card2'));
        store.setActiveCard('card1');
        store.setSelectedBaseCard('base1');
        store.clearAll();
        expect(store.openCards.size).toBe(0);
        expect(store.activeCardId).toBeNull();
        expect(store.selectedBaseCardId).toBeNull();
        expect(store.loadingCards.size).toBe(0);
      });
    });
  });
});
