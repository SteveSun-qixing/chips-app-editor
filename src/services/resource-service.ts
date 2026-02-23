/**
 * 资源服务
 * @module services/resource-service
 * @description 统一封装资源管理器与转换能力（通过 Bridge API 路由）
 *
 * 在新架构中，所有文件操作通过 SDK CoreConnector 路由到 Bridge API。
 * 路径不再添加硬编码前缀，由调用方（workspace-service）负责传入正确路径。
 * 工作区路径在运行时通过插件启动参数设置。
 */

import {
  ResourceManager,
  Logger,
  ConfigManager,
  EventBus,
  ConversionAPI,
  type ConversionResult,
  type HTMLConversionOptions,
  type ImageConversionOptions,
  type PDFConversionOptions,
} from '@chips/sdk';
import { getEditorConnector } from './sdk-service';

const logger = new Logger('EditorResourceService');
const config = new ConfigManager();
const eventBus = new EventBus();

let initialized = false;
let _resourceManager: ResourceManager | null = null;
let conversionApi: ConversionAPI | null = null;

/** 运行时工作区路径，通过 setWorkspacePaths 设置 */
let _workspaceRoot = '';
let _externalRoot = '';

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path);
}

function joinPath(base: string, relative: string): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanRelative = relative.replace(/^\/+/, '');
  return cleanRelative ? `${cleanBase}/${cleanRelative}` : cleanBase;
}

function resolveAliasPath(path: string, root: string): string | null {
  if (!root || !isAbsolutePath(root)) {
    return null;
  }

  const rootName = root.split('/').filter(Boolean).pop() ?? '';
  if (!rootName) {
    return null;
  }

  if (path === rootName) {
    return root;
  }

  if (path.startsWith(`${rootName}/`)) {
    return joinPath(root, path.slice(rootName.length + 1));
  }

  return null;
}

function resolveBridgePath(path: string): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath || isAbsolutePath(normalizedPath)) {
    return normalizedPath;
  }

  const workspaceRoot = normalizePath(_workspaceRoot);
  const externalRoot = normalizePath(_externalRoot);

  const aliasResolvedFromWorkspace = resolveAliasPath(normalizedPath, workspaceRoot);
  if (aliasResolvedFromWorkspace) {
    return aliasResolvedFromWorkspace;
  }

  const aliasResolvedFromExternal = resolveAliasPath(normalizedPath, externalRoot);
  if (aliasResolvedFromExternal) {
    return aliasResolvedFromExternal;
  }

  if (workspaceRoot && isAbsolutePath(workspaceRoot)) {
    return joinPath(workspaceRoot, normalizedPath);
  }

  if (externalRoot && isAbsolutePath(externalRoot)) {
    return joinPath(externalRoot, normalizedPath);
  }

  return normalizedPath;
}

/**
 * 设置工作区路径（由插件初始化时调用）
 */
export function setWorkspacePaths(workspaceRoot: string, externalRoot: string): void {
  _workspaceRoot = normalizePath(workspaceRoot);
  _externalRoot = normalizePath(externalRoot);
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await config.initialize();
  const connector = await getEditorConnector();
  _resourceManager = new ResourceManager(connector, logger, eventBus);
  conversionApi = new ConversionAPI(connector, logger, config);
  initialized = true;
}

export const resourceService = {
  get workspaceRoot(): string {
    return _workspaceRoot;
  },
  get externalRoot(): string {
    return _externalRoot;
  },

  async readText(path: string): Promise<string> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request<{
      content: string;
      encoding: string;
      size: number;
    }>({
      service: 'file',
      method: 'read',
      payload: { path: resolvedPath, encoding: 'utf8' },
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Read failed');
    }
    return response.data.content ?? '';
  },

  async readBinary(path: string): Promise<ArrayBuffer> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request<{
      content: string;
      encoding: string;
      size: number;
    }>({
      service: 'file',
      method: 'read',
      payload: { path: resolvedPath, encoding: 'base64', mode: 'buffer' },
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Read failed');
    }
    // Decode base64 to ArrayBuffer
    const binary = atob(response.data.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  async writeText(path: string, content: string): Promise<void> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'write',
      payload: { path: resolvedPath, content, encoding: 'utf8', createDirs: true },
    });
    if (!response.success) {
      throw new Error(response.error || 'Write failed');
    }
  },

  async writeBinary(path: string, content: ArrayBuffer): Promise<void> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    // Encode ArrayBuffer to base64
    const bytes = new Uint8Array(content);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    const base64Content = btoa(binary);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'write',
      payload: { path: resolvedPath, content: base64Content, encoding: 'base64', createDirs: true },
    });
    if (!response.success) {
      throw new Error(response.error || 'Write failed');
    }
  },

  async ensureDir(path: string): Promise<void> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'mkdir',
      payload: { path: resolvedPath, recursive: true },
    });
    if (!response.success && response.error) {
      throw new Error(response.error);
    }
  },

  async exists(path: string): Promise<boolean> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request<{ exists: boolean }>({
      service: 'file',
      method: 'exists',
      payload: { path: resolvedPath },
    });
    return response.success && response.data?.exists === true;
  },

  async delete(path: string): Promise<void> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'delete',
      payload: { path: resolvedPath, force: true },
    });
    if (!response.success) {
      throw new Error(response.error || 'Delete failed');
    }
  },

  async list(path: string): Promise<string[]> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    const response = await (
      await getEditorConnector()
    ).request<{ entries: Array<{ name: string; type: string }> }>({
      service: 'file',
      method: 'list',
      payload: { path: resolvedPath },
    });
    if (!response.success || !response.data) {
      return [];
    }
    return response.data.entries?.map((e) => e.name) ?? [];
  },

  async metadata(path: string): Promise<{
    path: string;
    exists: boolean;
    isDirectory: boolean;
    isFile: boolean;
    size?: number;
    modified?: string;
  }> {
    await ensureInitialized();
    const resolvedPath = resolveBridgePath(path);
    // First check if path exists
    const existsResponse = await (await getEditorConnector()).request<{ exists: boolean }>({
      service: 'file',
      method: 'exists',
      payload: { path: resolvedPath },
    });
    if (!existsResponse.success || !existsResponse.data?.exists) {
      return { path: resolvedPath, exists: false, isDirectory: false, isFile: false };
    }
    // Then get stat info
    const response = await (
      await getEditorConnector()
    ).request<{
      size: number;
      isFile: boolean;
      isDirectory: boolean;
      modified: string;
      created: string;
    }>({
      service: 'file',
      method: 'stat',
      payload: { path: resolvedPath },
    });
    if (!response.success || !response.data) {
      return { path: resolvedPath, exists: true, isDirectory: false, isFile: false };
    }
    return {
      path: resolvedPath,
      exists: true,
      isDirectory: response.data.isDirectory,
      isFile: response.data.isFile,
      size: response.data.size,
      modified: response.data.modified,
    };
  },

  async getCardFiles(
    cardPath: string
  ): Promise<Array<{ path: string; content: string }>> {
    await ensureInitialized();
    // List files in the card directory and read each one
    const entries = await resourceService.list(cardPath);
    const results: Array<{ path: string; content: string }> = [];
    for (const entry of entries) {
      const filePath = `${cardPath}/${entry}`;
      try {
        const meta = await resourceService.metadata(filePath);
        if (meta.isFile) {
          const content = await resourceService.readText(filePath);
          results.push({ path: filePath, content });
        }
      } catch {
        // skip unreadable files
      }
    }
    return results;
  },

  async convertToHTML(
    sourcePath: string,
    outputPath: string,
    options?: HTMLConversionOptions
  ): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    const resolvedSourcePath = resolveBridgePath(sourcePath);
    const resolvedOutputPath = resolveBridgePath(outputPath);
    return conversionApi.convertToHTML(
      { type: 'path', path: resolvedSourcePath, fileType: 'card' },
      { ...options, outputPath: resolvedOutputPath }
    );
  },

  async convertToPDF(
    sourcePath: string,
    outputPath: string,
    options?: PDFConversionOptions
  ): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    const resolvedSourcePath = resolveBridgePath(sourcePath);
    const resolvedOutputPath = resolveBridgePath(outputPath);
    return conversionApi.convertToPDF(
      { type: 'path', path: resolvedSourcePath, fileType: 'card' },
      { ...options, outputPath: resolvedOutputPath }
    );
  },

  async convertToImage(
    sourcePath: string,
    outputPath: string,
    options?: ImageConversionOptions
  ): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    const resolvedSourcePath = resolveBridgePath(sourcePath);
    const resolvedOutputPath = resolveBridgePath(outputPath);
    return conversionApi.convertToImage(
      { type: 'path', path: resolvedSourcePath, fileType: 'card' },
      { ...options, outputPath: resolvedOutputPath }
    );
  },

  async exportCard(cardId: string, outputPath: string): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    const resolvedOutputPath = resolveBridgePath(outputPath);
    return conversionApi.exportAsCard(cardId, { outputPath: resolvedOutputPath });
  },

  async copy(sourcePath: string, destPath: string): Promise<void> {
    await ensureInitialized();
    const resolvedSourcePath = resolveBridgePath(sourcePath);
    const resolvedDestPath = resolveBridgePath(destPath);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'copy',
      payload: { source: resolvedSourcePath, target: resolvedDestPath },
    });
    if (!response.success) {
      throw new Error(response.error || 'Copy failed');
    }
  },

  async move(sourcePath: string, destPath: string): Promise<void> {
    await ensureInitialized();
    const resolvedSourcePath = resolveBridgePath(sourcePath);
    const resolvedDestPath = resolveBridgePath(destPath);
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'move',
      payload: { source: resolvedSourcePath, target: resolvedDestPath },
    });
    if (!response.success) {
      throw new Error(response.error || 'Move failed');
    }
  },
};
