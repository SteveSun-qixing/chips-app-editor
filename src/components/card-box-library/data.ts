/**
 * 卡箱库数据定义
 * @module components/card-box-library/data
 */

import yaml from 'yaml';
import type { CardTypeDefinition, LayoutTypeDefinition } from './types';
import { t } from '@/services/i18n-service';

/** 已安装的基础卡片类型（由插件清单生成） */
interface PluginManifest {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  tags?: string[];
  type?: string;
  cardType?: string;
  layoutType?: string;
}

function resolveIcon(manifest: PluginManifest): string {
  const icon = manifest.icon ?? '';
  const isEmoji = icon && !icon.includes('/') && !icon.includes('.') && icon.length <= 3;
  if (isEmoji) {
    return icon;
  }
  return '🧩';
}

function parsePluginManifest(raw: unknown, path: string): PluginManifest | null {
  if (!raw) return null;
  try {
    if (path.endsWith('.json')) {
      return JSON.parse(raw as string) as PluginManifest;
    }
    return yaml.parse(raw as string) as PluginManifest;
  } catch {
    return null;
  }
}

const manifestModules = import.meta.glob('../../../../BasicCardPlugin/**/manifest.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const layoutManifestModules = {
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.yml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../layout-plugin/**/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

export const cardTypes: CardTypeDefinition[] = Object.entries(manifestModules)
  .map(([path, raw]) => parsePluginManifest(raw, path))
  .filter((manifest): manifest is PluginManifest => Boolean(manifest))
  .filter((manifest) => manifest.type === 'base_card')
  .map((manifest) => {
    const id = manifest.cardType ?? manifest.id ?? 'unknown';
    const name = manifest.name ?? id;
    const description = manifest.description ?? '';
    const keywords = [name, description, id, ...(manifest.tags ?? [])]
      .filter(Boolean)
      .map((item) => String(item));

    return {
      id,
      name,
      icon: resolveIcon(manifest),
      description,
      keywords,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

/** 已安装的箱子布局类型（由布局插件清单动态生成，与基础卡片一致） */
export const layoutTypes: LayoutTypeDefinition[] = Object.entries(layoutManifestModules)
  .map(([path, raw]) => parsePluginManifest(raw, path))
  .filter((manifest): manifest is PluginManifest => Boolean(manifest))
  .filter((manifest) => manifest.type === 'layout')
  .map((manifest) => {
    const id = manifest.layoutType ?? manifest.id ?? 'unknown';
    const name = manifest.name ?? id;
    const description = manifest.description ?? '';
    const keywords = [name, description, id, ...(manifest.tags ?? [])]
      .filter(Boolean)
      .map((item) => String(item));

    return {
      id,
      name,
      icon: resolveIcon(manifest),
      description,
      keywords,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

/**
 * 搜索卡片类型
 * @param query - 搜索关键词
 * @returns 匹配的卡片类型列表
 */
export function searchCardTypes(query: string): CardTypeDefinition[] {
  if (!query.trim()) return cardTypes;

  const lowerQuery = query.toLowerCase();
  return cardTypes.filter((type) => {
    const name = t(type.name).toLowerCase();
    const description = t(type.description).toLowerCase();
    const keywords = type.keywords.map((keyword) => t(keyword).toLowerCase());
    return (
      name.includes(lowerQuery) ||
      description.includes(lowerQuery) ||
      keywords.some((keyword) => keyword.includes(lowerQuery))
    );
  });
}

/**
 * 搜索布局类型
 * @param query - 搜索关键词
 * @returns 匹配的布局类型列表
 */
export function searchLayoutTypes(query: string): LayoutTypeDefinition[] {
  if (!query.trim()) return layoutTypes;

  const lowerQuery = query.toLowerCase();
  return layoutTypes.filter((type) => {
    const name = t(type.name).toLowerCase();
    const description = t(type.description).toLowerCase();
    const keywords = type.keywords.map((keyword) => t(keyword).toLowerCase());
    return (
      name.includes(lowerQuery) ||
      description.includes(lowerQuery) ||
      keywords.some((keyword) => keyword.includes(lowerQuery))
    );
  });
}
