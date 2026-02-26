/**
 * Mock Bridge API for testing
 * @module tests/helpers/mock-bridge
 * @description 提供 window.chips Bridge API 的完整 mock
 */

import { vi } from 'vitest';
import type { ChipsBridgeAPI } from '@chips/sdk';

const eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
const mockFiles = new Map<string, string>();
const mockDirectories = new Set<string>();

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  if (index <= 0) {
    return '/';
  }
  return normalized.slice(0, index);
}

function ensureDirectory(path: string): void {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  let current = '';
  for (const segment of segments) {
    current = `${current}/${segment}`;
    mockDirectories.add(current || '/');
  }
}

function listEntries(path: string): Array<{ name: string; type: 'file' | 'directory' }> {
  const normalized = normalizePath(path);
  const prefix = normalized === '/' ? '/' : `${normalized}/`;
  const entries = new Map<string, 'file' | 'directory'>();

  for (const directory of mockDirectories) {
    if (!directory.startsWith(prefix) || directory === normalized) {
      continue;
    }
    const relative = directory.slice(prefix.length);
    if (!relative || relative.includes('/')) {
      continue;
    }
    entries.set(relative, 'directory');
  }

  for (const filePath of mockFiles.keys()) {
    if (!filePath.startsWith(prefix)) {
      continue;
    }
    const relative = filePath.slice(prefix.length);
    if (!relative || relative.includes('/')) {
      continue;
    }
    entries.set(relative, 'file');
  }

  return Array.from(entries.entries()).map(([name, type]) => ({ name, type }));
}

export function createMockBridge(): ChipsBridgeAPI {
  mockDirectories.add('/');

  return {
    invoke: vi.fn(async (namespace: string, action: string, params?: Record<string, unknown>) => {
      if (namespace === 'serializer' && action === 'stringifyYaml') {
        return {
          text: JSON.stringify(params?.data ?? {}),
        };
      }

      if (namespace !== 'file') {
        return {};
      }

      if (action === 'exists') {
        const path = normalizePath(String(params?.path ?? ''));
        return {
          exists: mockFiles.has(path) || mockDirectories.has(path),
        };
      }

      if (action === 'mkdir') {
        const path = normalizePath(String(params?.path ?? ''));
        ensureDirectory(path);
        return {};
      }

      if (action === 'write') {
        const path = normalizePath(String(params?.path ?? ''));
        ensureDirectory(dirname(path));
        mockFiles.set(path, String(params?.content ?? ''));
        return {};
      }

      if (action === 'read') {
        const path = normalizePath(String(params?.path ?? ''));
        const encoding = String(params?.encoding ?? 'utf8');
        const content = mockFiles.get(path) ?? '';
        return {
          content,
          encoding,
          size: content.length,
        };
      }

      if (action === 'list') {
        const path = normalizePath(String(params?.path ?? ''));
        return {
          entries: listEntries(path),
        };
      }

      if (action === 'stat') {
        const path = normalizePath(String(params?.path ?? ''));
        if (mockFiles.has(path)) {
          const content = mockFiles.get(path) ?? '';
          return {
            size: content.length,
            isFile: true,
            isDirectory: false,
            modified: new Date().toISOString(),
            created: new Date().toISOString(),
          };
        }

        if (mockDirectories.has(path)) {
          return {
            size: 0,
            isFile: false,
            isDirectory: true,
            modified: new Date().toISOString(),
            created: new Date().toISOString(),
          };
        }

        return {
          size: 0,
          isFile: false,
          isDirectory: false,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
        };
      }

      if (action === 'delete') {
        const path = normalizePath(String(params?.path ?? ''));
        mockFiles.delete(path);
        mockDirectories.delete(path);
        return {};
      }

      if (action === 'copy' || action === 'move') {
        const source = normalizePath(String(params?.source ?? ''));
        const target = normalizePath(String(params?.target ?? ''));
        const content = mockFiles.get(source) ?? '';
        ensureDirectory(dirname(target));
        mockFiles.set(target, content);
        if (action === 'move') {
          mockFiles.delete(source);
        }
        return {};
      }

      return {};
    }),
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
        pluginId: 'chips-official.editor',
        windowId: 1,
        bounds: { x: 0, y: 0, width: 1400, height: 900 },
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
      getCardRuntimeContext: vi.fn().mockResolvedValue(null),
      resolveFileUrl: vi.fn().mockResolvedValue(''),
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
  mockFiles.clear();
  mockDirectories.clear();
  if (mockBridgeInstance) {
    mockBridgeInstance = createMockBridge();
    (window as any).chips = mockBridgeInstance;
  }
}
