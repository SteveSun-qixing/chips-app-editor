/**
 * 编辑器 Store 测试
 * @module tests/unit/core/state/editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEditorStore } from '@/core/state/stores/editor';

describe('useEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useEditorStore();
      expect(store.state).toBe('idle');
      expect(store.currentLayout).toBe('infinite-canvas');
      expect(store.isConnected).toBe(false);
      expect(store.debug).toBe(false);
      expect(store.autoSaveInterval).toBe(30000);
      expect(store.lastSaveTime).toBeNull();
      expect(store.hasUnsavedChanges).toBe(false);
      expect(store.error).toBeNull();
      expect(store.locale).toBe('zh-CN');
    });
  });

  describe('getters', () => {
    it('isReady should return true when state is ready', () => {
      const store = useEditorStore();
      expect(store.isReady).toBe(false);
      store.setState('ready');
      expect(store.isReady).toBe(true);
    });

    it('isInitializing should return true when state is initializing', () => {
      const store = useEditorStore();
      expect(store.isInitializing).toBe(false);
      store.setState('initializing');
      expect(store.isInitializing).toBe(true);
    });

    it('hasError should return true when error is set', () => {
      const store = useEditorStore();
      expect(store.hasError).toBe(false);
      store.setError(new Error('test error'));
      expect(store.hasError).toBe(true);
    });

    it('isDestroyed should return true when state is destroyed', () => {
      const store = useEditorStore();
      expect(store.isDestroyed).toBe(false);
      store.setState('destroyed');
      expect(store.isDestroyed).toBe(true);
    });

    it('canOperate should return true when ready and connected', () => {
      const store = useEditorStore();
      expect(store.canOperate).toBe(false);
      store.setState('ready');
      expect(store.canOperate).toBe(false);
      store.setConnected(true);
      expect(store.canOperate).toBe(true);
    });

    it('errorMessage should return error message', () => {
      const store = useEditorStore();
      expect(store.errorMessage).toBeNull();
      store.setError(new Error('test error'));
      expect(store.errorMessage).toBe('test error');
    });
  });

  describe('actions', () => {
    it('setState should update state', () => {
      const store = useEditorStore();
      store.setState('ready');
      expect(store.state).toBe('ready');
    });

    it('setLayout should update layout', () => {
      const store = useEditorStore();
      store.setLayout('workbench');
      expect(store.currentLayout).toBe('workbench');
    });

    it('setConnected should update connection status', () => {
      const store = useEditorStore();
      store.setConnected(true);
      expect(store.isConnected).toBe(true);
    });

    it('setDebug should update debug mode', () => {
      const store = useEditorStore();
      store.setDebug(true);
      expect(store.debug).toBe(true);
    });

    it('setAutoSaveInterval should update interval', () => {
      const store = useEditorStore();
      store.setAutoSaveInterval(60000);
      expect(store.autoSaveInterval).toBe(60000);
    });

    it('setLocale should update locale', () => {
      const store = useEditorStore();
      store.setLocale('en-US');
      expect(store.locale).toBe('en-US');
    });

    it('markUnsaved should set hasUnsavedChanges to true', () => {
      const store = useEditorStore();
      store.markUnsaved();
      expect(store.hasUnsavedChanges).toBe(true);
    });

    it('markSaved should set hasUnsavedChanges to false and update lastSaveTime', () => {
      const store = useEditorStore();
      store.markUnsaved();
      store.markSaved();
      expect(store.hasUnsavedChanges).toBe(false);
      expect(store.lastSaveTime).not.toBeNull();
    });

    it('setError should set error and change state to error', () => {
      const store = useEditorStore();
      const error = new Error('test error');
      store.setError(error);
      expect(store.error).toBe(error);
      expect(store.state).toBe('error');
    });

    it('clearError should clear error and restore state', () => {
      const store = useEditorStore();
      store.setError(new Error('test'));
      store.clearError();
      expect(store.error).toBeNull();
      expect(store.state).toBe('ready');
    });

    it('reset should reset all state', () => {
      const store = useEditorStore();
      store.setState('ready');
      store.setConnected(true);
      store.markUnsaved();
      store.setError(new Error('test'));
      store.reset();
      expect(store.state).toBe('idle');
      expect(store.isConnected).toBe(false);
      expect(store.hasUnsavedChanges).toBe(false);
      expect(store.error).toBeNull();
    });

    it('initialize should set initial options', () => {
      const store = useEditorStore();
      store.initialize({
        debug: true,
        currentLayout: 'workbench',
        autoSaveInterval: 60000,
        locale: 'en-US',
      });
      expect(store.debug).toBe(true);
      expect(store.currentLayout).toBe('workbench');
      expect(store.autoSaveInterval).toBe(60000);
      expect(store.locale).toBe('en-US');
      expect(store.state).toBe('initializing');
    });
  });
});
