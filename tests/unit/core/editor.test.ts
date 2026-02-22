/**
 * 编辑器主类测试
 * @module tests/unit/core/editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';

describe('ChipsEditor', () => {
  let editor: ChipsEditor;

  beforeEach(() => {
    setActivePinia(createPinia());
    editor = new ChipsEditor({
      layout: 'infinite-canvas',
      debug: true,
      autoSaveInterval: 0, // 禁用自动保存以便测试
    });
  });

  afterEach(() => {
    if (editor.state !== 'destroyed') {
      editor.destroy();
    }
  });

  describe('createEditor', () => {
    it('should create a new ChipsEditor instance', () => {
      const instance = createEditor();
      expect(instance).toBeInstanceOf(ChipsEditor);
      instance.destroy();
    });

    it('should accept configuration options', () => {
      const instance = createEditor({
        layout: 'workbench',
        debug: true,
        autoSaveInterval: 60000,
      });
      expect(instance.configuration.layout).toBe('workbench');
      expect(instance.configuration.debug).toBe(true);
      expect(instance.configuration.autoSaveInterval).toBe(60000);
      instance.destroy();
    });
  });

  describe('initialization', () => {
    it('should have idle state initially', () => {
      expect(editor.state).toBe('idle');
      expect(editor.isReady).toBe(false);
    });

    it('should initialize successfully', async () => {
      await editor.initialize();
      expect(editor.state).toBe('ready');
      expect(editor.isReady).toBe(true);
      expect(editor.isConnected).toBe(true);
    });

    it('should throw if already initialized', async () => {
      await editor.initialize();
      await expect(editor.initialize()).rejects.toThrow('Editor already initialized');
    });

    it('should emit editor:ready event', async () => {
      const handler = vi.fn();
      editor.on('editor:ready', handler);
      await editor.initialize();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should destroy editor', async () => {
      await editor.initialize();
      editor.destroy();
      expect(editor.state).toBe('destroyed');
    });

    it('should emit editor:destroyed event', async () => {
      await editor.initialize();
      const handler = vi.fn();
      editor.on('editor:destroyed', handler);
      editor.destroy();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('card operations', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('should create card', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      expect(card.id).toBeDefined();
      expect(card.metadata.name).toBe('Test Card');
    });

    it('should emit card:created event', async () => {
      const handler = vi.fn();
      editor.on('card:created', handler);
      await editor.createCard({ name: 'Test Card' });
      expect(handler).toHaveBeenCalled();
    });

    it('should open card', async () => {
      const card = await editor.openCard('test123');
      expect(card.id).toBe('test123');
    });

    it('should emit card:opened event', async () => {
      const handler = vi.fn();
      editor.on('card:opened', handler);
      await editor.openCard('test123');
      expect(handler).toHaveBeenCalled();
    });

    it('should not re-open already opened card', async () => {
      await editor.openCard('test123');
      const handler = vi.fn();
      editor.on('card:opened', handler);
      await editor.openCard('test123');
      // Should not emit second open event
      expect(handler).not.toHaveBeenCalled();
    });

    it('should save card', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      await expect(editor.saveCard(card.id)).resolves.not.toThrow();
    });

    it('should emit card:saved event', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      const handler = vi.fn();
      editor.on('card:saved', handler);
      await editor.saveCard(card.id);
      expect(handler).toHaveBeenCalled();
    });

    it('should throw when saving non-existent card', async () => {
      await expect(editor.saveCard('nonexistent')).rejects.toThrow('Card not found');
    });

    it('should close card', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      const result = editor.closeCard(card.id, true);
      expect(result).toBe(true);
    });

    it('should emit card:closed event', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      const handler = vi.fn();
      editor.on('card:closed', handler);
      editor.closeCard(card.id, true);
      expect(handler).toHaveBeenCalled();
    });

    it('should not close card with unsaved changes without force', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      editor.stores.card.markCardModified(card.id);
      const result = editor.closeCard(card.id, false);
      expect(result).toBe(false);
    });

    it('should delete card', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      await expect(editor.deleteCard(card.id)).resolves.not.toThrow();
    });

    it('should emit card:deleted event', async () => {
      const card = await editor.createCard({ name: 'Test Card' });
      const handler = vi.fn();
      editor.on('card:deleted', handler);
      await editor.deleteCard(card.id);
      expect(handler).toHaveBeenCalled();
    });

    it('should save all cards', async () => {
      await editor.createCard({ name: 'Card 1' });
      await editor.createCard({ name: 'Card 2' });
      await expect(editor.saveAllCards()).resolves.not.toThrow();
    });
  });

  describe('layout operations', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('should set layout', () => {
      editor.setLayout('workbench');
      expect(editor.getLayout()).toBe('workbench');
    });

    it('should emit layout:changed event', () => {
      const handler = vi.fn();
      editor.on('layout:changed', handler);
      editor.setLayout('workbench');
      expect(handler).toHaveBeenCalledWith({ layout: 'workbench' });
    });
  });

  describe('window operations', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('should create window', () => {
      const handler = vi.fn();
      editor.on('window:created', handler);
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: 'Test Window',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });
      expect(handler).toHaveBeenCalled();
    });

    it('should close window', () => {
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: 'Test Window',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });
      const handler = vi.fn();
      editor.on('window:closed', handler);
      editor.closeWindow('win1');
      expect(handler).toHaveBeenCalled();
    });

    it('should focus window', () => {
      editor.createWindow({
        id: 'win1',
        type: 'card',
        title: 'Test Window',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      });
      const handler = vi.fn();
      editor.on('window:focused', handler);
      editor.focusWindow('win1');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('event system', () => {
    it('should subscribe to events with on', () => {
      const handler = vi.fn();
      const id = editor.on('test-event', handler);
      expect(id).toMatch(/^sub-\d+$/);
    });

    it('should subscribe once with once', () => {
      const handler = vi.fn();
      editor.once('test-event', handler);
      editor.emit('test-event', {});
      editor.emit('test-event', {});
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe with off', () => {
      const handler = vi.fn();
      const id = editor.on('test-event', handler);
      editor.off('test-event', id);
      editor.emit('test-event', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit events', () => {
      const handler = vi.fn();
      editor.on('test-event', handler);
      editor.emit('test-event', { data: 'value' });
      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should wait for events', async () => {
      setTimeout(() => {
        editor.emit('test-event', { value: 42 });
      }, 10);
      const result = await editor.waitFor<{ value: number }>('test-event');
      expect(result.value).toBe(42);
    });
  });

  describe('state access', () => {
    it('should return state', () => {
      expect(editor.state).toBe('idle');
    });

    it('should return isReady', () => {
      expect(editor.isReady).toBe(false);
    });

    it('should return isConnected', () => {
      expect(editor.isConnected).toBe(false);
    });

    it('should return hasUnsavedChanges', async () => {
      await editor.initialize();
      expect(editor.hasUnsavedChanges).toBe(false);
      await editor.createCard({ name: 'Test' });
      expect(editor.hasUnsavedChanges).toBe(true);
    });

    it('should return configuration', () => {
      expect(editor.configuration.layout).toBe('infinite-canvas');
      expect(editor.configuration.debug).toBe(true);
    });

    it('should return sdk when connected', async () => {
      await editor.initialize();
      expect(editor.sdk).toBeDefined();
    });

    it('should return stores', () => {
      expect(editor.stores.editor).toBeDefined();
      expect(editor.stores.card).toBeDefined();
      expect(editor.stores.ui).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw when operating before ready', async () => {
      await expect(editor.createCard({ name: 'Test' })).rejects.toThrow('Editor is not ready');
    });
  });
});
