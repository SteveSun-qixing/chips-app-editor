/**
 * 工作区服务
 * @module core/workspace-service
 * @description 管理编辑器的内置工作区目录，所有文件都保存在这里
 */


import yaml from 'yaml';
import type { EventEmitter } from './event-manager';
import { createEventEmitter } from './event-manager';
import { createCardInitializer, type BasicCardConfig } from './card-initializer';
import { resourceService } from '@/services/resource-service';
import { generateId62 } from '@/utils';

/** 工作区文件信息 */
export interface WorkspaceFile {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 绝对路径 */
  path: string;
  /** 文件类型 */
  type: 'card' | 'box' | 'folder';
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 子文件（仅文件夹） */
  children?: WorkspaceFile[];
  /** 是否展开（仅文件夹） */
  expanded?: boolean;
}

/** 工作区状态 */
export interface WorkspaceState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 工作区根路径 */
  rootPath: string;
  /** 文件列表 */
  files: WorkspaceFile[];
  /** 当前打开的文件 ID 列表 */
  openedFiles: string[];
}

/** 工作区服务接口 */
export interface WorkspaceService {
  /** 工作区状态 */
  state: Readonly<WorkspaceState>;
  /** 文件列表 */
  files: WorkspaceFile[];
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 初始化工作区 */
  initialize: () => Promise<void>;
  /** 创建卡片 */
  createCard: (
    name: string,
    initialContent?: BasicCardConfig,
    cardId?: string,
    parentPath?: string
  ) => Promise<WorkspaceFile>;
  /** 创建箱子 */
  createBox: (name: string, layoutType?: string, parentPath?: string) => Promise<WorkspaceFile>;
  /** 创建文件夹 */
  createFolder: (name: string, parentPath?: string) => Promise<WorkspaceFile>;
  /** 获取文件 */
  getFile: (id: string) => WorkspaceFile | undefined;
  /** 删除文件 */
  deleteFile: (id: string) => Promise<void>;
  /** 重命名文件 */
  renameFile: (id: string, newName: string) => Promise<void>;
  /** 刷新文件列表 */
  refresh: () => Promise<void>;
  /** 获取已打开的文件 */
  getOpenedFiles: () => WorkspaceFile[];
  /** 打开文件 */
  openFile: (id: string) => void;
  /** 关闭文件 */
  closeFile: (id: string) => void;
  /** 通过路径打开文件 */
  openFileByPath: (filePath: string) => Promise<void>;
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
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

function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
}

function isPathInside(rootPath: string, candidatePath: string): boolean {
  if (!rootPath || !candidatePath) {
    return false;
  }
  if (candidatePath === rootPath) {
    return true;
  }
  return candidatePath.startsWith(`${rootPath}/`);
}

function resolveWorkspacePath(path: string, workspaceRoot: string): string {
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

  const workspaceFolder = normalizedWorkspaceRoot.split('/').filter(Boolean).pop() ?? '';
  if (
    workspaceFolder
    && (normalizedPath === workspaceFolder || normalizedPath.startsWith(`${workspaceFolder}/`))
  ) {
    const remainder = normalizedPath.slice(workspaceFolder.length).replace(/^\/+/, '');
    return joinPath(normalizedWorkspaceRoot, remainder);
  }

  return joinPath(normalizedWorkspaceRoot, normalizedPath);
}

function stripExtension(name: string, ext: string): string {
  if (name.toLowerCase().endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

function now(): string {
  return new Date().toISOString();
}

async function readMetadata(path: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await resourceService.readText(path);
    return yaml.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getMetadataString(metadata: Record<string, unknown> | null, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * 创建工作区服务
 * @param events - 事件发射器
 * @returns 工作区服务实例
 */
export function createWorkspaceService(events?: EventEmitter): WorkspaceService {
  const eventEmitter = events || createEventEmitter();

  /** 工作区绝对路径 */
  let workspaceRootPath = '';

  /** 工作区状态 */
  let state: WorkspaceState = {
    initialized: false,
    rootPath: '',
    files: [],
    openedFiles: [],
  };

  /** 文件列表 getter */
  function getFiles(): WorkspaceFile[] {
    return state.files;
  }

  /** 是否已初始化 getter */
  function getIsInitialized(): boolean {
    return state.initialized;
  }

  function resolveParentPath(parentPath?: string): string {
    if (!workspaceRootPath) {
      return '';
    }
    if (!parentPath) {
      return workspaceRootPath;
    }

    const resolvedPath = resolveWorkspacePath(parentPath, workspaceRootPath);
    if (!resolvedPath) {
      return workspaceRootPath;
    }

    return isPathInside(workspaceRootPath, resolvedPath) ? resolvedPath : workspaceRootPath;
  }

  /**
   * 在文件列表中查找文件
   */
  function findFileById(list: WorkspaceFile[], id: string): WorkspaceFile | undefined {
    for (const file of list) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * 根据路径查找文件
   */
  function findFileByPath(list: WorkspaceFile[], targetPath: string): WorkspaceFile | undefined {
    for (const file of list) {
      if (file.path === targetPath) return file;
      if (file.children) {
        const found = findFileByPath(file.children, targetPath);
        if (found) return found;
      }
    }
    return undefined;
  }

  async function buildTree(basePath: string): Promise<WorkspaceFile[]> {
    const entries = await resourceService.list(basePath);
    const result: WorkspaceFile[] = [];
    for (const entry of entries) {
      if (!entry || entry.startsWith('.')) continue;
      const entryPath = joinPath(basePath, entry);
      const meta = await resourceService.metadata(entryPath);
      if (!meta.exists) continue;

      if (meta.isDirectory) {
        const cardMetaPath = joinPath(entryPath, '.card/metadata.yaml');
        const boxMetaPath = joinPath(entryPath, '.box/metadata.yaml');

        if (await resourceService.exists(cardMetaPath)) {
          const metadata = await readMetadata(cardMetaPath);
          const cardId = getMetadataString(metadata, 'card_id') ?? entry.replace(/\.card$/i, '');
          const cardName = getMetadataString(metadata, 'name') ?? entry;
          const createdAt = getMetadataString(metadata, 'created_at') ?? meta.modified ?? now();
          const modifiedAt = getMetadataString(metadata, 'modified_at') ?? meta.modified ?? now();
          result.push({
            id: cardId,
            name: `${stripExtension(cardName, '.card')}.card`,
            path: entryPath,
            type: 'card',
            createdAt,
            modifiedAt,
          });
          continue;
        }

        if (await resourceService.exists(boxMetaPath)) {
          const metadata = await readMetadata(boxMetaPath);
          const boxId = getMetadataString(metadata, 'box_id') ?? entry.replace(/\.box$/i, '');
          const boxName = getMetadataString(metadata, 'name') ?? entry;
          const createdAt = getMetadataString(metadata, 'created_at') ?? meta.modified ?? now();
          const modifiedAt = getMetadataString(metadata, 'modified_at') ?? meta.modified ?? now();
          result.push({
            id: boxId,
            name: `${stripExtension(boxName, '.box')}.box`,
            path: entryPath,
            type: 'box',
            createdAt,
            modifiedAt,
          });
          continue;
        }

        const children = await buildTree(entryPath);
        result.push({
          id: entryPath,
          name: entry,
          path: entryPath,
          type: 'folder',
          createdAt: meta.modified || now(),
          modifiedAt: meta.modified || now(),
          children,
        });
        continue;
      }

      const lower = entry.toLowerCase();
      if (lower.endsWith('.card')) {
        result.push({
          id: entryPath,
          name: entry,
          path: entryPath,
          type: 'card',
          createdAt: meta.modified || now(),
          modifiedAt: meta.modified || now(),
        });
      } else if (lower.endsWith('.box')) {
        result.push({
          id: entryPath,
          name: entry,
          path: entryPath,
          type: 'box',
          createdAt: meta.modified || now(),
          modifiedAt: meta.modified || now(),
        });
      }
    }
    return result;
  }

  /**
   * 初始化工作区
   */
  async function initialize(): Promise<void> {
    const nextRootPath = trimTrailingSlash(normalizePath(resourceService.workspaceRoot));
    const hasRootChanged = state.rootPath !== nextRootPath;
    if (state.initialized && !hasRootChanged) return;

    try {
      workspaceRootPath = '';
      state.rootPath = nextRootPath;

      if (nextRootPath) {
        if (!isAbsolutePath(nextRootPath)) {
          throw new Error('[WorkspaceService] Workspace root must be an absolute path');
        }

        workspaceRootPath = nextRootPath;
        try {
          await resourceService.ensureDir(workspaceRootPath);
        } catch (err) {
          // ensureDir 失败不阻塞初始化（目录可能已存在）
          console.warn('[WorkspaceService] ensureDir skipped:', err);
        }
        await refresh();
      } else {
        state.files = [];
      }

      state.initialized = true;

      eventEmitter.emit('workspace:initialized', { rootPath: state.rootPath });
      console.warn('[WorkspaceService] 工作区已初始化:', state.rootPath);
    } catch (error) {
      console.error('[WorkspaceService] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建卡片
   */
  async function createCard(
    name: string,
    initialContent?: BasicCardConfig,
    cardId?: string,
    parentPath?: string
  ): Promise<WorkspaceFile> {
    const id = cardId || generateId62();
    const parentAbsolute = resolveParentPath(parentPath);
    if (!parentAbsolute) {
      throw new Error('[WorkspaceService] Workspace root is not configured');
    }
    const initializer = createCardInitializer({ workspaceRoot: parentAbsolute });

    const result = await initializer.createCard(id, name, initialContent);
    if (!result.success) {
      throw new Error(result.error || 'Create card failed');
    }

    await refresh();
    const targetPath = resolveWorkspacePath(result.cardPath, workspaceRootPath);
    const file = findFileByPath(state.files, targetPath);
    if (file) {
      eventEmitter.emit('workspace:file-created', { file, content: initialContent });
      return file;
    }

    const fallbackFile: WorkspaceFile = {
      id,
      name: `${stripExtension(name.trim(), '.card')}.card`,
      path: targetPath,
      type: 'card',
      createdAt: now(),
      modifiedAt: now(),
    };
    state.files.push(fallbackFile);
    eventEmitter.emit('workspace:file-created', { file: fallbackFile, content: initialContent });
    return fallbackFile;
  }

  /**
   * 创建箱子
   */
  async function createBox(name: string, layoutType?: string, parentPath?: string): Promise<WorkspaceFile> {
    const timestamp = now();
    const boxId = generateId62();
    const parent = resolveParentPath(parentPath);
    if (!parent) {
      throw new Error('[WorkspaceService] Workspace root is not configured');
    }
    const boxFolderName = `${boxId}.box`;
    const boxPath = joinPath(parent, boxFolderName);
    const metaDir = joinPath(boxPath, '.box');

    const metadata = {
      chip_standards_version: '1.0.0',
      box_id: boxId,
      name: name.trim(),
      created_at: timestamp,
      modified_at: timestamp,
      layout: layoutType || 'grid',
    };
    const structure = {
      cards: [],
    };
    const content = {
      layout: layoutType || 'grid',
    };

    await resourceService.ensureDir(boxPath);
    await resourceService.ensureDir(metaDir);
    await resourceService.writeText(joinPath(metaDir, 'metadata.yaml'), yaml.stringify(metadata));
    await resourceService.writeText(joinPath(metaDir, 'structure.yaml'), yaml.stringify(structure));
    await resourceService.writeText(joinPath(metaDir, 'content.yaml'), yaml.stringify(content));

    await refresh();
    const file = findFileByPath(state.files, boxPath);
    if (file) {
      eventEmitter.emit('workspace:file-created', { file, layoutType });
      return file;
    }

    const fallbackFile: WorkspaceFile = {
      id: boxId,
      name: `${stripExtension(name.trim(), '.box')}.box`,
      path: boxPath,
      type: 'box',
      createdAt: timestamp,
      modifiedAt: timestamp,
    };
    state.files.push(fallbackFile);
    eventEmitter.emit('workspace:file-created', { file: fallbackFile, layoutType });
    return fallbackFile;
  }

  /**
   * 创建文件夹
   */
  async function createFolder(name: string, parentPath?: string): Promise<WorkspaceFile> {
    const timestamp = now();
    const parent = resolveParentPath(parentPath);
    if (!parent) {
      throw new Error('[WorkspaceService] Workspace root is not configured');
    }
    const folderPath = joinPath(parent, name.trim());

    await resourceService.ensureDir(folderPath);
    await refresh();
    const file = findFileByPath(state.files, folderPath);
    if (file) {
      eventEmitter.emit('workspace:file-created', { file });
      return file;
    }

    const fallbackFile: WorkspaceFile = {
      id: folderPath,
      name: name.trim(),
      path: folderPath,
      type: 'folder',
      createdAt: timestamp,
      modifiedAt: timestamp,
      children: [],
    };
    state.files.push(fallbackFile);
    eventEmitter.emit('workspace:file-created', { file: fallbackFile });
    return fallbackFile;
  }

  /**
   * 获取文件
   */
  function getFile(id: string): WorkspaceFile | undefined {
    return findFileById(state.files, id);
  }

  /**
   * 删除文件
   */
  async function deleteFile(id: string): Promise<void> {
    const file = findFileById(state.files, id);
    if (!file) return;

    await resourceService.delete(file.path);
    await refresh();
    eventEmitter.emit('workspace:file-deleted', { file });
  }

  /**
   * 重命名文件
   */
  async function renameFile(id: string, newName: string): Promise<void> {
    const file = findFileById(state.files, id);
    if (!file) return;

    const trimmed = newName.trim();
    if (!trimmed) return;

    if (file.type === 'card' || file.type === 'box') {
      const extension = file.type === 'card' ? '.card' : '.box';
      const cleanName = stripExtension(trimmed, extension);
      const metadataPath = joinPath(file.path, `.${file.type}`, 'metadata.yaml');
      const metadata = (await readMetadata(metadataPath)) || {};
      metadata.name = cleanName;
      metadata.modified_at = now();
      await resourceService.writeText(metadataPath, yaml.stringify(metadata));
      await refresh();
      eventEmitter.emit('workspace:file-renamed', { file });
      return;
    }

    const parent = file.path.split('/').slice(0, -1).join('/');
    const newPath = joinPath(parent, trimmed);
    await resourceService.move(file.path, newPath);
    await refresh();
    eventEmitter.emit('workspace:file-renamed', { file });
  }

  /**
   * 刷新文件列表
   */
  async function refresh(): Promise<void> {
    if (!workspaceRootPath) {
      state.files = [];
      eventEmitter.emit('workspace:refreshed', { files: state.files });
      return;
    }

    state.files = await buildTree(workspaceRootPath);
    eventEmitter.emit('workspace:refreshed', { files: state.files });
  }

  /**
   * 获取已打开的文件
   */
  function getOpenedFiles(): WorkspaceFile[] {
    return state.openedFiles
      .map((id) => findFileById(state.files, id))
      .filter(Boolean) as WorkspaceFile[];
  }

  /**
   * 打开文件
   */
  function openFile(id: string): void {
    if (!state.openedFiles.includes(id)) {
      state.openedFiles.push(id);
      const file = findFileById(state.files, id);
      eventEmitter.emit('workspace:file-opened', { file });
    }
  }

  /**
   * 关闭文件
   */
  function closeFile(id: string): void {
    const index = state.openedFiles.indexOf(id);
    if (index !== -1) {
      state.openedFiles.splice(index, 1);
      const file = findFileById(state.files, id);
      eventEmitter.emit('workspace:file-closed', { file });
    }
  }

  /**
   * 通过路径打开文件
   * 用于从启动参数中自动打开指定文件
   */
  async function openFileByPath(filePath: string): Promise<void> {
    const targetPath = resolveWorkspacePath(filePath, workspaceRootPath);
    if (!targetPath) {
      console.warn('[WorkspaceService] Invalid file path:', filePath);
      return;
    }

    let file = findFileByPath(state.files, targetPath);
    if (!file) {
      await refresh();
      file = findFileByPath(state.files, targetPath);
    }
    if (file) {
      openFile(file.id);
    } else {
      console.warn('[WorkspaceService] File not found:', filePath);
    }
  }

  return {
    get state() { return state as Readonly<WorkspaceState>; },
    get files() { return getFiles(); },
    get isInitialized() { return getIsInitialized(); },
    initialize,
    createCard,
    createBox,
    createFolder,
    getFile,
    deleteFile,
    renameFile,
    refresh,
    getOpenedFiles,
    openFile,
    closeFile,
    openFileByPath,
  };
}

// 单例实例
let workspaceServiceInstance: WorkspaceService | null = null;

/**
 * 获取工作区服务实例
 */
export function useWorkspaceService(): WorkspaceService {
  if (!workspaceServiceInstance) {
    workspaceServiceInstance = createWorkspaceService();
  }
  return workspaceServiceInstance;
}

/**
 * 重置工作区服务（主要用于测试）
 */
export function resetWorkspaceService(): void {
  workspaceServiceInstance = null;
}
