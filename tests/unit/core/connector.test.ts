/**
 * SDK 连接器测试
 * @module tests/unit/core/connector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SDKConnector, createConnector } from '@/core/connector';
import { EventEmitter, createEventEmitter } from '@/core/event-manager';

describe('SDKConnector', () => {
  let connector: SDKConnector;
  let events: EventEmitter;

  beforeEach(() => {
    events = createEventEmitter();
    connector = new SDKConnector(events);
  });

  afterEach(() => {
    if (connector.connected) {
      connector.disconnect();
    }
  });

  describe('createConnector', () => {
    it('should create a new SDKConnector instance', () => {
      const instance = createConnector(events);
      expect(instance).toBeInstanceOf(SDKConnector);
    });

    it('should accept options', () => {
      const instance = createConnector(events, { debug: true });
      expect(instance).toBeInstanceOf(SDKConnector);
    });
  });

  describe('connect', () => {
    it('should connect to SDK', async () => {
      await connector.connect();
      expect(connector.connected).toBe(true);
    });

    it('should emit connector:connected event', async () => {
      const handler = vi.fn();
      events.on('connector:connected', handler);
      await connector.connect();
      expect(handler).toHaveBeenCalled();
    });

    it('should throw if already connected', async () => {
      await connector.connect();
      await expect(connector.connect()).rejects.toThrow('SDK already connected');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from SDK', async () => {
      await connector.connect();
      connector.disconnect();
      expect(connector.connected).toBe(false);
    });

    it('should emit connector:disconnected event', async () => {
      await connector.connect();
      const handler = vi.fn();
      events.on('connector:disconnected', handler);
      connector.disconnect();
      expect(handler).toHaveBeenCalled();
    });

    it('should do nothing if not connected', () => {
      expect(() => connector.disconnect()).not.toThrow();
    });

    it('should allow reconnect after disconnect', async () => {
      await connector.connect();
      connector.disconnect();
      await connector.connect();

      expect(connector.connected).toBe(true);
      expect(() => connector.getSDK()).not.toThrow();
    });
  });

  describe('getSDK', () => {
    it('should return SDK instance when connected', async () => {
      await connector.connect();
      const sdk = connector.getSDK();
      expect(sdk).toBeDefined();
      expect(sdk.version).toBe('1.0.0');
    });

    it('should throw if not connected', () => {
      expect(() => connector.getSDK()).toThrow('SDK not connected');
    });
  });

  describe('connected', () => {
    it('should return false initially', () => {
      expect(connector.connected).toBe(false);
    });

    it('should return true after connection', async () => {
      await connector.connect();
      expect(connector.connected).toBe(true);
    });
  });

  describe('SDK operations', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it('should create card', async () => {
      const sdk = connector.getSDK();
      const card = await sdk.card.create({ name: 'Test Card' });
      expect(card.id).toBeDefined();
      expect(card.metadata.name).toBe('Test Card');
    });

    it('should get card', async () => {
      const sdk = connector.getSDK();
      const card = await sdk.card.get('test123');
      expect(card.id).toBe('test123');
    });

    it('should save card', async () => {
      const sdk = connector.getSDK();
      const card = await sdk.card.create({ name: 'Test Card' });
      await expect(sdk.card.save('/path/to/card.card', card)).resolves.not.toThrow();
    });

    it('should delete card', async () => {
      const sdk = connector.getSDK();
      await expect(sdk.card.delete('test123')).resolves.not.toThrow();
    });

    it('should create box', async () => {
      const sdk = connector.getSDK();
      const box = await sdk.box.create({ name: 'Test Box' });
      expect(box.id).toBeDefined();
      expect(box.metadata.name).toBe('Test Box');
    });

    it('should get box', async () => {
      const sdk = connector.getSDK();
      const box = await sdk.box.get('box123');
      expect(box.id).toBe('box123');
    });
  });

  describe('SDK events', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it('should support event subscription', () => {
      const sdk = connector.getSDK();
      const handler = vi.fn();
      const id = sdk.on('test-event', handler);
      expect(id).toBeDefined();
    });

    it('should support event unsubscription', () => {
      const sdk = connector.getSDK();
      const handler = vi.fn();
      const id = sdk.on('test-event', handler);
      expect(() => sdk.off('test-event', id)).not.toThrow();
    });
  });
});
