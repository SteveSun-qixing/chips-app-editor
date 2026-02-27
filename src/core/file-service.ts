/**
 * 文件操作服务
 * @module core/file-service
 * @description 提供文件管理功能，包括创建、读取、删除、重命名等操作
 */

import type { EventEmitter } from './event-manager';
import { resourceService } from '@/services/resource-service';
import { useWorkspaceService, type WorkspaceFile } from './workspace-service';
import { generateId62 } from '@/utils';

/**
 * 文件类型
 */
export type FileType = 'card' | 'box' | 'folder' | 'unknown';

/**
 * 文件信息接口
 */
export interface FileInfo {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件类型 */
  type: FileType;
  /** 文件大小（字节） */
  size: number;
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 子文件（仅目录有效） */
  children?: FileInfo[];
  /** 是否展开（仅目录有效） */
  expanded?: boolean;
}

/**
 * 创建卡片选项
 */
export interface CreateCardOptions {
  /** 卡片名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
  /** 卡片类型 */
  type?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * 创建箱子选项
 */
export interface CreateBoxOptions {
  /** 箱子名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
  /** 布局类型 */
  layout?: string;
}

/**
 * 创建文件夹选项
 */
export interface CreateFolderOptions {
  /** 文件夹名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
}

/**
 * 文件操作结果
 */
export interface FileOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 操作的文件信息 */
  file?: FileInfo;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 剪贴板操作类型
 */
export type ClipboardOperation = 'copy' | 'cut';

/**
 * 剪贴板数据
 */
export interface ClipboardData {
  /** 操作类型 */
  operation: ClipboardOperation;
  /** 文件路径列表 */
  files: string[];
}

/**
 * 获取文件扩展名对应的文件类型
 */
export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'card':
      return 'card';
    case 'box':
      return 'box';
    default:
      return 'unknown';
  }
}

/**
 * 检查文件名是否合法
 */
export function isValidFileName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // 禁止的字符: / \ : * ? " < > |
  const invalidChars = /[/\\:*?"<>|]/;
  return !invalidChars.test(name);
}

function stripExtension(name: string, ext: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

function getBaseName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

function convertWorkspaceFile(wsFile: WorkspaceFile, expandedPaths: Set<string>): FileInfo {
  return {
    id: wsFile.id,
    name: wsFile.name,
    path: wsFile.path,
    type: wsFile.type === 'folder' ? 'folder' : wsFile.type,
    size: 0,
    createdAt: wsFile.createdAt,
    modifiedAt: wsFile.modifiedAt,
    isDirectory: wsFile.type === 'folder',
    children: wsFile.children?.map((child) => convertWorkspaceFile(child, expandedPaths)),
    expanded: wsFile.type === 'folder' ? expandedPaths.has(wsFile.path) : undefined,
  };
}

function flattenFiles(files: FileInfo[]): FileInfo[] {
  const result: FileInfo[] = [];
  const walk = (list: FileInfo[]): void => {
    for (const file of list) {
      result.push(file);
      if (file.children) {
        walk(file.children);
      }
    }
  };
  walk(files);
  return result;
}

/**
 * 文件服务类
 */
export class FileService {
  /** 事件发射器 */
  private events: EventEmitter;
  /** 当前工作目录 */
  private workingDirectory: string = resourceService.workspaceRoot;
  /** 剪贴板数据 */
  private clipboard: ClipboardData | null = null;
  /** 展开状态 */
  private expandedPaths = new Set<string>();

  constructor(events: EventEmitter) {
    this.events = events;
  }

  private async ensureWorkspaceReady(): Promise<ReturnType<typeof useWorkspaceService>> {
    const workspaceService = useWorkspaceService();
    if (!workspaceService.isInitialized) {
      await workspaceService.initialize();
    }
    return workspaceService;
  }

  destroy(): void {
    this.clipboard = null;
    this.expandedPaths.clear();
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setWorkingDirectory(path: string): void {
    this.workingDirectory = path;
    this.events.emit('file:working-directory-changed', { path });
  }

  async getFileList(path?: string): Promise<FileInfo[]> {
    const tree = await this.getFileTree();
    if (!path) {
      return flattenFiles(tree);
    }
    return flattenFiles(tree).filter((file) => file.path.startsWith(path));
  }

  async getFileTree(): Promise<FileInfo[]> {
    const workspaceService = await this.ensureWorkspaceReady();
    const wsFiles = workspaceService.files;
    return wsFiles.map((file) => convertWorkspaceFile(file, this.expandedPaths));
  }

  async getFileInfo(path: string): Promise<FileInfo | null> {
    const tree = await this.getFileTree();
    const file = flattenFiles(tree).find((item) => item.path === path);
    return file ?? null;
  }

  async createCard(options: CreateCardOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return { success: false, error: 'error.invalid_filename', errorCode: 'VAL-1001' };
    }

    const name = stripExtension(options.name.trim(), '.card');
    const workspaceService = await this.ensureWorkspaceReady();
    try {
      const file = await workspaceService.createCard(
        name,
        options.type ? { type: options.type, id: generateId62() } : undefined,
        undefined,
        options.parentPath
      );
      const fileInfo = convertWorkspaceFile(file, this.expandedPaths);
      this.events.emit('file:created', { file: fileInfo });
      return { success: true, file: { ...fileInfo, name: `${name}.card`, type: 'card' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.create_failed',
        errorCode: 'SYS-9001',
      };
    }
  }

  async createBox(options: CreateBoxOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return { success: false, error: 'error.invalid_filename', errorCode: 'VAL-1001' };
    }

    const name = stripExtension(options.name.trim(), '.box');
    const workspaceService = await this.ensureWorkspaceReady();
    try {
      const file = await workspaceService.createBox(name, options.layout, options.parentPath);
      const fileInfo = convertWorkspaceFile(file, this.expandedPaths);
      this.events.emit('file:created', { file: fileInfo });
      return { success: true, file: { ...fileInfo, name: `${name}.box`, type: 'box' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.create_failed',
        errorCode: 'SYS-9001',
      };
    }
  }

  async createFolder(options: CreateFolderOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return { success: false, error: 'error.invalid_filename', errorCode: 'VAL-1001' };
    }

    const workspaceService = await this.ensureWorkspaceReady();
    try {
      const file = await workspaceService.createFolder(options.name.trim(), options.parentPath);
      const fileInfo = convertWorkspaceFile(file, this.expandedPaths);
      this.events.emit('file:created', { file: fileInfo });
      return { success: true, file: fileInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.create_failed',
        errorCode: 'SYS-9001',
      };
    }
  }

  async openFile(path: string): Promise<void> {
    this.events.emit('file:opened', { path });
  }

  async deleteFile(path: string): Promise<FileOperationResult> {
    const workspaceService = await this.ensureWorkspaceReady();
    const tree = await this.getFileTree();
    const target = flattenFiles(tree).find((file) => file.path === path);

    if (!target) {
      return { success: false, error: 'error.file_not_found', errorCode: 'RES-3001' };
    }

    try {
      await workspaceService.deleteFile(target.id);
      this.events.emit('file:deleted', { path });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.delete_failed',
        errorCode: 'SYS-9002',
      };
    }
  }

  async renameFile(path: string, newName: string): Promise<FileOperationResult> {
    if (!isValidFileName(newName)) {
      return { success: false, error: 'error.invalid_filename', errorCode: 'VAL-1001' };
    }

    const workspaceService = await this.ensureWorkspaceReady();
    const tree = await this.getFileTree();
    const target = flattenFiles(tree).find((file) => file.path === path);

    if (!target) {
      return { success: false, error: 'error.file_not_found', errorCode: 'RES-3001' };
    }

    try {
      await workspaceService.renameFile(target.id, newName.trim());
      this.events.emit('file:renamed', { path, newName: newName.trim() });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.rename_failed',
        errorCode: 'SYS-9003',
      };
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      const exists = await resourceService.exists(sourcePath);
      if (!exists) {
        return { success: false, error: 'error.file_not_found', errorCode: 'RES-3001' };
      }
      const baseName = getBaseName(sourcePath);
      const targetPath = destPath.endsWith('/') ? `${destPath}${baseName}` : `${destPath}/${baseName}`;
      await resourceService.copy(sourcePath, targetPath);
      this.events.emit('file:copied', { sourcePath, destPath: targetPath });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.copy_failed',
        errorCode: 'SYS-9004',
      };
    }
  }

  async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      const exists = await resourceService.exists(sourcePath);
      if (!exists) {
        return { success: false, error: 'error.file_not_found', errorCode: 'RES-3001' };
      }
      const baseName = getBaseName(sourcePath);
      const targetPath = destPath.endsWith('/') ? `${destPath}${baseName}` : `${destPath}/${baseName}`;
      await resourceService.move(sourcePath, targetPath);
      this.events.emit('file:moved', { sourcePath, destPath: targetPath });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'error.move_failed',
        errorCode: 'SYS-9005',
      };
    }
  }

  async toggleFolderExpanded(path: string): Promise<void> {
    const info = await this.getFileInfo(path);
    if (!info || !info.isDirectory) return;

    const next = !this.expandedPaths.has(path);
    if (next) {
      this.expandedPaths.add(path);
    } else {
      this.expandedPaths.delete(path);
    }

    this.events.emit('file:folder-toggled', { path, expanded: next });
  }

  async setFolderExpanded(path: string, expanded: boolean): Promise<void> {
    const info = await this.getFileInfo(path);
    if (!info || !info.isDirectory) return;

    if (expanded) {
      this.expandedPaths.add(path);
    } else {
      this.expandedPaths.delete(path);
    }

    this.events.emit('file:folder-toggled', { path, expanded });
  }

  copyToClipboard(files: string[]): void {
    this.clipboard = { operation: 'copy', files };
    this.events.emit('file:clipboard-changed', { clipboard: this.clipboard });
  }

  cutToClipboard(files: string[]): void {
    this.clipboard = { operation: 'cut', files };
    this.events.emit('file:clipboard-changed', { clipboard: this.clipboard });
  }

  getClipboard(): ClipboardData | null {
    return this.clipboard;
  }

  clearClipboard(): void {
    this.clipboard = null;
    this.events.emit('file:clipboard-changed', { clipboard: this.clipboard });
  }

  async paste(destPath: string): Promise<FileOperationResult[]> {
    if (!this.clipboard || this.clipboard.files.length === 0) {
      return [{ success: false, error: 'error.clipboard_empty', errorCode: 'VAL-2001' }];
    }

    const results: FileOperationResult[] = [];
    for (const sourcePath of this.clipboard.files) {
      if (this.clipboard.operation === 'copy') {
        results.push(await this.copyFile(sourcePath, destPath));
      } else {
        results.push(await this.moveFile(sourcePath, destPath));
      }
    }

    if (this.clipboard.operation === 'cut') {
      this.clearClipboard();
    }

    return results;
  }

  async searchFiles(
    query: string,
    options?: { type?: FileType; path?: string }
  ): Promise<FileInfo[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const tree = await this.getFileTree();
    const list = flattenFiles(tree);
    const normalized = query.trim().toLowerCase();

    return list.filter((file) => {
      if (options?.type && file.type !== options.type) {
        return false;
      }
      if (options?.path && !file.path.startsWith(options.path)) {
        return false;
      }
      return file.name.toLowerCase().includes(normalized);
    });
  }

  async refresh(): Promise<void> {
    const workspaceService = useWorkspaceService();
    await workspaceService.refresh();
    this.events.emit('file:refreshed', {});
  }
}

// 单例实例
let fileServiceInstance: FileService | null = null;

/**
 * 获取文件服务实例
 */
export function getFileService(events?: EventEmitter): FileService {
  if (!fileServiceInstance) {
    if (!events) {
      throw new Error('[FileService] EventEmitter is required for first initialization');
    }
    fileServiceInstance = new FileService(events);
  }
  return fileServiceInstance;
}

/**
 * 重置文件服务（主要用于测试）
 */
export function resetFileService(): void {
  fileServiceInstance = null;
}
