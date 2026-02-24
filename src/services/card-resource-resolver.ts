/**
 * Card resource resolver
 * @module services/card-resource-resolver
 * @description 统一处理卡片资源路径解析、ObjectURL 创建与释放
 *
 * 在新架构中，编辑器侧通过 Bridge 文件读写能力加载卡片资源并生成 ObjectURL。
 */

import { resourceService } from './resource-service';

export type CardResolvedResourceSource = 'file';

export interface CardResolvedResource {
  fullPath: string;
  url: string;
  source: CardResolvedResourceSource;
}

function normalizeCardPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
}

function normalizeResourcePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

export function isDirectResourceUrl(path: string): boolean {
  return (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('file://')
  );
}

export function buildCardResourceFullPath(cardPath: string, resourcePath: string): string {
  const normalizedCardPath = normalizeCardPath(cardPath);
  const normalizedResourcePath = normalizeResourcePath(resourcePath);

  if (!normalizedCardPath) {
    return normalizedResourcePath;
  }
  if (!normalizedResourcePath) {
    return normalizedCardPath;
  }
  return `${normalizedCardPath}/${normalizedResourcePath}`;
}

export async function resolveCardResourceUrl(
  fullPath: string
): Promise<CardResolvedResource> {
  const buffer = await resourceService.readBinary(fullPath);
  const blob = new Blob([buffer], { type: inferMimeType(fullPath) });
  const url = URL.createObjectURL(blob);
  return { fullPath, url, source: 'file' };
}

export async function releaseCardResourceUrl(
  resource: CardResolvedResource
): Promise<void> {
  try {
    URL.revokeObjectURL(resource.url);
  } catch {
    // ignore release failures
  }
}

function inferMimeType(path: string): string {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.gif')) return 'image/gif';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.svg')) return 'image/svg+xml';
  if (normalized.endsWith('.bmp')) return 'image/bmp';
  if (normalized.endsWith('.ico')) return 'image/x-icon';
  if (normalized.endsWith('.avif')) return 'image/avif';
  return 'application/octet-stream';
}
