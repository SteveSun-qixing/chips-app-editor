/**
 * 插件初始化事件监听器
 * @module utils/plugin-init
 * @description 监听 Chips Host 发送的 chips:plugin-init 事件
 *
 * Bridge preload 脚本在收到 chips:plugin-init IPC 消息后，
 * 通过 window.dispatchEvent(new CustomEvent('chips:plugin-init', { detail }))
 * 将初始化载荷传递给插件应用。
 *
 * 必须在 Vue app mount 之前调用 ensurePluginInitListener()，
 * 以确保不会错过早期的初始化事件。
 */

import type { PluginInitPayload } from '@/types/plugin-init';

const PLUGIN_INIT_EVENT = 'chips:plugin-init';

type PluginInitListener = (payload: PluginInitPayload) => void;

const listeners = new Set<PluginInitListener>();
let pendingPayload: PluginInitPayload | null = null;
let attached = false;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function parsePluginInitPayload(payload: unknown): PluginInitPayload | null {
  const record = toRecord(payload);
  if (!record) {
    return null;
  }

  const pluginId = typeof record.pluginId === 'string' ? record.pluginId : undefined;
  const timestamp = typeof record.timestamp === 'number' ? record.timestamp : undefined;
  const launchParamsRecord = toRecord(record.launchParams);

  return {
    ...(pluginId ? { pluginId } : {}),
    ...(launchParamsRecord
      ? {
          launchParams: {
            ...(typeof launchParamsRecord.reason === 'string'
              ? { reason: launchParamsRecord.reason }
              : {}),
            ...(typeof launchParamsRecord.source === 'string'
              ? { source: launchParamsRecord.source }
              : {}),
            ...(typeof launchParamsRecord.requestedAt === 'string'
              ? { requestedAt: launchParamsRecord.requestedAt }
              : {}),
            ...(typeof launchParamsRecord.workspaceRoot === 'string'
              ? { workspaceRoot: launchParamsRecord.workspaceRoot }
              : {}),
            ...(typeof launchParamsRecord.externalRoot === 'string'
              ? { externalRoot: launchParamsRecord.externalRoot }
              : {}),
            ...(toRecord(launchParamsRecord.file)
              ? {
                  file: {
                    ...(typeof (launchParamsRecord.file as Record<string, unknown>).path ===
                    'string'
                      ? {
                          path: String(
                            (launchParamsRecord.file as Record<string, unknown>).path
                          ),
                        }
                      : {}),
                    ...(typeof (launchParamsRecord.file as Record<string, unknown>)
                      .extension === 'string'
                      ? {
                          extension: String(
                            (launchParamsRecord.file as Record<string, unknown>).extension
                          ),
                        }
                      : {}),
                    ...(typeof (launchParamsRecord.file as Record<string, unknown>).kind ===
                    'string'
                      ? {
                          kind: String(
                            (launchParamsRecord.file as Record<string, unknown>).kind
                          ),
                        }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(typeof timestamp === 'number' ? { timestamp } : {}),
  };
}

/**
 * 从插件初始化载荷中提取启动文件路径
 */
export function extractLaunchFilePath(payload: PluginInitPayload): string | null {
  const rawPath = payload.launchParams?.file?.path;
  if (typeof rawPath !== 'string') {
    return null;
  }
  const normalized = rawPath.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * 从插件初始化载荷中提取工作区根路径
 */
export function extractWorkspaceRoot(payload: PluginInitPayload): string | null {
  const rawPath = payload.launchParams?.workspaceRoot;
  if (typeof rawPath !== 'string') {
    return null;
  }
  const normalized = rawPath.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * 从插件初始化载荷中提取外部环境根路径
 */
export function extractExternalRoot(payload: PluginInitPayload): string | null {
  const rawPath = payload.launchParams?.externalRoot;
  if (typeof rawPath !== 'string') {
    return null;
  }
  const normalized = rawPath.trim();
  return normalized.length > 0 ? normalized : null;
}

function dispatchPluginInit(payload: PluginInitPayload): void {
  if (listeners.size === 0) {
    pendingPayload = payload;
    return;
  }

  for (const listener of listeners) {
    listener(payload);
  }
}

function handlePluginInitEvent(event: Event): void {
  const customEvent = event as CustomEvent<unknown>;
  const parsed = parsePluginInitPayload(customEvent.detail);
  if (!parsed) {
    return;
  }
  dispatchPluginInit(parsed);
}

/**
 * 确保插件初始化事件监听器已注册
 * 必须在 Vue app mount 之前调用
 */
export function ensurePluginInitListener(): void {
  if (attached || typeof window === 'undefined') {
    return;
  }

  window.addEventListener(PLUGIN_INIT_EVENT, handlePluginInitEvent as EventListener);
  attached = true;
}

/**
 * 订阅插件初始化事件
 * 如果事件已经触发但尚未被消费，会立即回调
 */
export function subscribePluginInit(listener: PluginInitListener): () => void {
  ensurePluginInitListener();
  listeners.add(listener);

  if (pendingPayload) {
    const payload = pendingPayload;
    pendingPayload = null;
    listener(payload);
  }

  return () => {
    listeners.delete(listener);
  };
}

/**
 * 重置插件初始化状态（用于测试）
 */
export function __resetPluginInitForTests(): void {
  listeners.clear();
  pendingPayload = null;

  if (attached && typeof window !== 'undefined') {
    window.removeEventListener(PLUGIN_INIT_EVENT, handlePluginInitEvent as EventListener);
  }

  attached = false;
}
