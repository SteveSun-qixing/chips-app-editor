function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

interface WorkspaceBridge {
  invoke<TResponse = unknown>(namespace: string, action: string, params?: unknown): Promise<TResponse>;
}

export function normalizeBridgePath(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\\/g, '/');
}

export function extractWorkspaceRootFromResponse(response: unknown): string {
  const directPath = normalizeBridgePath(response);
  if (directPath) {
    return directPath;
  }

  const record = toRecord(response);
  if (!record) {
    return '';
  }

  const workspacePath = normalizeBridgePath(record.path);
  if (workspacePath) {
    return workspacePath;
  }

  return '';
}

export async function resolveWorkspaceRootFromBridge(bridge?: WorkspaceBridge): Promise<string> {
  if (!bridge) {
    return '';
  }

  try {
    const response = await bridge.invoke<unknown>('workspace', 'get', {});
    return extractWorkspaceRootFromResponse(response);
  } catch {
    return '';
  }
}
