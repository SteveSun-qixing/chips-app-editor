/**
 * Card resource resolver
 * @module services/card-resource-resolver
 * @description 统一处理卡片资源路径解析、ObjectURL 创建与释放
 *
 * 资源读取统一经由 file.read（Bridge -> Host -> 内核路由），
 * 避免 SDK 侧资源动作与 Host 资源协议分叉。
 */

import { resourceService } from './resource-service';

export type CardResolvedResourceSource = 'file-read';

export interface CardResolvedResource {
  fullPath: string;
  url: string;
  source: CardResolvedResourceSource;
}

function normalizeCardPath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
  if (!normalized) return '';

  if (normalized.startsWith('/')) {
    return normalized;
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    const drive = normalized.slice(0, 2);
    const rest = normalized.slice(2).replace(/^\/+/, '');
    return `${drive}/${rest}`;
  }

  return normalized.replace(/^\/+/, '');
}

function normalizeResourcePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function getMimeTypeByPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };

  return mimeMap[extension] ?? 'application/octet-stream';
}

export function isDirectResourceUrl(path: string): boolean {
  return (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  );
}

export function buildCardResourceFullPath(cardPath: string, resourcePath: string): string {
  const normalizedCardPath = normalizeCardPath(cardPath);
  const normalizedResourcePath = normalizeResourcePath(resourcePath);
  if (!normalizedResourcePath) {
    return normalizedCardPath;
  }
  return normalizedCardPath ? `${normalizedCardPath}/${normalizedResourcePath}` : normalizedResourcePath;
}

export async function resolveCardResourceUrl(
  fullPath: string
): Promise<CardResolvedResource> {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('URL.createObjectURL is unavailable');
  }

  const binary = await resourceService.readBinary(fullPath);
  const blob = new Blob([binary], {
    type: getMimeTypeByPath(fullPath),
  });
  const url = URL.createObjectURL(blob);
  return { fullPath, url, source: 'file-read' };
}

export async function releaseCardResourceUrl(
  resource: CardResolvedResource
): Promise<void> {
  try {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(resource.url);
    }
  } catch {
    // ignore release failures
  }
}
