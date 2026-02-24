function normalizePath(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\\/g, '/');
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:\//.test(path);
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '');
}

function joinPath(base: string, segment: string): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedSegment = stripLeadingSlash(segment);
  if (!normalizedBase) {
    return normalizedSegment;
  }
  if (!normalizedSegment) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedSegment}`;
}

function resolveFromWorkspaceRoot(path: string, workspaceRoot: string): string {
  const normalizedWorkspaceRoot = normalizePath(workspaceRoot).replace(/\/+$/, '');
  if (!normalizedWorkspaceRoot) {
    return path;
  }

  if (isAbsolutePath(path)) {
    return path;
  }

  const workspaceParent = normalizedWorkspaceRoot.split('/').slice(0, -1).join('/');
  const workspaceFolder = normalizedWorkspaceRoot.split('/').pop() ?? '';

  if (!workspaceParent || !workspaceFolder) {
    return joinPath(normalizedWorkspaceRoot, path);
  }

  if (path.startsWith(`${workspaceFolder}/`)) {
    return joinPath(workspaceParent, path);
  }

  return joinPath(normalizedWorkspaceRoot, path);
}

export function resolveCardPath(
  cardId?: string | null,
  filePath?: string | null,
  workspaceRoot?: string | null,
): string {
  const directPath = normalizePath(filePath);
  if (directPath) {
    const normalizedWorkspaceRoot = normalizePath(workspaceRoot);
    if (normalizedWorkspaceRoot) {
      return resolveFromWorkspaceRoot(directPath, normalizedWorkspaceRoot);
    }
    return directPath;
  }

  const normalizedCardId = normalizePath(cardId);
  if (!normalizedCardId) {
    return '';
  }

  const normalizedWorkspaceRoot = normalizePath(workspaceRoot);
  if (normalizedWorkspaceRoot) {
    const workspaceFolder = normalizedWorkspaceRoot.split('/').pop();
    if (workspaceFolder) {
      return resolveFromWorkspaceRoot(
        `${workspaceFolder}/${normalizedCardId}.card`,
        normalizedWorkspaceRoot
      );
    }
    return resolveFromWorkspaceRoot(`${normalizedCardId}.card`, normalizedWorkspaceRoot);
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
