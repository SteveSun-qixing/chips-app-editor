/**
 * 编辑器插件服务
 * @module services/plugin-service
 * @description 通过 Bridge API 在运行时发现和加载基础卡片插件的编辑器组件
 *
 * 在新架构中，基础卡片插件是独立仓库，通过 Chips Host 的插件管理器安装。
 * 编辑器通过 Bridge API 查询已安装的卡片插件，并动态加载其编辑器组件。
 */

import type { Component } from 'vue';
import type { ChipsSDK, PluginRegistration } from '@chips/sdk';
import { getEditorSdk } from './sdk-service';

/** 卡片插件信息（从 Bridge API 获取） */
interface CardPluginInfo {
  pluginId: string;
  rendererPath: string;
  editorPath: string;
}

/** 编辑器插件定义 */
interface EditorPluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  cardTypes: string[];
  keywords?: string[];
  editorPath?: string;
}

/** 已发现的卡片插件缓存 */
let discoveredPlugins: EditorPluginDefinition[] = [];
let pluginsDiscovered = false;
let pluginsRegistered = false;

/** 编辑器组件缓存 */
const componentCache = new Map<string, Component>();

/** 卡片类型到插件信息的缓存 */
const cardPluginCache = new Map<string, CardPluginInfo | null>();

/**
 * 通过 Bridge API 发现已安装的卡片插件
 */
async function discoverCardPlugins(): Promise<EditorPluginDefinition[]> {
  if (pluginsDiscovered) return discoveredPlugins;

  try {
    if (typeof window === 'undefined' || !window.chips) {
      console.warn('[PluginService] Bridge API not available, no plugins discovered');
      pluginsDiscovered = true;
      return discoveredPlugins;
    }

    const plugins = await window.chips.plugin.list({ type: 'card' });

    discoveredPlugins = plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: undefined,
      cardTypes: [plugin.id],
      keywords: undefined,
    }));

    pluginsDiscovered = true;
    return discoveredPlugins;
  } catch (error) {
    console.warn('[PluginService] Failed to discover card plugins:', error);
    pluginsDiscovered = true;
    return discoveredPlugins;
  }
}

/**
 * 通过 Bridge API 获取指定卡片类型的插件信息
 */
async function getCardPluginInfo(cardType: string): Promise<CardPluginInfo | null> {
  if (cardPluginCache.has(cardType)) {
    return cardPluginCache.get(cardType) ?? null;
  }

  try {
    if (typeof window === 'undefined' || !window.chips) {
      cardPluginCache.set(cardType, null);
      return null;
    }

    const info = await window.chips.plugin.getCardPlugin(cardType);
    cardPluginCache.set(cardType, info);
    return info;
  } catch (error) {
    console.warn(`[PluginService] Failed to get card plugin for type "${cardType}":`, error);
    cardPluginCache.set(cardType, null);
    return null;
  }
}

/**
 * 确保插件已注册到 SDK
 */
async function ensureRegistered(): Promise<ChipsSDK> {
  const sdk = await getEditorSdk();

  if (!pluginsRegistered) {
    const plugins = await discoverCardPlugins();

    for (const plugin of plugins) {
      const registration: PluginRegistration = {
        id: plugin.id,
        metadata: {
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          keywords: plugin.keywords,
          chipStandardsVersion: '1.0.0',
        },
        activate: async () => {},
      };

      try {
        sdk.registerPlugin(registration);
      } catch {
        // ignore duplicate registration
      }

      try {
        await sdk.plugins.enable(plugin.id);
      } catch {
        // ignore enable errors
      }
    }
    pluginsRegistered = true;
  }

  return sdk;
}

/**
 * 获取指定卡片类型的编辑器组件
 *
 * 通过 Bridge API 查询卡片插件信息，获取编辑器组件路径，
 * 然后动态加载该组件。
 *
 * @param cardType - 卡片类型标识
 * @returns 编辑器 Vue 组件，如果未找到则返回 null
 */
export async function getEditorComponent(cardType: string): Promise<Component | null> {
  await ensureRegistered();

  // 检查缓存
  if (componentCache.has(cardType)) {
    return componentCache.get(cardType) ?? null;
  }

  // 通过 Bridge API 获取插件信息
  const pluginInfo = await getCardPluginInfo(cardType);
  if (!pluginInfo || !pluginInfo.editorPath) {
    return null;
  }

  try {
    // 动态加载编辑器组件
    // editorPath 是相对于插件安装目录的路径，Host 会解析为完整 URL
    const module = await import(/* @vite-ignore */ pluginInfo.editorPath);
    const component = (module as { default: Component }).default;
    componentCache.set(cardType, component);
    return component;
  } catch (error) {
    console.error(
      `[PluginService] Failed to load editor component for "${cardType}":`,
      error
    );
    return null;
  }
}

/**
 * 获取已注册的插件列表
 */
export function getRegisteredPlugins(): EditorPluginDefinition[] {
  return [...discoveredPlugins];
}

/**
 * 清除插件缓存（用于测试）
 */
export function __resetPluginServiceForTests(): void {
  discoveredPlugins = [];
  pluginsDiscovered = false;
  pluginsRegistered = false;
  componentCache.clear();
  cardPluginCache.clear();
}
