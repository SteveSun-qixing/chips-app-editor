/**
 * 卡片创建与编辑集成测试
 * @module tests/integration/card-workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';
import { useCardStore } from '@/core/state';

describe('卡片创建与编辑流程', () => {
  let editor: ChipsEditor;
  let cardStore: ReturnType<typeof useCardStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
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

  describe('卡片创建流程', () => {
    it('应创建新卡片并添加到 Store', async () => {
      const card = await editor.createCard({ name: '测试卡片' });

      expect(card.id).toBeDefined();
      expect(card.metadata.name).toBe('测试卡片');
      expect(cardStore.openCardCount).toBe(1);
      expect(cardStore.activeCardId).toBe(card.id);
    });

    it('应创建带有完整选项的卡片', async () => {
      const card = await editor.createCard({
        name: '详细卡片',
        type: 'note',
        tags: ['work', 'important'],
        description: '这是一张测试卡片',
        theme: 'blue',
      });

      expect(card.metadata.name).toBe('详细卡片');
      const cardInfo = cardStore.getCard(card.id);
      expect(cardInfo).toBeDefined();
    });

    it('应在创建卡片时发出事件', async () => {
      const eventHandler = vi.fn();
      editor.on('card:created', eventHandler);

      const card = await editor.createCard({ name: '事件测试卡片' });

      expect(eventHandler).toHaveBeenCalledWith({ cardId: card.id });
    });

    it('应正确标记编辑器有未保存更改', async () => {
      expect(editor.hasUnsavedChanges).toBe(false);

      await editor.createCard({ name: '新卡片' });

      expect(editor.hasUnsavedChanges).toBe(true);
    });
  });

  describe('卡片打开流程', () => {
    it('应打开现有卡片', async () => {
      const card = await editor.openCard('existing-card-123');

      expect(card.id).toBe('existing-card-123');
      expect(cardStore.isCardOpen('existing-card-123')).toBe(true);
    });

    it('应在打开卡片时发出事件', async () => {
      const eventHandler = vi.fn();
      editor.on('card:opened', eventHandler);

      await editor.openCard('test-card');

      expect(eventHandler).toHaveBeenCalled();
    });

    it('应激活打开的卡片', async () => {
      const card = await editor.openCard('card-to-activate');

      expect(cardStore.activeCardId).toBe(card.id);
    });

    it('不应重复打开已打开的卡片', async () => {
      await editor.openCard('same-card');

      const openEventHandler = vi.fn();
      editor.on('card:opened', openEventHandler);

      await editor.openCard('same-card');

      // 不应发出第二次打开事件
      expect(openEventHandler).not.toHaveBeenCalled();
      expect(cardStore.openCardCount).toBe(1);
    });

    it('应支持打开卡片时不激活', async () => {
      await editor.openCard('first-card');
      const firstCardId = cardStore.activeCardId;

      await editor.openCard('second-card', { activate: false });

      expect(cardStore.activeCardId).toBe(firstCardId);
    });
  });

  describe('卡片编辑流程', () => {
    it('应更新卡片元数据', async () => {
      const card = await editor.createCard({ name: '原始名称' });

      cardStore.updateCardMetadata(card.id, { name: '新名称' });

      const updatedCard = cardStore.getCard(card.id);
      expect(updatedCard?.metadata.name).toBe('新名称');
      expect(updatedCard?.isModified).toBe(true);
    });

    it('应更新卡片结构', async () => {
      const card = await editor.createCard({ name: '结构测试' });

      const newStructure = [
        { id: 'base-1', type: 'text' },
        { id: 'base-2', type: 'image' },
      ];
      cardStore.updateCardStructure(card.id, newStructure);

      const updatedCard = cardStore.getCard(card.id);
      expect(updatedCard?.structure.length).toBe(2);
      expect(updatedCard?.isModified).toBe(true);
    });

    it('应添加基础卡片到结构', async () => {
      const card = await editor.createCard({ name: '添加基础卡片' });

      cardStore.addBaseCard(card.id, { id: 'new-base', type: 'text' });

      const updatedCard = cardStore.getCard(card.id);
      expect(updatedCard?.structure.some((bc) => bc.id === 'new-base')).toBe(true);
    });

    it('应从结构中移除基础卡片', async () => {
      const card = await editor.createCard({ name: '移除基础卡片' });
      cardStore.addBaseCard(card.id, { id: 'to-remove', type: 'text' });

      cardStore.removeBaseCard(card.id, 'to-remove');

      const updatedCard = cardStore.getCard(card.id);
      expect(updatedCard?.structure.some((bc) => bc.id === 'to-remove')).toBe(false);
    });

    it('应重新排序基础卡片', async () => {
      const card = await editor.createCard({ name: '排序测试' });
      cardStore.addBaseCard(card.id, { id: 'card-a', type: 'text' });
      cardStore.addBaseCard(card.id, { id: 'card-b', type: 'text' });
      cardStore.addBaseCard(card.id, { id: 'card-c', type: 'text' });

      const initialOrder = cardStore.getCard(card.id)?.structure.map((bc) => bc.id);

      cardStore.reorderBaseCards(card.id, 0, 2);

      const newOrder = cardStore.getCard(card.id)?.structure.map((bc) => bc.id);
      expect(newOrder).not.toEqual(initialOrder);
    });
  });

  describe('卡片保存流程', () => {
    it('应保存卡片并清除修改标记', async () => {
      const card = await editor.createCard({ name: '待保存卡片' });
      cardStore.markCardModified(card.id);

      expect(cardStore.getCard(card.id)?.isModified).toBe(true);

      await editor.saveCard(card.id);

      expect(cardStore.getCard(card.id)?.isModified).toBe(false);
    });

    it('应在保存时发出事件', async () => {
      const eventHandler = vi.fn();
      editor.on('card:saved', eventHandler);

      const card = await editor.createCard({ name: '保存事件测试' });
      await editor.saveCard(card.id);

      expect(eventHandler).toHaveBeenCalledWith({ cardId: card.id });
    });

    it('应保存所有修改过的卡片', async () => {
      await editor.createCard({ name: '卡片1' });
      await editor.createCard({ name: '卡片2' });
      await editor.createCard({ name: '卡片3' });

      // 标记所有卡片为已修改
      cardStore.openCardList.forEach((card) => {
        cardStore.markCardModified(card.id);
      });

      expect(cardStore.hasModifiedCards).toBe(true);

      await editor.saveAllCards();

      expect(cardStore.hasModifiedCards).toBe(false);
    });

    it('应在保存不存在的卡片时抛出错误', async () => {
      await expect(editor.saveCard('non-existent-card')).rejects.toThrow('Card not found');
    });
  });

  describe('卡片关闭流程', () => {
    it('应关闭卡片并从 Store 移除', async () => {
      const card = await editor.createCard({ name: '待关闭卡片' });

      const result = editor.closeCard(card.id, true);

      expect(result).toBe(true);
      expect(cardStore.isCardOpen(card.id)).toBe(false);
    });

    it('应在关闭时发出事件', async () => {
      const eventHandler = vi.fn();
      editor.on('card:closed', eventHandler);

      const card = await editor.createCard({ name: '关闭事件测试' });
      editor.closeCard(card.id, true);

      expect(eventHandler).toHaveBeenCalledWith({ cardId: card.id });
    });

    it('应阻止关闭有未保存更改的卡片（非强制）', async () => {
      const card = await editor.createCard({ name: '未保存卡片' });
      cardStore.markCardModified(card.id);

      const closeRequestHandler = vi.fn();
      editor.on('card:closeRequested', closeRequestHandler);

      const result = editor.closeCard(card.id, false);

      expect(result).toBe(false);
      expect(closeRequestHandler).toHaveBeenCalledWith({
        cardId: card.id,
        hasUnsavedChanges: true,
      });
    });

    it('应强制关闭有未保存更改的卡片', async () => {
      const card = await editor.createCard({ name: '强制关闭' });
      cardStore.markCardModified(card.id);

      const result = editor.closeCard(card.id, true);

      expect(result).toBe(true);
      expect(cardStore.isCardOpen(card.id)).toBe(false);
    });

    it('应在关闭活动卡片后切换到其他卡片', async () => {
      const card1 = await editor.createCard({ name: '卡片1' });
      const card2 = await editor.createCard({ name: '卡片2' });

      // card2 现在是活动卡片
      expect(cardStore.activeCardId).toBe(card2.id);

      editor.closeCard(card2.id, true);

      // 应切换到 card1
      expect(cardStore.activeCardId).toBe(card1.id);
    });
  });

  describe('卡片删除流程', () => {
    it('应删除卡片', async () => {
      const card = await editor.createCard({ name: '待删除卡片' });

      await editor.deleteCard(card.id);

      expect(cardStore.isCardOpen(card.id)).toBe(false);
    });

    it('应在删除时发出事件', async () => {
      const eventHandler = vi.fn();
      editor.on('card:deleted', eventHandler);

      const card = await editor.createCard({ name: '删除事件测试' });
      await editor.deleteCard(card.id);

      expect(eventHandler).toHaveBeenCalledWith({ cardId: card.id });
    });
  });
});
