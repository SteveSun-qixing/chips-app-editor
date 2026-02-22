import { vi } from 'vitest';

type EntryType = 'file' | 'dir';
interface Entry {
  type: EntryType;
  content?: string;
  modified?: string;
}

const ROOT = '/ProductFinishedProductTestingSpace';
const WORKSPACE_ROOT = `${ROOT}/TestWorkspace`;
const EXTERNAL_ROOT = `${ROOT}/ExternalEnvironment`;

let store = new Map<string, Entry>();

function normalize(path: string): string {
  if (!path) return ROOT;
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function toAbsolute(path: string): string {
  if (path.startsWith(ROOT + '/')) return normalize(path);
  if (path.startsWith('/')) return normalize(`${ROOT}${path}`);
  return normalize(`${ROOT}/${path}`);
}

function ensureDir(path: string): void {
  const abs = toAbsolute(path);
  const segments = abs.split('/').filter(Boolean);
  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    if (!store.has(current)) {
      store.set(current, { type: 'dir', modified: new Date().toISOString() });
    }
  }
}

function reset(): void {
  store = new Map();
  ensureDir(ROOT);
  ensureDir(WORKSPACE_ROOT);
  ensureDir(EXTERNAL_ROOT);
}

reset();

function list(path: string): string[] {
  const abs = toAbsolute(path);
  const entry = store.get(abs);
  if (!entry || entry.type !== 'dir') return [];

  const prefix = `${abs}/`;
  const children = new Set<string>();
  for (const key of store.keys()) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    if (!rest || rest.includes('/')) continue;
    children.add(rest);
  }
  return Array.from(children.values());
}

function exists(path: string): boolean {
  const abs = toAbsolute(path);
  return store.has(abs);
}

function metadata(path: string) {
  const abs = toAbsolute(path);
  const entry = store.get(abs);
  if (!entry) {
    return {
      path: abs,
      exists: false,
      isDirectory: false,
      isFile: false,
      size: 0,
      modified: undefined,
    };
  }
  return {
    path: abs,
    exists: true,
    isDirectory: entry.type === 'dir',
    isFile: entry.type === 'file',
    size: entry.content ? entry.content.length : 0,
    modified: entry.modified || new Date().toISOString(),
  };
}

function writeText(path: string, content: string): void {
  const abs = toAbsolute(path);
  const dir = abs.split('/').slice(0, -1).join('/') || '/';
  ensureDir(dir);
  store.set(abs, { type: 'file', content, modified: new Date().toISOString() });
}

function readText(path: string): string {
  const abs = toAbsolute(path);
  const entry = store.get(abs);
  if (!entry || entry.type !== 'file') {
    throw new Error('File not found');
  }
  return entry.content ?? '';
}

function remove(path: string): void {
  const abs = toAbsolute(path);
  const entry = store.get(abs);
  if (!entry) return;
  if (entry.type === 'file') {
    store.delete(abs);
    return;
  }
  const prefix = `${abs}/`;
  for (const key of Array.from(store.keys())) {
    if (key === abs || key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

function copy(sourcePath: string, destPath: string): void {
  const source = toAbsolute(sourcePath);
  const dest = toAbsolute(destPath);
  const entry = store.get(source);
  if (!entry) {
    throw new Error('Source not found');
  }

  const entries = Array.from(store.entries());
  for (const [key, value] of entries) {
    if (key === source || key.startsWith(`${source}/`)) {
      const suffix = key.slice(source.length);
      const target = `${dest}${suffix}`;
      if (value.type === 'dir') {
        ensureDir(target);
      } else {
        writeText(target, value.content ?? '');
      }
    }
  }
}

function move(sourcePath: string, destPath: string): void {
  copy(sourcePath, destPath);
  remove(sourcePath);
}

export const resourceServiceMock = {
  workspaceRoot: WORKSPACE_ROOT,
  externalRoot: EXTERNAL_ROOT,
  readText: async (path: string) => readText(path),
  writeText: async (path: string, content: string) => writeText(path, content),
  ensureDir: async (path: string) => ensureDir(path),
  exists: async (path: string) => exists(path),
  delete: async (path: string) => remove(path),
  list: async (path: string) => list(path),
  metadata: async (path: string) => metadata(path),
  copy: async (sourcePath: string, destPath: string) => copy(sourcePath, destPath),
  move: async (sourcePath: string, destPath: string) => move(sourcePath, destPath),
  getCardFiles: async (_path: string) => [],
  convertToHTML: async () => ({ success: true, taskId: 'mock', outputPath: '' }),
  convertToPDF: async () => ({ success: true, taskId: 'mock', outputPath: '' }),
  convertToImage: async () => ({ success: true, taskId: 'mock', outputPath: '' }),
  exportCard: async () => ({ success: true, taskId: 'mock', outputPath: '' }),
};

export function resetResourceServiceMock(): void {
  reset();
}

vi.stubGlobal('__RESOURCE_SERVICE_MOCK__', resourceServiceMock);
