/**
 * Card resource resolver
 * @module services/card-resource-resolver
 * @description 统一处理卡片资源路径解析、ObjectURL 创建与释放
 *
 * 在新架构中，资源解析统一通过 SDK ResourceManager 进行，
 * 不再需要开发文件服务器的直接 fetch 回退。
 */

import { getEditorSdk } from './sdk-service';

export type CardResolvedResourceSource = 'sdk';

export interface CardResolvedResource {
  fullPath: string;
  url: string;
  source: CardResolvedResourceSource;
}

function normalizePathSegment(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
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
  const normalizedCardPath = normalizePathSegment(cardPath);
  const normalizedResourcePath = normalizePathSegment(resourcePath);
  return `${normalizedCardPath}/${normalizedResourcePath}`;
}

export async function resolveCardResourceUrl(
  fullPath: string
): Promise<CardResolvedResource> {
  const sdk = await getEditorSdk();
  const url = await sdk.resources.createObjectUrl(fullPath);
  return { fullPath, url, source: 'sdk' };
}

export async function releaseCardResourceUrl(
  resource: CardResolvedResource
): Promise<void> {
  try {
    const sdk = await getEditorSdk();
    sdk.resources.releaseObjectUrl(resource.fullPath);
  } catch {
    // ignore release failures
  }
}
