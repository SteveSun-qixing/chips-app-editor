/**
 * 卡片完整生命周期端到端测试
 * @module tests/e2e/card-lifecycle
 * @description 测试卡片从创建→编辑→保存的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';
import { useCardStore, useUIStore } from '@/core/state';
import { useWindowManager, resetWindowManager } from '@/core/window-manager';

describe('E2E: 卡片完整生命周期', () => {
  let editor: ChipsEditor;
  let cardStore: ReturnType<typeof useCardStore>;
  let uiStore: ReturnType<typeof useUIStore>;
  let windowManager: ReturnType<typeof useWindowManager>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    resetWindowManager();
    cardStore = useCardStore();
    uiStore = useUIStore();
    windowManager = useWindowManager();
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
    resetWindowManager();
  });

  describe('场景1: 完整的卡片创建→编辑→保存流程', () => {
    it('应完成卡片创建到保存的完整流程', async () => {
      // 记录事件
      const events: string[] = [];
      editor.on('card:created', () => events.push('created'));
      editor.on('card:saved', () => events.push('saved'));

      // Step 1: 创建新卡片
      const card = await editor.createCard({
        name: '我的新卡片',
        type: 'note',
        description: '这是一张测试卡片',
      });

      expect(card.id).toBeDefined();
      expect(card.metadata.name).toBe('我的新卡片');
      expect(cardStore.openCardCount).toBe(1);
      expect(cardStore.activeCardId).toBe(card.id);
      expect(events).toContain('created');

      // Step 2: 编辑卡片内容
      // 2a. 修改元数据
      cardStore.updateCardMetadata(card.id, {
        name: '更新后的卡片名称',
        description: '更新后的描述',
      });

      const updatedCard = cardStore.getCard(card.id);
      expect(updatedCard?.metadata.name).toBe('更新后的卡片名称');
      expect(updatedCard?.isModified).toBe(true);

      // 2b. 添加基础卡片
      cardStore.addBaseCard(card.id, {
        id: 'text-block-1',
        type: 'text',
        config: { content: '第一段文本内容' },
      });

      cardStore.addBaseCard(card.id, {
        id: 'image-block-1',
        type: 'image',
        config: { src: '/images/test.png' },
      });

      cardStore.addBaseCard(card.id, {
        id: 'text-block-2',
        type: 'text',
        config: { content: '第二段文本内容' },
      });

      expect(cardStore.getCard(card.id)?.structure.length).toBe(3);

      // 2c. 重新排序基础卡片
      cardStore.reorderBaseCards(card.id, 2, 0); // 把最后一个移到最前面

      const reorderedStructure = cardStore.getCard(card.id)?.structure;
      expect(reorderedStructure?.[0]?.id).toBe('text-block-2');

      // Step 3: 保存卡片
      expect(editor.hasUnsavedChanges).toBe(true);

      await editor.saveCard(card.id);

      expect(events).toContain('saved');
      expect(cardStore.getCard(card.id)?.isModified).toBe(false);

      // 验证最终状态
      const finalCard = cardStore.getCard(card.id);
      expect(finalCard).toBeDefined();
      expect(finalCard?.metadata.name).toBe('更新后的卡片名称');
      expect(finalCard?.structure.length).toBe(3);
    });

    it('应创建卡片并打开窗口', async () => {
      // 创建卡片
      const card = await editor.createCard({ name: '窗口测试卡片' });

      // 为卡片创建窗口
      const windowId = windowManager.createCardWindow(card.id, {
        title: card.metadata.name,
        position: { x: 100, y: 100 },
      });

      // 验证窗口创建
      expect(uiStore.windowCount).toBe(1);
      const window = windowManager.getWindow(windowId);
      expect(window).toBeDefined();
      expect(window?.type).toBe('card');

      // 聚焦窗口
      windowManager.focusWindow(windowId);
      expect(uiStore.focusedWindowId).toBe(windowId);

      // 关闭窗口
      windowManager.closeWindow(windowId);
      expect(uiStore.windowCount).toBe(0);
    });
  });

  describe('场景2: 多卡片管理流程', () => {
    it('应管理多个卡片的打开、切换和关闭', async () => {
      // 创建多个卡片
      const card1 = await editor.createCard({ name: '卡片 A' });
      const card2 = await editor.createCard({ name: '卡片 B' });
      const card3 = await editor.createCard({ name: '卡片 C' });

      expect(cardStore.openCardCount).toBe(3);

      // 验证最后创建的卡片是活动卡片
      expect(cardStore.activeCardId).toBe(card3.id);

      // 切换活动卡片
      cardStore.setActiveCard(card1.id);
      expect(cardStore.activeCardId).toBe(card1.id);

      // 修改多个卡片
      cardStore.markCardModified(card1.id);
      cardStore.markCardModified(card2.id);

      expect(cardStore.hasModifiedCards).toBe(true);
      expect(cardStore.modifiedCards.length).toBe(2);

      // 保存所有卡片
      await editor.saveAllCards();

      expect(cardStore.hasModifiedCards).toBe(false);

      // 关闭一个卡片
      editor.closeCard(card2.id, true);

      expect(cardStore.openCardCount).toBe(2);
      expect(cardStore.isCardOpen(card2.id)).toBe(false);

      // 关闭所有卡片
      editor.closeCard(card1.id, true);
      editor.closeCard(card3.id, true);

      expect(cardStore.openCardCount).toBe(0);
      expect(cardStore.activeCardId).toBeNull();
    });

    it('应正确处理活动卡片切换', async () => {
      const card1 = await editor.createCard({ name: '卡片 1' });
      const card2 = await editor.createCard({ name: '卡片 2' });
      const card3 = await editor.createCard({ name: '卡片 3' });

      // card3 是活动卡片
      expect(cardStore.activeCardId).toBe(card3.id);

      // 关闭活动卡片，应自动切换
      editor.closeCard(card3.id, true);

      // 应切换到第一个可用卡片
      expect(cardStore.activeCardId).not.toBeNull();
      expect([card1.id, card2.id]).toContain(cardStore.activeCardId);
    });
  });

  describe('场景3: 卡片编辑与撤销', () => {
    it('应支持选择基础卡片', async () => {
      const card = await editor.createCard({ name: '选择测试' });

      cardStore.addBaseCard(card.id, { id: 'base-1', type: 'text' });
      cardStore.addBaseCard(card.id, { id: 'base-2', type: 'text' });

      // 选择基础卡片
      cardStore.setSelectedBaseCard('base-1');
      expect(cardStore.selectedBaseCardId).toBe('base-1');

      // 切换选择
      cardStore.setSelectedBaseCard('base-2');
      expect(cardStore.selectedBaseCardId).toBe('base-2');

      // 取消选择
      cardStore.setSelectedBaseCard(null);
      expect(cardStore.selectedBaseCardId).toBeNull();
    });

    it('应在切换活动卡片时清除基础卡片选择', async () => {
      const card1 = await editor.createCard({ name: '卡片 1' });
      const card2 = await editor.createCard({ name: '卡片 2' });

      cardStore.addBaseCard(card1.id, { id: 'base-1', type: 'text' });

      cardStore.setActiveCard(card1.id);
      cardStore.setSelectedBaseCard('base-1');

      expect(cardStore.selectedBaseCardId).toBe('base-1');

      // 切换到另一个卡片
      cardStore.setActiveCard(card2.id);

      // 选择应该被清除
      expect(cardStore.selectedBaseCardId).toBeNull();
    });

    it('应在删除基础卡片时清除选择', async () => {
      const card = await editor.createCard({ name: '删除测试' });

      cardStore.addBaseCard(card.id, { id: 'to-delete', type: 'text' });
      cardStore.setSelectedBaseCard('to-delete');

      expect(cardStore.selectedBaseCardId).toBe('to-delete');

      cardStore.removeBaseCard(card.id, 'to-delete');

      expect(cardStore.selectedBaseCardId).toBeNull();
    });
  });

  describe('场景4: 卡片窗口管理', () => {
    it('应为多个卡片创建和管理窗口', async () => {
      // 创建卡片
      const card1 = await editor.createCard({ name: '窗口卡片 1' });
      const card2 = await editor.createCard({ name: '窗口卡片 2' });

      // 创建窗口
      const win1 = windowManager.createCardWindow(card1.id);
      const win2 = windowManager.createCardWindow(card2.id);

      expect(uiStore.windowCount).toBe(2);

      // 获取卡片窗口
      const cardWindows = windowManager.getCardWindows();
      expect(cardWindows.length).toBe(2);

      // 按卡片 ID 查找窗口
      const foundWindow = windowManager.findWindowByCardId(card1.id);
      expect(foundWindow?.id).toBe(win1);

      // 平铺窗口
      windowManager.tileWindows();

      // 验证窗口位置已更新
      const window1 = windowManager.getWindow(win1);
      const window2 = windowManager.getWindow(win2);
      expect(window1?.position).toBeDefined();
      expect(window2?.position).toBeDefined();

      // 层叠窗口
      windowManager.cascadeWindows();

      // 关闭所有窗口
      windowManager.closeAllWindows();
      expect(uiStore.windowCount).toBe(0);
    });

    it('应支持窗口状态变更', async () => {
      const card = await editor.createCard({ name: '状态测试' });
      const windowId = windowManager.createCardWindow(card.id);

      // 最小化
      windowManager.minimizeWindow(windowId);
      expect(windowManager.getWindow(windowId)?.state).toBe('minimized');

      // 恢复
      windowManager.restoreWindow(windowId);
      expect(windowManager.getWindow(windowId)?.state).toBe('normal');

      // 折叠
      windowManager.toggleCollapse(windowId);
      expect(windowManager.getWindow(windowId)?.state).toBe('collapsed');

      // 再次切换回正常
      windowManager.toggleCollapse(windowId);
      expect(windowManager.getWindow(windowId)?.state).toBe('normal');
    });
  });

  describe('场景5: 错误处理', () => {
    it('应正确处理保存不存在的卡片', async () => {
      await expect(editor.saveCard('non-existent-id')).rejects.toThrow('Card not found');
    });

    it('应阻止关闭有未保存更改的卡片', async () => {
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
      expect(cardStore.isCardOpen(card.id)).toBe(true);
    });

    it('应在编辑器未就绪时抛出错误', async () => {
      const uninitializedEditor = createEditor();

      // 编辑器未初始化时操作会抛出错误（可能是 "Editor is not ready" 或 "SDK is not connected"）
      await expect(uninitializedEditor.createCard({ name: 'Test' })).rejects.toThrow();

      uninitializedEditor.destroy();
    });
  });
});
