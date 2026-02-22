/**
 * Mock Bridge API for testing
 * @module tests/helpers/mock-bridge
 * @description 提供 window.chips Bridge API 的完整 mock
 */

import { vi } from 'vitest';
import type { ChipsBridgeAPI } from '@/types/bridge';

const eventHandlers = new Map<string, Set<(payload: unknown) => void>>();

export function createMockBridge(): ChipsBridgeAPI {
  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
      return () => {
        eventHandlers.get(event)?.delete(handler);
      };
    }),
    once: vi.fn((event: string, handler: (payload: unknown) => void) => {
      const wrapper = (payload: unknown) => {
        eventHandlers.get(event)?.delete(wrapper);
        handler(payload);
      };
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(wrapper);
      return () => {
        eventHandlers.get(event)?.delete(wrapper);
      };
    }),
    emit: vi.fn((event: string, data?: unknown) => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    }),
    window: {
      close: vi.fn().mockResolvedValue(undefined),
      minimize: vi.fn().mockResolvedValue(undefined),
      maximize: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
      setTitle: vi.fn().mockResolvedValue(undefined),
      setSize: vi.fn().mockResolvedValue(undefined),
      getSize: vi.fn().mockResolvedValue({ width: 1400, height: 900 }),
      setPosition: vi.fn().mockResolvedValue(undefined),
      getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
      setFullScreen: vi.fn().mockResolvedValue(undefined),
      isFullScreen: vi.fn().mockResolvedValue(false),
      setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
      openPlugin: vi.fn().mockResolvedValue(undefined),
      getInfo: vi.fn().mockResolvedValue({
        id: 'mock-window',
        title: 'Mock',
        bounds: { x: 0, y: 0, width: 1400, height: 900 },
        isFullScreen: false,
        isMaximized: false,
        isMinimized: false,
      }),
    },
    dialog: {
      showOpenDialog: vi.fn().mockResolvedValue(null),
      showSaveDialog: vi.fn().mockResolvedValue(null),
      showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
    },
    plugin: {
      getSelf: vi.fn().mockResolvedValue({
        id: 'chips-official.editor',
        version: '1.0.0',
        type: 'app',
        installPath: '/mock/plugins/editor',
      }),
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      getCardPlugin: vi.fn().mockResolvedValue(null),
      getLayoutPlugin: vi.fn().mockResolvedValue(null),
    },
    clipboard: {
      readText: vi.fn().mockResolvedValue(''),
      writeText: vi.fn().mockResolvedValue(undefined),
      readHTML: vi.fn().mockResolvedValue(''),
      writeHTML: vi.fn().mockResolvedValue(undefined),
      readImage: vi.fn().mockResolvedValue(null),
      writeImage: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    shell: {
      openPath: vi.fn().mockResolvedValue(undefined),
      showItemInFolder: vi.fn().mockResolvedValue(undefined),
      openExternal: vi.fn().mockResolvedValue(undefined),
      beep: vi.fn().mockResolvedValue(undefined),
    },
  };
}

let mockBridgeInstance: ChipsBridgeAPI | null = null;

export function installMockBridge(): void {
  mockBridgeInstance = createMockBridge();
  (window as any).chips = mockBridgeInstance;
}

export function getMockBridge(): ChipsBridgeAPI {
  if (!mockBridgeInstance) {
    installMockBridge();
  }
  return mockBridgeInstance!;
}

export function resetMockBridge(): void {
  eventHandlers.clear();
  if (mockBridgeInstance) {
    mockBridgeInstance = createMockBridge();
    (window as any).chips = mockBridgeInstance;
  }
}
