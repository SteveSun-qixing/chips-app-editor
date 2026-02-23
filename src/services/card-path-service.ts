function normalizePath(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path);
}

function trimTrailingSlash(path: string): string {
  if (path === '/') {
    return path;
  }
  return path.replace(/\/+$/, '');
}

function joinPath(base: string, relative: string): string {
  const cleanBase = trimTrailingSlash(base);
  const cleanRelative = relative.replace(/^\/+/, '');
  return cleanRelative ? `${cleanBase}/${cleanRelative}` : cleanBase;
}

function stripCardSuffix(cardId: string): string {
  return cardId.replace(/\.card$/i, '');
}

function resolvePathWithWorkspace(path: string, workspaceRoot: string): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return '';
  }

  if (isAbsolutePath(normalizedPath)) {
    return normalizedPath;
  }

  const normalizedWorkspaceRoot = trimTrailingSlash(normalizePath(workspaceRoot));
  if (!normalizedWorkspaceRoot || !isAbsolutePath(normalizedWorkspaceRoot)) {
    return '';
  }

  const workspaceName = normalizedWorkspaceRoot.split('/').filter(Boolean).pop() ?? '';
  if (workspaceName && (normalizedPath === workspaceName || normalizedPath.startsWith(`${workspaceName}/`))) {
    const remainder = normalizedPath.slice(workspaceName.length).replace(/^\/+/, '');
    return joinPath(normalizedWorkspaceRoot, remainder);
  }

  return joinPath(normalizedWorkspaceRoot, normalizedPath);
}

function resolveCardIdPath(cardId: string, workspaceRoot: string): string {
  const normalizedCardId = stripCardSuffix(normalizePath(cardId));
  if (!normalizedCardId) {
    return '';
  }
  return resolvePathWithWorkspace(normalizedCardId, workspaceRoot);
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

  return resolveCardIdPath(normalizedCardId, normalizedWorkspaceRoot);
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
