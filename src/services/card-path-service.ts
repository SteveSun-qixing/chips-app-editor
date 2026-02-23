function normalizePath(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\\/g, '/');
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path);
}

function joinPath(base: string, relative: string): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanRelative = relative.replace(/^\/+/, '');
  return cleanRelative ? `${cleanBase}/${cleanRelative}` : cleanBase;
}

function stripCardSuffix(cardId: string): string {
  return cardId.replace(/\.card$/i, '');
}

function resolvePathWithWorkspace(path: string, workspaceRoot: string): string {
  if (!path || !workspaceRoot || isAbsolutePath(path)) {
    return path;
  }

  const workspaceName = workspaceRoot.split('/').filter(Boolean).pop() ?? '';
  if (workspaceName && (path === workspaceName || path.startsWith(`${workspaceName}/`))) {
    const remainder = path.slice(workspaceName.length).replace(/^\/+/, '');
    return joinPath(workspaceRoot, remainder);
  }

  return joinPath(workspaceRoot, path);
}

export function resolveCardPath(
  cardId?: string | null,
  filePath?: string | null,
  workspaceRoot?: string | null,
): string {
  const directPath = normalizePath(filePath);
  const normalizedWorkspaceRoot = normalizePath(workspaceRoot);
  if (directPath) {
    return resolvePathWithWorkspace(directPath, normalizedWorkspaceRoot);
  }

  const normalizedCardId = normalizePath(cardId);
  if (!normalizedCardId) {
    return '';
  }

  if (normalizedWorkspaceRoot) {
    return joinPath(normalizedWorkspaceRoot, stripCardSuffix(normalizedCardId));
  }

  return stripCardSuffix(normalizedCardId);
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
