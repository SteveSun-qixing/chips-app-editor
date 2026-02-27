/**
 * 编辑器插件服务
 * @module services/plugin-service
 * @description 通过 Bridge API 在运行时发现和加载基础卡片插件的编辑器组件
 *
 * 在新架构中，基础卡片插件是独立仓库，通过 Chips Host 的插件管理器安装。
 * 编辑器通过 Bridge API 查询已安装的卡片插件，并动态加载其编辑器组件。
 */

import type { ComponentType } from 'react';
import type {
  ChipsCardPluginRuntimeContext,
} from '@chips/sdk';
import { parse as parseYaml } from 'yaml';
import { getEditorPluginHook } from './editor-runtime-gateway';

/** 卡片插件信息（从 Bridge API 获取） */
interface CardPluginInfo {
  pluginId: string;
  rendererPath: string;
  editorPath: string;
}

interface RuntimeVocabularyResult {
  locale: string;
  vocabularyVersion: number;
  vocabulary: Record<string, string>;
}

export interface EditorRuntime {
  mode: 'component' | 'iframe';
  pluginId: string;
  component?: ComponentType;
  iframeUrl?: string;
}

/** 编辑器插件定义 */
interface EditorPluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  cardTypes: string[];
  keywords?: string[];
}

/** 已发现的卡片插件缓存 */
let discoveredPlugins: EditorPluginDefinition[] = [];
let pluginsDiscovered = false;

/** 插件 ID 到 cardType 的别名映射 */
const pluginIdToCardType = new Map<string, string>();

/** 编辑器组件缓存 */
const componentCache = new Map<string, ComponentType>();
const runtimeCache = new Map<string, EditorRuntime>();

/** 卡片类型到插件信息的缓存 */
const cardPluginCache = new Map<string, CardPluginInfo | null>();

// ==================== 本地插件回退 ====================
/**
 * 通过 import.meta.glob 在构建时扫描本地 BasicCardPlugin 目录的清单文件，
 * 作为 Bridge API 不可用时的回退方案。
 */
const localManifestModules = import.meta.glob(
  '../../../BasicCardPlugin/**/manifest.yaml',
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

/** 本地插件信息（cardType -> { pluginId, editorPath, manifestDir }） */
interface LocalPluginEntry {
  pluginId: string;
  editorPath: string;
  /** manifest.yaml 所在目录的 glob 路径前缀 */
  manifestDir: string;
}

let localPluginMap: Map<string, LocalPluginEntry> | null = null;

function getLocalPluginMap(): Map<string, LocalPluginEntry> {
  if (localPluginMap) return localPluginMap;

  localPluginMap = new Map();

  for (const [globPath, raw] of Object.entries(localManifestModules)) {
    let manifest: Record<string, unknown> | null = null;
    try {
      manifest = parseYaml(raw) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!manifest || manifest.type !== 'card') continue;

    const pluginId = manifest.id;
    if (typeof pluginId !== 'string' || !pluginId) continue;

    const capabilities = manifest.capabilities as Record<string, unknown> | undefined;
    const cardType = capabilities?.cardType ?? (manifest as Record<string, unknown>).cardType;
    if (typeof cardType !== 'string' || !cardType) continue;

    const entry = manifest.entry as Record<string, unknown> | undefined;
    const editorPath = entry?.editor;
    if (typeof editorPath !== 'string' || !editorPath) continue;

    // globPath 形如 "../../../BasicCardPlugin/chips-card-rich-text/manifest.yaml"
    // manifestDir 为 manifest.yaml 所在目录
    const manifestDir = globPath.replace(/\/manifest\.ya?ml$/, '');

    localPluginMap.set(cardType, { pluginId, editorPath, manifestDir });
    // 同时以 pluginId 为键存储，方便 normalizeCardType 回退
    if (!pluginIdToCardType.has(pluginId)) {
      pluginIdToCardType.set(pluginId, cardType);
    }
  }

  return localPluginMap;
}

/**
 * 本地回退：通过构建时扫描的清单获取编辑器入口 URL
 */
function getLocalEditorUrl(cardType: string): string | null {
  const map = getLocalPluginMap();
  const entry = map.get(cardType);
  if (!entry) return null;

  // 将 manifestDir + editorPath 拼接为相对于当前模块的路径，
  // 然后通过 new URL 转换为可访问的 URL
  const relativePath = `${entry.manifestDir}/${entry.editorPath}`;
  try {
    return new URL(relativePath, import.meta.url).href;
  } catch {
    return null;
  }
}

/** 插件权限缓存 */
const pluginPermissionCache = new Map<string, ReadonlySet<string>>();

/** 插件本地词汇缓存（pluginId -> locale -> vocabulary） */
const pluginVocabularyCache = new Map<string, Map<string, Record<string, string>>>();

/** 插件清单加载中的请求缓存 */
const pluginManifestLoadCache = new Map<string, Promise<Record<string, unknown> | null>>();

/** 插件词汇加载中的请求缓存 */
const pluginVocabularyLoadCache = new Map<string, Promise<Map<string, Record<string, string>> | null>>();

function resolvePluginCardType(plugin: {
  id: string;
  capabilities?: Record<string, unknown>;
}): string {
  const capabilityCardType = plugin.capabilities?.cardType;
  if (typeof capabilityCardType === 'string' && capabilityCardType.trim().length > 0) {
    return capabilityCardType;
  }
  return plugin.id;
}

function normalizeCardType(cardType: string): string {
  return pluginIdToCardType.get(cardType) ?? cardType;
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function isAbsoluteFilePath(value: string): boolean {
  return value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value);
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');

  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }

  if (normalized.startsWith('/')) {
    return `file://${encodeURI(normalized)}`;
  }

  return `file:///${encodeURI(normalized)}`;
}

function isHtmlEntryPath(entryPath: string): boolean {
  return /\.html?(?:[?#].*)?$/i.test(entryPath);
}

async function resolvePluginEntryPath(pluginId: string, entryPath: string): Promise<string | null> {
  if (isAbsoluteUrl(entryPath)) {
    return entryPath;
  }

  if (isAbsoluteFilePath(entryPath)) {
    return toFileUrl(entryPath);
  }

  try {
    const plugin = getEditorPluginHook();
    return await plugin.resolveFileUrl(pluginId, entryPath);
  } catch (error) {
    console.warn(
      `[PluginService] Failed to resolve plugin file URL for "${pluginId}" and "${entryPath}":`,
      error
    );
    return null;
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizePermission(value: string): string {
  return value.trim().toLowerCase();
}

async function fetchPluginTextFile(pluginId: string, relativePath: string): Promise<string | null> {
  const url = await resolvePluginEntryPath(pluginId, relativePath);
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function loadPluginManifest(pluginId: string): Promise<Record<string, unknown> | null> {
  const cached = pluginManifestLoadCache.get(pluginId);
  if (cached) {
    return cached;
  }

  const loading = (async () => {
    const manifestText =
      await fetchPluginTextFile(pluginId, 'manifest.yaml')
      ?? await fetchPluginTextFile(pluginId, 'manifest.yml');
    if (!manifestText) {
      return null;
    }

    try {
      const parsed = parseYaml(manifestText);
      return toRecord(parsed);
    } catch {
      return null;
    }
  })();

  pluginManifestLoadCache.set(pluginId, loading);
  return loading;
}

function parseVocabularyByLocale(source: unknown): Map<string, Record<string, string>> | null {
  const root = toRecord(source);
  if (!root) {
    return null;
  }

  const vocabulary = toRecord(root.vocabulary);
  if (!vocabulary) {
    return null;
  }

  const result = new Map<string, Record<string, string>>();
  for (const [locale, entries] of Object.entries(vocabulary)) {
    const localeEntries = toRecord(entries);
    if (!localeEntries) {
      continue;
    }

    const normalizedEntries: Record<string, string> = {};
    for (const [key, value] of Object.entries(localeEntries)) {
      if (typeof value === 'string') {
        normalizedEntries[key] = value;
      }
    }

    if (Object.keys(normalizedEntries).length > 0) {
      result.set(locale, normalizedEntries);
    }
  }

  return result.size > 0 ? result : null;
}

async function loadPluginVocabulary(pluginId: string): Promise<Map<string, Record<string, string>> | null> {
  if (pluginVocabularyCache.has(pluginId)) {
    return pluginVocabularyCache.get(pluginId) ?? null;
  }

  const inFlight = pluginVocabularyLoadCache.get(pluginId);
  if (inFlight) {
    return inFlight;
  }

  const loading = (async () => {
    const text =
      await fetchPluginTextFile(pluginId, 'locales/vocabulary.yaml')
      ?? await fetchPluginTextFile(pluginId, 'locales/vocabulary.yml');
    if (!text) {
      return null;
    }

    try {
      const parsed = parseYaml(text);
      const vocabularyByLocale = parseVocabularyByLocale(parsed);
      if (!vocabularyByLocale) {
        return null;
      }
      pluginVocabularyCache.set(pluginId, vocabularyByLocale);
      return vocabularyByLocale;
    } catch {
      return null;
    }
  })();

  pluginVocabularyLoadCache.set(pluginId, loading);
  return loading;
}

/**
 * 通过 Bridge API 发现已安装的卡片插件
 */
async function discoverCardPlugins(options?: { force?: boolean }): Promise<EditorPluginDefinition[]> {
  const force = options?.force === true;
  if (!force && pluginsDiscovered) return discoveredPlugins;

  pluginIdToCardType.clear();

  try {
    const plugin = getEditorPluginHook();
    const plugins = await plugin.list({ type: 'card' });

    discoveredPlugins = plugins.map((plugin) => {
      const cardType = resolvePluginCardType(plugin);
      pluginIdToCardType.set(plugin.id, cardType);

      return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        cardTypes: [cardType],
        keywords: undefined,
      };
    });

    pluginsDiscovered = true;
    return discoveredPlugins;
  } catch (error) {
    console.warn('[PluginService] Failed to discover card plugins:', error);
    discoveredPlugins = [];
    pluginsDiscovered = true;
    return discoveredPlugins;
  }
}

/**
 * 通过 Bridge API 获取指定卡片类型的插件信息
 */
async function getCardPluginInfo(cardType: string, options?: { force?: boolean }): Promise<CardPluginInfo | null> {
  const force = options?.force === true;

  if (force) {
    cardPluginCache.delete(cardType);
  }

  if (!force && cardPluginCache.has(cardType)) {
    return cardPluginCache.get(cardType) ?? null;
  }

  try {
    const plugin = getEditorPluginHook();
    const info = await plugin.getCardPlugin(cardType);
    if (info) {
      cardPluginCache.set(cardType, info);
    }
    return info ?? null;
  } catch (error) {
    console.warn(`[PluginService] Failed to get card plugin for type "${cardType}":`, error);
    return null;
  }
}

async function getCardRuntimeContext(
  cardType: string,
  locale?: string
): Promise<ChipsCardPluginRuntimeContext | null> {
  const plugin = getEditorPluginHook();
  return plugin.getCardRuntimeContext(cardType, locale);
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
export async function getEditorComponent(cardType: string): Promise<ComponentType | null> {
  const runtime = await getEditorRuntime(cardType);
  if (!runtime || runtime.mode !== 'component') {
    return null;
  }
  return runtime.component ?? null;
}

export async function getEditorRuntime(cardType: string): Promise<EditorRuntime | null> {
  if (!pluginsDiscovered) {
    await discoverCardPlugins();
  }

  if (runtimeCache.has(cardType)) {
    return runtimeCache.get(cardType) ?? null;
  }

  let normalizedCardType = normalizeCardType(cardType);
  if (runtimeCache.has(normalizedCardType)) {
    const runtime = runtimeCache.get(normalizedCardType) ?? null;
    if (runtime) {
      runtimeCache.set(cardType, runtime);
    }
    return runtime;
  }

  const cachedComponent = componentCache.get(normalizedCardType) ?? componentCache.get(cardType);
  if (cachedComponent) {
    const runtime: EditorRuntime = {
      mode: 'component',
      pluginId: normalizedCardType,
      component: cachedComponent,
    };
    runtimeCache.set(normalizedCardType, runtime);
    runtimeCache.set(cardType, runtime);
    return runtime;
  }

  let pluginInfo = await getCardPluginInfo(normalizedCardType);
  if (!pluginInfo) {
    await discoverCardPlugins({ force: true });
    normalizedCardType = normalizeCardType(cardType);
    pluginInfo = await getCardPluginInfo(normalizedCardType, { force: true });
  }

  if (!pluginInfo || !pluginInfo.editorPath) {
    console.warn(`[PluginService] Card plugin info not found for cardType "${normalizedCardType}"`);
    return null;
  }

  const resolvedEditorPath = await resolvePluginEntryPath(pluginInfo.pluginId, pluginInfo.editorPath);
  if (!resolvedEditorPath) {
    console.warn(
      `[PluginService] Failed to resolve editor path for "${normalizedCardType}" from "${pluginInfo.editorPath}"`
    );
    return null;
  }

  if (isHtmlEntryPath(resolvedEditorPath)) {
    const runtime: EditorRuntime = {
      mode: 'iframe',
      pluginId: pluginInfo.pluginId,
      iframeUrl: resolvedEditorPath,
    };
    runtimeCache.set(normalizedCardType, runtime);
    runtimeCache.set(cardType, runtime);
    return runtime;
  }

  try {
    const module = await import(/* @vite-ignore */ resolvedEditorPath);
    const component = (module as { default: ComponentType }).default;
    componentCache.set(normalizedCardType, component);
    componentCache.set(cardType, component);
    const runtime: EditorRuntime = {
      mode: 'component',
      pluginId: pluginInfo.pluginId,
      component,
    };
    runtimeCache.set(normalizedCardType, runtime);
    runtimeCache.set(cardType, runtime);
    return runtime;
  } catch (error) {
    console.error(
      `[PluginService] Failed to load editor component for "${normalizedCardType}":`,
      error
    );
    return null;
  }
}

export async function getCardPluginPermissions(pluginId: string): Promise<ReadonlySet<string>> {
  if (!pluginId) {
    return new Set();
  }

  if (pluginPermissionCache.has(pluginId)) {
    return pluginPermissionCache.get(pluginId) ?? new Set();
  }

  const manifest = await loadPluginManifest(pluginId);
  const permissions = new Set<string>();
  const rawPermissions = manifest?.permissions;
  if (Array.isArray(rawPermissions)) {
    for (const permission of rawPermissions) {
      if (typeof permission === 'string' && permission.trim().length > 0) {
        permissions.add(normalizePermission(permission));
      }
    }
  }

  pluginPermissionCache.set(pluginId, permissions);
  return permissions;
}

export async function getLocalPluginVocabulary(
  pluginId: string,
  locale: string
): Promise<Record<string, string> | null> {
  if (!pluginId || !locale) {
    return null;
  }

  const vocabularyByLocale = await loadPluginVocabulary(pluginId);
  if (!vocabularyByLocale) {
    return null;
  }

  const direct = vocabularyByLocale.get(locale);
  if (direct) {
    return direct;
  }

  const normalizedLocale = locale.toLowerCase();
  for (const [candidateLocale, vocabulary] of vocabularyByLocale.entries()) {
    if (candidateLocale.toLowerCase() === normalizedLocale) {
      return vocabulary;
    }
  }

  return null;
}

export async function getHostPluginVocabulary(
  pluginId: string,
  locale: string
): Promise<RuntimeVocabularyResult | null> {
  if (!pluginId || !locale) {
    return null;
  }

  const normalizedCardType = normalizeCardType(pluginId);

  try {
    const runtimeContext = await getCardRuntimeContext(normalizedCardType, locale);
    if (!runtimeContext || runtimeContext.pluginId !== pluginId) {
      return null;
    }

    return {
      locale: runtimeContext.locale,
      vocabularyVersion: runtimeContext.vocabularyVersion,
      vocabulary: runtimeContext.vocabulary,
    };
  } catch (error) {
    const runtimeError = error as { code?: string };
    if (typeof runtimeError.code === 'string' && runtimeError.code.includes('NOT_FOUND')) {
      return null;
    }

    console.warn('[PluginService] Failed to read runtime vocabulary context:', error);
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
  pluginIdToCardType.clear();
  componentCache.clear();
  runtimeCache.clear();
  cardPluginCache.clear();
  pluginPermissionCache.clear();
  pluginVocabularyCache.clear();
  pluginManifestLoadCache.clear();
  pluginVocabularyLoadCache.clear();
}
