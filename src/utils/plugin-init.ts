import { dirname } from 'path';
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

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveLaunchParams(record: Record<string, unknown>): Record<string, unknown> | null {
  return toRecord(record.launchParams);
}

function resolveLaunchFile(record: Record<string, unknown>): Record<string, unknown> | null {
  const launchParams = resolveLaunchParams(record);
  return launchParams ? toRecord(launchParams.file) : null;
}

function resolveWorkspaceFromLaunchParams(launchParams: Record<string, unknown>): string | null {
  const direct =
    toNonEmptyString(launchParams.workspaceRoot)
    ?? toNonEmptyString(launchParams.workspacePath);
  if (direct) {
    return direct;
  }

  const workspace = toRecord(launchParams.workspace);
  if (!workspace) {
    return null;
  }

  return toNonEmptyString(workspace.root) ?? toNonEmptyString(workspace.path) ?? null;
}

function resolveExternalFromLaunchParams(launchParams: Record<string, unknown>): string | null {
  const direct =
    toNonEmptyString(launchParams.externalRoot)
    ?? toNonEmptyString(launchParams.externalPath);
  if (direct) {
    return direct;
  }

  const external = toRecord(launchParams.external);
  if (!external) {
    return null;
  }

  return toNonEmptyString(external.root) ?? toNonEmptyString(external.path) ?? null;
}

export function parsePluginInitPayload(payload: unknown): PluginInitPayload | null {
  const record = toRecord(payload);
  if (!record) {
    return null;
  }

  const launchParamsRecord = resolveLaunchParams(record);
  const fileRecord = resolveLaunchFile(record);
  const workspaceRoot = launchParamsRecord
    ? resolveWorkspaceFromLaunchParams(launchParamsRecord)
    : null;
  const externalRoot = launchParamsRecord
    ? resolveExternalFromLaunchParams(launchParamsRecord)
    : null;

  const parsedLaunchParams = launchParamsRecord
    ? {
        ...(toNonEmptyString(launchParamsRecord.reason)
          ? { reason: toNonEmptyString(launchParamsRecord.reason) }
          : {}),
        ...(toNonEmptyString(launchParamsRecord.source)
          ? { source: toNonEmptyString(launchParamsRecord.source) }
          : {}),
        ...(toNonEmptyString(launchParamsRecord.requestedAt)
          ? { requestedAt: toNonEmptyString(launchParamsRecord.requestedAt) }
          : {}),
        ...(workspaceRoot
          ? { workspaceRoot }
          : {}),
        ...(externalRoot
          ? { externalRoot }
          : {}),
        ...(fileRecord
          ? {
              file: {
                ...(toNonEmptyString(fileRecord.path) ? { path: toNonEmptyString(fileRecord.path) } : {}),
                ...(toNonEmptyString(fileRecord.extension)
                  ? { extension: toNonEmptyString(fileRecord.extension) }
                  : {}),
                ...(toNonEmptyString(fileRecord.kind) ? { kind: toNonEmptyString(fileRecord.kind) } : {}),
              },
            }
          : {}),
      }
    : undefined;

  return {
    ...(toNonEmptyString(record.pluginId) ? { pluginId: toNonEmptyString(record.pluginId) } : {}),
    ...(parsedLaunchParams ? { launchParams: parsedLaunchParams } : {}),
    ...(typeof record.timestamp === 'number' ? { timestamp: record.timestamp } : {}),
  };
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

export function ensurePluginInitListener(): void {
  if (attached || typeof window === 'undefined') {
    return;
  }

  window.addEventListener(PLUGIN_INIT_EVENT, handlePluginInitEvent as EventListener);
  attached = true;
}

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

export function extractLaunchFilePath(payload: PluginInitPayload): string | null {
  const path = payload.launchParams?.file?.path;
  return typeof path === 'string' && path.trim().length > 0 ? path : null;
}

export function extractWorkspaceRoot(payload: PluginInitPayload): string | null {
  const workspaceRoot = payload.launchParams?.workspaceRoot;
  if (typeof workspaceRoot === 'string' && workspaceRoot.trim().length > 0) {
    return workspaceRoot;
  }

  return extractWorkspaceRootFromLaunchFile(payload);
}

export function extractExternalRoot(payload: PluginInitPayload): string | null {
  const externalRoot = payload.launchParams?.externalRoot;
  if (typeof externalRoot === 'string' && externalRoot.trim().length > 0) {
    return externalRoot;
  }

  return null;
}

export function extractWorkspaceRootFromLaunchFile(payload: PluginInitPayload): string | null {
  const launchFilePath = extractLaunchFilePath(payload);
  if (!launchFilePath) {
    return null;
  }

  return dirname(launchFilePath);
}

export function __resetPluginInitForTests(): void {
  listeners.clear();
  pendingPayload = null;

  if (attached && typeof window !== 'undefined') {
    window.removeEventListener(PLUGIN_INIT_EVENT, handlePluginInitEvent as EventListener);
  }

  attached = false;
}
