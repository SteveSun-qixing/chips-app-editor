/**
 * 事件管理器测试
 * @module tests/unit/core/event-manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, createEventEmitter } from '@/core/event-manager';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = createEventEmitter();
  });

  describe('createEventEmitter', () => {
    it('should create a new EventEmitter instance', () => {
      const instance = createEventEmitter();
      expect(instance).toBeInstanceOf(EventEmitter);
    });
  });

  describe('on', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit('test', { data: 'value' });
      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should return subscription id', () => {
      const id = emitter.on('test', () => {});
      expect(id).toMatch(/^sub-\d+$/);
    });

    it('should allow multiple handlers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test', { data: 'value' });
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not trigger handlers for different events', () => {
      const handler = vi.fn();
      emitter.on('test1', handler);
      emitter.emit('test2', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire once', () => {
      const handler = vi.fn();
      emitter.once('test', handler);
      emitter.emit('test', {});
      emitter.emit('test', {});
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return subscription id', () => {
      const id = emitter.once('test', () => {});
      expect(id).toMatch(/^sub-\d+$/);
    });
  });

  describe('off', () => {
    it('should unsubscribe by id', () => {
      const handler = vi.fn();
      const id = emitter.on('test', handler);
      emitter.off('test', id);
      emitter.emit('test', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('should unsubscribe by handler', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.off('test', handler);
      emitter.emit('test', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all handlers for an event type when no handler specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.off('test');
      emitter.emit('test', {});
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should do nothing when event type does not exist', () => {
      expect(() => emitter.off('nonexistent')).not.toThrow();
    });
  });

  describe('emit', () => {
    it('should emit events with data', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      const data = { key: 'value', number: 42 };
      emitter.emit('test', data);
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should support wildcard subscriptions', () => {
      const wildcardHandler = vi.fn();
      const specificHandler = vi.fn();
      emitter.on('*', wildcardHandler);
      emitter.on('test', specificHandler);
      emitter.emit('test', { data: 'value' });
      expect(wildcardHandler).toHaveBeenCalledWith({ data: 'value' });
      expect(specificHandler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should catch handler errors and continue', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();
      
      emitter.on('test', errorHandler);
      emitter.on('test', normalHandler);
      
      // Should not throw
      expect(() => emitter.emit('test', {})).not.toThrow();
      
      // Both handlers should be called
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });

  describe('waitFor', () => {
    it('should resolve when event fires', async () => {
      setTimeout(() => {
        emitter.emit('test', { value: 42 });
      }, 10);

      const result = await emitter.waitFor<{ value: number }>('test');
      expect(result.value).toBe(42);
    });

    it('should reject on timeout', async () => {
      await expect(emitter.waitFor('test', 50)).rejects.toThrow('Timeout waiting for event: test');
    });

    it('should only resolve with the first event', async () => {
      setTimeout(() => {
        emitter.emit('test', { value: 1 });
        emitter.emit('test', { value: 2 });
      }, 10);

      const result = await emitter.waitFor<{ value: number }>('test');
      expect(result.value).toBe(1);
    });
  });

  describe('hasListeners', () => {
    it('should return true when there are listeners', () => {
      emitter.on('test', () => {});
      expect(emitter.hasListeners('test')).toBe(true);
    });

    it('should return false when there are no listeners', () => {
      expect(emitter.hasListeners('test')).toBe(false);
    });

    it('should return false after all listeners are removed', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.off('test', handler);
      expect(emitter.hasListeners('test')).toBe(false);
    });
  });

  describe('listenerCount', () => {
    it('should return the correct count', () => {
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      expect(emitter.listenerCount('test')).toBe(2);
    });

    it('should return 0 when no listeners', () => {
      expect(emitter.listenerCount('test')).toBe(0);
    });
  });

  describe('eventNames', () => {
    it('should return all event types', () => {
      emitter.on('event1', () => {});
      emitter.on('event2', () => {});
      const names = emitter.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
    });

    it('should return empty array when no events', () => {
      expect(emitter.eventNames()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.clear();
      emitter.emit('event1', {});
      emitter.emit('event2', {});
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.removeAllListeners('event1');
      emitter.emit('event1', {});
      emitter.emit('event2', {});
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.removeAllListeners();
      emitter.emit('event1', {});
      emitter.emit('event2', {});
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
