function normalizePath(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\\/g, '/');
}

function toRootRelative(path: string): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return '';
  }

  const rootPrefix = normalizedPath.split('/').slice(0, -1).join('/');
  if (rootPrefix && normalizedPath.startsWith(`${rootPrefix}/`)) {
    return normalizedPath.slice(rootPrefix.length + 1);
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath.slice(1);
  }

  return normalizedPath;
}

export function resolveCardPath(
  cardId?: string | null,
  filePath?: string | null,
  workspaceRoot?: string | null,
): string {
  const directPath = normalizePath(filePath);
  if (directPath) {
    return directPath;
  }

  const normalizedCardId = normalizePath(cardId);
  if (!normalizedCardId) {
    return '';
  }

  const normalizedWorkspaceRoot = normalizePath(workspaceRoot);
  if (normalizedWorkspaceRoot) {
    const workspaceRootRelative = toRootRelative(normalizedWorkspaceRoot);
    if (workspaceRootRelative) {
      return `${workspaceRootRelative}/${normalizedCardId}.card`;
    }
  }

  return `${normalizedCardId}.card`;
}

export function requireCardPath(
  cardId?: string | null,
  filePath?: string | null,
  context: string = 'card operation',
  workspaceRoot?: string | null,
): string {
  const resolved = resolveCardPath(cardId, filePath, workspaceRoot);
  if (resolved) {
    return resolved;
  }

  throw new Error(`[CardPath] Missing card path for ${context}`);
}
