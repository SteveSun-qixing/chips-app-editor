<script setup lang="ts">
/**
 * 插件宿主组件
 * @module components/edit-panel/PluginHost
 * @description 根据基础卡片类型加载对应的编辑组件插件，管理插件生命周期
 * 
 * 设计说明：
 * - 编辑面板只是容器，实际编辑界面由基础卡片插件提供
 * - 根据基础卡片类型动态加载对应的编辑器组件
 */

import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  shallowRef,
  nextTick,
  markRaw,
  isRef,
  isProxy,
  toRaw,
  type Component,
} from 'vue';
import { Button } from '@chips/components';
import { useCardStore, useEditorStore, useUIStore } from '@/core/state';
import type { CardInfo } from '@/core/state/stores/card';
import DefaultEditor from './DefaultEditor.vue';
import type { EditorPlugin } from './types';
import { getEditorRuntime, getLocalPluginVocabulary, getCardPluginPermissions } from '@/services/plugin-service';
import { t } from '@/services/i18n-service';
import { requireCardPath, resolveCardPath } from '@/services/card-path-service';
import { saveCardToWorkspace } from '@/services/card-persistence-service';
import { resourceService } from '@/services/resource-service';
import {
  buildCardResourceFullPath,
  releaseCardResourceUrl,
  resolveCardResourceUrl,
  type CardResolvedResource,
} from '@/services/card-resource-resolver';

// ==================== Props ====================
interface Props {
  /** 复合卡片 ID（用于定位非活动窗口的卡片） */
  cardId?: string;
  /** 基础卡片类型 */
  cardType: string;
  /** 基础卡片 ID */
  baseCardId: string;
  /** 当前配置 */
  config: Record<string, unknown>;
}

const props = defineProps<Props>();

// ==================== Emits ====================
const emit = defineEmits<{
  /** 配置变更 */
  'config-change': [config: Record<string, unknown>];
  /** 插件加载完成 */
  'plugin-loaded': [plugin: EditorPlugin | null];
  /** 插件加载失败 */
  'plugin-error': [error: Error];
}>();

// ==================== Stores ====================
const cardStore = useCardStore();
const editorStore = useEditorStore();
const uiStore = useUIStore();

// ==================== State ====================
/** 当前加载的插件 */
const currentPlugin = shallowRef<EditorPlugin | null>(null);

/** 插件容器引用 */
const pluginContainerRef = ref<HTMLElement | null>(null);

/** iframe 编辑器引用 */
const pluginIframeRef = ref<HTMLIFrameElement | null>(null);

/** 当前 iframe 编辑器入口 URL */
const iframeEditorUrl = ref('');

/** 当前 iframe 编辑器对应的插件 ID */
const iframePluginId = ref('');

/** 当前 iframe 编辑器词汇表缓存 */
const iframeVocabulary = ref<Record<string, string>>({});

/** 当前 iframe 编辑器词汇版本号 */
const iframeVocabularyVersion = ref('init');

/** 当前 iframe 编辑器会话 nonce */
const iframeSessionNonce = ref('');

/** 当前 iframe 编辑器可信 origin */
const iframeTrustedOrigin = ref<string | null>(null);

/** 当前 iframe 编辑器权限集 */
const iframePermissions = ref<Set<string>>(new Set());

/** 当前 iframe 权限是否已加载 */
const iframePermissionsLoaded = ref(false);

/** 已消费请求 nonce（防重放） */
const consumedIframeRequestNonces = new Set<string>();

/** 请求 nonce FIFO 队列（用于回收） */
const consumedIframeRequestNonceQueue: string[] = [];

/** 是否正在加载（内部状态） */
const isLoadingInternal = ref(true);

/** 是否显示加载状态 */
const showLoading = computed(() => isLoadingInternal.value);

/** 加载错误 */
const loadError = ref<Error | null>(null);

/** 已加载的组件类型缓存 */
const loadedTypes = new Set<string>();

/** 当前运行时模式 */
const runtimeMode = ref<'none' | 'component' | 'iframe'>('none');

/** 本地配置副本（用于防抖） */
const localConfig = ref<Record<string, unknown>>({});

/** 防抖定时器 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 防抖延迟（毫秒） */
const DEBOUNCE_DELAY = 300;

/** 自动保存间隔（毫秒） */
const AUTO_SAVE_INTERVAL = 5000;

/** iframe 请求 nonce 缓存上限 */
const MAX_TRACKED_IFRAME_REQUEST_NONCES = 512;

/** 自动保存定时器 */
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

/** 是否有未保存的更改 */
const hasUnsavedChanges = ref(false);

/** 当前进行中的落盘任务（同一组件内串行） */
let saveInFlight: Promise<void> | null = null;

/** 是否请求了尾随落盘 */
let trailingSaveRequested = false;

/** 编辑器资源解析缓存（fullPath -> resolved resource） */
const resolvedEditorResources = new Map<string, CardResolvedResource>();

let vocabularyLoadSequence = 0;
let vocabularyVersionSequence = 0;
let iframePermissionLoadSequence = 0;

/** 富文本编辑器状态 */
const editorState = ref<{
  content: string;
  selection: { startOffset: number; endOffset: number; collapsed: boolean } | null;
  activeFormats: Set<string>;
  currentBlock: string;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  wordCount: number;
  isFocused: boolean;
}>({
  content: '',
  selection: null,
  activeFormats: new Set<string>(),
  currentBlock: 'paragraph',
  canUndo: false,
  canRedo: false,
  isDirty: false,
  wordCount: 0,
  isFocused: false,
});

interface IframeBridgeRequestMessage {
  type: 'bridge-request';
  pluginId: string;
  sessionNonce: string;
  requestNonce: string;
  requestId: string;
  namespace: string;
  action: string;
  params?: unknown;
}

interface IframeConfigUpdateMessage {
  type: 'config-update';
  pluginId: string;
  sessionNonce: string;
  config: Record<string, unknown>;
  persist?: boolean;
}

interface IframeEditorCancelMessage {
  type: 'editor-cancel';
  pluginId: string;
  sessionNonce: string;
}

interface IframeResizeMessage {
  type: 'resize';
  pluginId: string;
  sessionNonce: string;
  width?: number;
  height?: number;
}

interface IframeVocabularyPayload {
  mode: 'full';
  vocabulary: Record<string, string>;
}

interface IframeI18nEnvelope {
  locale: string;
  version: string;
  payload: IframeVocabularyPayload;
}

function getTargetCard(): CardInfo | null {
  if (props.cardId) {
    return cardStore.getCard(props.cardId) ?? null;
  }

  return cardStore.activeCard;
}

function resolveTargetCardPath(card: CardInfo | null): string {
  return resolveCardPath(card?.id, card?.filePath, resourceService.workspaceRoot);
}

async function resolveEditorResource(fullPath: string): Promise<string> {
  const cached = resolvedEditorResources.get(fullPath);
  if (cached) {
    return cached.url;
  }

  const resolved = await resolveCardResourceUrl(fullPath);
  resolvedEditorResources.set(fullPath, resolved);
  return resolved.url;
}

async function releaseEditorResource(fullPath: string): Promise<void> {
  const resolved = resolvedEditorResources.get(fullPath);
  if (!resolved) return;

  await releaseCardResourceUrl(resolved);
  resolvedEditorResources.delete(fullPath);
}

async function releaseEditorResourceByRelativePath(cardPath: string, resourcePath: string): Promise<void> {
  const fullPath = buildCardResourceFullPath(cardPath, resourcePath);
  if (resolvedEditorResources.has(fullPath)) {
    await releaseEditorResource(fullPath);
    return;
  }

  const normalizedSuffix = `/${resourcePath.replace(/^\/+/, '')}`;
  for (const path of resolvedEditorResources.keys()) {
    if (path.endsWith(normalizedSuffix)) {
      await releaseEditorResource(path);
      return;
    }
  }
}

async function releaseAllEditorResources(): Promise<void> {
  const resources = Array.from(resolvedEditorResources.values());
  resolvedEditorResources.clear();
  await Promise.all(resources.map((resource) => releaseCardResourceUrl(resource)));
}

function generateBridgeNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveIframeOrigin(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return null;
  }
}

function normalizePermissionToken(value: string): string {
  return value.trim().toLowerCase();
}

function hasRoutePermission(permissions: ReadonlySet<string>, namespace: string, action: string): boolean {
  const normalizedNamespace = namespace.trim().toLowerCase();
  const normalizedAction = action.trim().toLowerCase();
  const exact = `${normalizedNamespace}.${normalizedAction}`;
  const wildcard = `${normalizedNamespace}.*`;
  return (
    permissions.has(exact)
    || permissions.has(wildcard)
    || permissions.has('*')
  );
}

function trackConsumedRequestNonce(nonce: string): boolean {
  if (consumedIframeRequestNonces.has(nonce)) {
    return false;
  }

  consumedIframeRequestNonces.add(nonce);
  consumedIframeRequestNonceQueue.push(nonce);

  if (consumedIframeRequestNonceQueue.length > MAX_TRACKED_IFRAME_REQUEST_NONCES) {
    const stale = consumedIframeRequestNonceQueue.shift();
    if (stale) {
      consumedIframeRequestNonces.delete(stale);
    }
  }

  return true;
}

function resetIframeSecurityContext(url: string, pluginId: string): void {
  iframeSessionNonce.value = generateBridgeNonce();
  iframeTrustedOrigin.value = resolveIframeOrigin(url);
  iframePermissions.value = new Set();
  iframePermissionsLoaded.value = false;
  iframeVocabularyVersion.value = 'init';
  vocabularyVersionSequence = 0;
  consumedIframeRequestNonces.clear();
  consumedIframeRequestNonceQueue.length = 0;

  if (!pluginId) {
    return;
  }
}

function clearIframeSecurityContext(): void {
  iframeSessionNonce.value = '';
  iframeTrustedOrigin.value = null;
  iframePermissions.value = new Set();
  iframePermissionsLoaded.value = false;
  iframeVocabularyVersion.value = 'init';
  vocabularyVersionSequence = 0;
  consumedIframeRequestNonces.clear();
  consumedIframeRequestNonceQueue.length = 0;
}

function getIframeTargetOrigin(): string {
  const trustedOrigin = iframeTrustedOrigin.value;
  if (trustedOrigin && trustedOrigin !== 'null') {
    return trustedOrigin;
  }
  return '*';
}

function isTrustedIframeOrigin(origin: string): boolean {
  const expectedOrigin = iframeTrustedOrigin.value;
  if (!expectedOrigin) {
    return false;
  }

  if (expectedOrigin === 'null') {
    return origin === 'null' || origin.startsWith('chips://') || origin === 'file://';
  }

  if (expectedOrigin.startsWith('chips://') && origin === 'null') {
    return true;
  }

  if (expectedOrigin.startsWith('file://') && origin === 'null') {
    return true;
  }

  return origin === expectedOrigin;
}

function isIframeBridgeEnvelope(message: Record<string, unknown>): message is {
  pluginId: string;
  sessionNonce: string;
} {
  return typeof message.pluginId === 'string' && typeof message.sessionNonce === 'string';
}

function isTrustedIframeBridgeEnvelope(message: Record<string, unknown>): boolean {
  if (!isIframeBridgeEnvelope(message)) {
    return false;
  }

  return (
    message.pluginId === iframePluginId.value
    && message.sessionNonce === iframeSessionNonce.value
  );
}

function buildI18nEnvelope(locale: string, vocabulary: Record<string, string>): IframeI18nEnvelope {
  const pluginId = iframePluginId.value || 'unknown-plugin';
  const version = `${pluginId}:${locale}:v${++vocabularyVersionSequence}`;
  iframeVocabularyVersion.value = version;
  return {
    locale,
    version,
    payload: {
      mode: 'full',
      vocabulary,
    },
  };
}

async function ensureIframePermissionsLoaded(pluginId: string): Promise<void> {
  if (!pluginId) {
    iframePermissions.value = new Set();
    iframePermissionsLoaded.value = true;
    return;
  }

  if (iframePermissionsLoaded.value && iframePluginId.value === pluginId) {
    return;
  }

  const loadSequence = ++iframePermissionLoadSequence;
  const permissions = await getCardPluginPermissions(pluginId);
  if (loadSequence !== iframePermissionLoadSequence || iframePluginId.value !== pluginId) {
    return;
  }

  const normalized = new Set(
    Array.from(permissions.values()).map((permission) => normalizePermissionToken(permission))
  );
  iframePermissions.value = normalized;
  iframePermissionsLoaded.value = true;
}

// ==================== Computed ====================

/**
 * 编辑器选项（传递给基础卡片编辑器插件）
 *
 * 包含 onResolveResource 回调，用于将卡片内相对路径的资源
 * 通过 SDK ResourceManager 解析为浏览器可显示的 blob URL。
 * 符合薯片协议规范：所有资源访问通过 SDK 标准路径经内核中央路由。
 *
 * 策略：优先使用 SDK ResourceManager（含缓存），失败时直接从 dev-file-server 获取。
 */
const editorOptions = computed(() => {
  const targetCard = getTargetCard();
  const cardPath = resolveTargetCardPath(targetCard);
  return {
    toolbar: true,
    autoSave: true,
    cardPath,
    /**
     * 资源解析回调：将资源相对路径转换为浏览器可访问的 blob URL
     *
     * @param resourcePath - 资源在卡片根目录内的相对路径（如 "photo.jpg"）
     * @returns 浏览器可访问的 blob URL
     */
    onResolveResource: async (resourcePath: string): Promise<string> => {
      const fullPath = buildCardResourceFullPath(cardPath, resourcePath);
      try {
        return await resolveEditorResource(fullPath);
      } catch {
        return '';
      }
    },
    /**
     * 资源释放回调：通知宿主层释放对应资源句柄
     *
     * @param resourcePath - 资源在卡片根目录内的相对路径
     */
    onReleaseResolvedResource: async (resourcePath: string): Promise<void> => {
      await releaseEditorResourceByRelativePath(cardPath, resourcePath);
    },
  };
});

/** 是否使用默认编辑器 */
const useDefaultEditor = computed(() => {
  return !currentPlugin.value && !currentEditorComponent.value && runtimeMode.value !== 'iframe';
});

/** 当前基础卡片信息 */
const currentBaseCard = computed(() => {
  const targetCard = getTargetCard();
  if (!targetCard) return null;
  return targetCard.structure.find(bc => bc.id === props.baseCardId) ?? null;
});

/** 加载状态文本 */
const loadingText = computed(() => {
  return t('plugin_host.loading');
});

/** 错误状态文本 */
const errorText = computed(() => {
  return loadError.value?.message ?? t('plugin_host.error');
});

// ==================== Methods ====================
/**
 * 开始加载（延迟显示加载状态）
 */
function startLoading(): void {
  isLoadingInternal.value = true;
}

/**
 * 结束加载
 */
function endLoading(): void {
  isLoadingInternal.value = false;
}

/**
 * 加载编辑器插件
 */
async function loadPlugin(): Promise<void> {
  // 如果是已加载过的类型，不显示加载状态（组件已缓存）
  const isFirstLoad = !loadedTypes.has(props.cardType);
  
  if (isFirstLoad) {
    startLoading();
  }
  
  loadError.value = null;
  
  try {
    // 卸载当前插件
    await unloadPlugin();
    
    // 获取编辑器运行时（组件模式或 iframe 模式）
    const runtime = await getEditorRuntime(props.cardType);
    if (runtime?.mode === 'component' && runtime.component) {
      currentEditorComponent.value = markRaw(runtime.component);
      runtimeMode.value = 'component';
      currentPlugin.value = null;
      iframeEditorUrl.value = '';
      iframePluginId.value = '';
      iframeVocabulary.value = {};
      clearIframeSecurityContext();
      vocabularyLoadSequence += 1;
      emit('plugin-loaded', null);
      loadedTypes.add(props.cardType);
      console.warn('[PluginHost] 加载组件模式编辑器:', props.cardType);
    } else if (runtime?.mode === 'iframe' && runtime.iframeUrl) {
      currentEditorComponent.value = null;
      runtimeMode.value = 'iframe';
      currentPlugin.value = null;
      iframeEditorUrl.value = runtime.iframeUrl;
      iframePluginId.value = runtime.pluginId;
      iframeVocabulary.value = {};
      resetIframeSecurityContext(runtime.iframeUrl, runtime.pluginId);
      vocabularyLoadSequence += 1;
      void ensureIframePermissionsLoaded(runtime.pluginId);
      emit('plugin-loaded', null);
      loadedTypes.add(props.cardType);
      console.warn('[PluginHost] 加载 iframe 模式编辑器:', props.cardType, runtime.iframeUrl);
    } else {
      // 没有找到插件，使用默认编辑器
      currentPlugin.value = null;
      currentEditorComponent.value = null;
      runtimeMode.value = 'none';
      iframeEditorUrl.value = '';
      iframePluginId.value = '';
      iframeVocabulary.value = {};
      clearIframeSecurityContext();
      vocabularyLoadSequence += 1;
      emit('plugin-loaded', null);
    }
    
    // 初始化本地配置
    localConfig.value = { ...props.config };
  } catch (error) {
    loadError.value = error instanceof Error ? error : new Error(String(error));
    emit('plugin-error', loadError.value);
    console.error('[PluginHost] 加载插件失败:', error);
  } finally {
    endLoading();
  }
}

/**
 * 卸载当前插件
 */
async function unloadPlugin(): Promise<void> {
  if (currentPlugin.value) {
    try {
      // 保存未保存的更改
      if (hasUnsavedChanges.value) {
        await saveConfig();
      }
      
      await currentPlugin.value.unmount();
    } catch (error) {
      console.error('Failed to unmount plugin:', error);
    }
    currentPlugin.value = null;
  }

  await releaseAllEditorResources();
  
  // 清空容器
  if (pluginContainerRef.value) {
    pluginContainerRef.value.innerHTML = '';
  }

  if (pluginIframeRef.value) {
    pluginIframeRef.value.src = 'about:blank';
  }

  iframeEditorUrl.value = '';
  iframePluginId.value = '';
  iframeVocabulary.value = {};
  clearIframeSecurityContext();
  vocabularyLoadSequence += 1;
  runtimeMode.value = 'none';
}

/** 当前使用的编辑器组件 */
const currentEditorComponent = shallowRef<Component | null>(null);

/** 是否使用插件组件 */
const usePluginComponent = computed(() => {
  return currentEditorComponent.value !== null;
});

/** 是否使用 iframe 编辑器 */
const useIframeEditor = computed(() => {
  return runtimeMode.value === 'iframe' && iframeEditorUrl.value.length > 0;
});

/**
 * 处理默认编辑器配置变更
 */
function handleDefaultConfigChange(newConfig: Record<string, unknown>): void {
  localConfig.value = { ...newConfig };
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

/**
 * 处理富文本编辑器内容变更
 */
function handleEditorContentChange(html: string): void {
  localConfig.value = { 
    ...localConfig.value, 
    content_text: html,
    content_source: 'inline',
  };
  editorState.value.content = html;
  editorState.value.isDirty = true;
  editorState.value.wordCount = html.replace(/<[^>]*>/g, '').length;
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

/**
 * 处理选区变化
 */
function handleSelectionChange(
  selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
  formats: Set<string>,
  block: string
): void {
  editorState.value.selection = selection;
  editorState.value.activeFormats = formats;
  editorState.value.currentBlock = block;
}

/**
 * 处理编辑器聚焦
 */
function handleEditorFocus(): void {
  editorState.value.isFocused = true;
}

/**
 * 处理编辑器失焦
 */
function handleEditorBlur(): void {
  editorState.value.isFocused = false;
}

/**
 * 处理图片卡片编辑器配置变更
 *
 * 当图片编辑器传递配置时，可能包含 _pendingFiles 字段，
 * 其中记录了用户刚上传的图片文件（File 对象）。
 * PluginHost 负责通过 chips:// 协议将这些文件写入卡片文件夹根目录，
 * 然后清除 _pendingFiles 字段，只保留纯净的配置数据。
 *
 * 符合薯片协议规范：所有资源写入通过内核的 resource.write 服务完成。
 */
async function handleImageCardConfigChange(newConfig: Record<string, unknown>): Promise<void> {
  // 提取待上传的文件
  const pendingFiles = newConfig._pendingFiles as Record<string, File> | undefined;

  // 从配置中移除 _pendingFiles（不应保存到卡片配置文件）
  const cleanConfig = { ...newConfig };
  delete cleanConfig._pendingFiles;

  // 如果有待上传的文件，通过 chips:// 协议写入卡片文件夹
  if (pendingFiles && Object.keys(pendingFiles).length > 0) {
    const targetCard = getTargetCard();
    if (targetCard) {
      const cardPath = resolveTargetCardPath(targetCard);
      if (!cardPath) {
        console.error('[PluginHost] Missing card path, skip pending resource write', {
          cardId: targetCard.id,
        });
      } else if (typeof window === 'undefined' || !window.chips) {
        console.error('[PluginHost] Failed to save resources: window.chips is unavailable');
      } else {
        for (const [relativeFilePath, file] of Object.entries(pendingFiles)) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const chipsUri = `chips://card/${cardPath}/${relativeFilePath}`;
            await window.chips.invoke('resource', 'write', {
              uri: chipsUri,
              data: arrayBuffer,
            });
            console.warn(`[PluginHost] Resource saved via chips://: ${chipsUri}`);
          } catch (error) {
            console.error(`[PluginHost] Failed to save resource: ${relativeFilePath}`, error);
          }
        }
      }
    }
  }

  localConfig.value = { ...cleanConfig };
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

function buildThemeCss(): string {
  const cssText = document.documentElement.style.cssText.trim();
  return cssText ? `:root { ${cssText} }` : '';
}

function normalizePostMessageValue(
  value: unknown,
  seen: WeakMap<object, unknown> = new WeakMap()
): unknown {
  if (isRef(value)) {
    return normalizePostMessageValue(value.value, seen);
  }

  if (
    value === null
    || value === undefined
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || typeof value === 'bigint'
  ) {
    return value;
  }

  if (typeof value === 'symbol' || typeof value === 'function') {
    return undefined;
  }

  const rawValue = isProxy(value) ? toRaw(value as object) : value;
  if (typeof rawValue !== 'object' || rawValue === null) {
    return rawValue;
  }

  if (
    rawValue instanceof Date
    || rawValue instanceof RegExp
    || rawValue instanceof Blob
    || (typeof File !== 'undefined' && rawValue instanceof File)
    || rawValue instanceof ArrayBuffer
    || ArrayBuffer.isView(rawValue)
  ) {
    return rawValue;
  }

  if (seen.has(rawValue)) {
    return seen.get(rawValue);
  }

  if (Array.isArray(rawValue)) {
    const normalizedArray: unknown[] = [];
    seen.set(rawValue, normalizedArray);
    for (const item of rawValue) {
      normalizedArray.push(normalizePostMessageValue(item, seen));
    }
    return normalizedArray;
  }

  if (rawValue instanceof Map) {
    const normalizedMap = new Map<unknown, unknown>();
    seen.set(rawValue, normalizedMap);
    for (const [key, item] of rawValue.entries()) {
      const normalizedItem = normalizePostMessageValue(item, seen);
      if (normalizedItem !== undefined) {
        normalizedMap.set(key, normalizedItem);
      }
    }
    return normalizedMap;
  }

  if (rawValue instanceof Set) {
    const normalizedSet = new Set<unknown>();
    seen.set(rawValue, normalizedSet);
    for (const item of rawValue.values()) {
      const normalizedItem = normalizePostMessageValue(item, seen);
      if (normalizedItem !== undefined) {
        normalizedSet.add(normalizedItem);
      }
    }
    return normalizedSet;
  }

  const normalizedObject: Record<string, unknown> = {};
  seen.set(rawValue, normalizedObject);
  for (const [key, item] of Object.entries(rawValue as Record<string, unknown>)) {
    const normalizedItem = normalizePostMessageValue(item, seen);
    if (normalizedItem !== undefined) {
      normalizedObject[key] = normalizedItem;
    }
  }
  return normalizedObject;
}

function createCloneableMessagePayload<T>(message: T): T {
  const normalized = normalizePostMessageValue(message);
  if (typeof structuredClone === 'function') {
    return structuredClone(normalized) as T;
  }
  return JSON.parse(JSON.stringify(normalized)) as T;
}

function postMessageToIframe(message: Record<string, unknown>): boolean {
  const iframeWindow = pluginIframeRef.value?.contentWindow;
  if (!iframeWindow) {
    return false;
  }

  try {
    const cloneablePayload = createCloneableMessagePayload(message);
    iframeWindow.postMessage(cloneablePayload, getIframeTargetOrigin());
    return true;
  } catch (error) {
    console.error('[PluginHost] Failed to postMessage to iframe', {
      type: message.type,
      error,
    });
    return false;
  }
}

function toStringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== 'string') {
      return null;
    }
    result[key] = item;
  }
  return result;
}

async function fetchHostPluginVocabulary(
  pluginId: string,
  locale: string
): Promise<Record<string, string> | null> {
  if (typeof window === 'undefined' || !window.chips) {
    return null;
  }

  try {
    const response = await window.chips.invoke('i18n', 'getPluginVocabulary', {
      pluginId,
      locale,
    });

    const directVocabulary = toStringRecord(response);
    if (directVocabulary) {
      return directVocabulary;
    }

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const nestedVocabulary = toStringRecord((response as { vocabulary?: unknown }).vocabulary);
      if (nestedVocabulary) {
        return nestedVocabulary;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function loadIframeVocabulary(locale: string): Promise<Record<string, string>> {
  if (!useIframeEditor.value || !iframePluginId.value) {
    iframeVocabulary.value = {};
    iframeVocabularyVersion.value = 'init';
    return {};
  }

  const currentSequence = ++vocabularyLoadSequence;
  const pluginId = iframePluginId.value;
  const localVocabulary = await getLocalPluginVocabulary(pluginId, locale);
  const hostVocabulary = await fetchHostPluginVocabulary(pluginId, locale);
  const resolvedVocabulary: Record<string, string> = {};
  const vocabularyKeys = new Set<string>([
    ...Object.keys(localVocabulary ?? {}),
    ...Object.keys(hostVocabulary ?? {}),
  ]);

  for (const key of vocabularyKeys) {
    const hostValue = hostVocabulary?.[key];
    const localValue = localVocabulary?.[key];

    if (typeof hostValue === 'string' && hostValue.trim().length > 0) {
      if (hostValue === key) {
        if (
          typeof localValue === 'string'
          && localValue.trim().length > 0
          && localValue !== key
        ) {
          resolvedVocabulary[key] = localValue;
        }
        continue;
      }

      resolvedVocabulary[key] = hostValue;
      continue;
    }

    if (typeof localValue === 'string' && localValue.trim().length > 0) {
      resolvedVocabulary[key] = localValue;
    }
  }

  if (currentSequence !== vocabularyLoadSequence) {
    return iframeVocabulary.value;
  }

  iframeVocabulary.value = resolvedVocabulary;
  buildI18nEnvelope(locale, resolvedVocabulary);
  return resolvedVocabulary;
}

function sendIframeInit(vocabulary: Record<string, string> = iframeVocabulary.value): boolean {
  if (!useIframeEditor.value) {
    return false;
  }

  const targetCard = getTargetCard();
  const cardPath = resolveTargetCardPath(targetCard);
  const locale = editorStore.locale ?? 'zh-CN';
  const i18n = buildI18nEnvelope(locale, vocabulary);
  return postMessageToIframe({
    type: 'init',
    payload: {
      config: { ...localConfig.value },
      bridge: {
        pluginId: iframePluginId.value,
        sessionNonce: iframeSessionNonce.value,
      },
      theme: {
        css: buildThemeCss(),
        tokens: {
          themeId: uiStore.theme,
        },
      },
      resources: {
        cardId: targetCard?.id ?? '',
        cardPath,
      },
      locale: i18n.locale,
      vocabularyVersion: i18n.version,
      vocabulary,
      i18n,
    },
  });
}

function sendIframeThemeChange(): void {
  if (!useIframeEditor.value) {
    return;
  }

  postMessageToIframe({
    type: 'theme-change',
    pluginId: iframePluginId.value,
    sessionNonce: iframeSessionNonce.value,
    theme: {
      css: buildThemeCss(),
      tokens: {
        themeId: uiStore.theme,
      },
    },
  });
}

function postIframeLanguageChange(locale: string, vocabulary: Record<string, string>): void {
  const i18n = buildI18nEnvelope(locale, vocabulary);
  postMessageToIframe({
    type: 'language-change',
    locale: i18n.locale,
    vocabularyVersion: i18n.version,
    vocabulary: i18n.payload.vocabulary,
    i18n,
    pluginId: iframePluginId.value,
    sessionNonce: iframeSessionNonce.value,
  });
}

async function sendIframeLanguageChange(): Promise<void> {
  if (!useIframeEditor.value) {
    return;
  }

  const locale = editorStore.locale ?? 'zh-CN';
  const vocabulary = await loadIframeVocabulary(locale);
  postIframeLanguageChange(locale, vocabulary);
}

function toBridgeErrorPayload(error: unknown): { code: string; message: string; details?: unknown } {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Bridge invoke failed';
    const code =
      typeof candidate.code === 'string' ? candidate.code : 'BRIDGE_INVOKE_FAILED';
    return {
      code,
      message,
      ...(candidate.details !== undefined ? { details: candidate.details } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'BRIDGE_INVOKE_FAILED',
      message: error.message,
    };
  }

  return {
    code: 'BRIDGE_INVOKE_FAILED',
    message: String(error),
  };
}

function postIframeBridgeResponse(
  requestId: string,
  payload: {
    requestNonce: string;
    result?: unknown;
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
  }
): void {
  postMessageToIframe({
    type: 'bridge-response',
    pluginId: iframePluginId.value,
    sessionNonce: iframeSessionNonce.value,
    requestId,
    requestNonce: payload.requestNonce,
    ...(payload.error ? { error: payload.error } : { result: payload.result }),
  });
}

function isValidBridgeTarget(namespace: string, action: string): boolean {
  const namespacePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  const actionPattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
  return namespacePattern.test(namespace) && actionPattern.test(action);
}

async function handleIframeBridgeRequest(message: IframeBridgeRequestMessage): Promise<void> {
  if (
    typeof message.pluginId !== 'string' ||
    typeof message.sessionNonce !== 'string' ||
    typeof message.requestNonce !== 'string' ||
    typeof message.requestId !== 'string' ||
    typeof message.namespace !== 'string' ||
    typeof message.action !== 'string'
  ) {
    return;
  }

  if (
    message.pluginId !== iframePluginId.value
    || message.sessionNonce !== iframeSessionNonce.value
  ) {
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: {
        code: 'BRIDGE_TRUST_REJECTED',
        message: 'Untrusted iframe bridge envelope',
      },
    });
    return;
  }

  if (!trackConsumedRequestNonce(message.requestNonce)) {
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: {
        code: 'BRIDGE_REPLAY_BLOCKED',
        message: 'Duplicated request nonce detected',
      },
    });
    return;
  }

  if (!isValidBridgeTarget(message.namespace, message.action)) {
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: {
        code: 'BRIDGE_INVALID_TARGET',
        message: 'Invalid namespace or action',
      },
    });
    return;
  }

  await ensureIframePermissionsLoaded(message.pluginId);
  if (!hasRoutePermission(iframePermissions.value, message.namespace, message.action)) {
    console.warn('[PluginHost] iframe bridge permission denied', {
      pluginId: message.pluginId,
      namespace: message.namespace,
      action: message.action,
    });
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: {
        code: 'BRIDGE_PERMISSION_DENIED',
        message: `Card plugin is not allowed to invoke ${message.namespace}.${message.action}`,
        details: {
          pluginId: message.pluginId,
          namespace: message.namespace,
          action: message.action,
        },
      },
    });
    return;
  }

  if (typeof window === 'undefined' || !window.chips) {
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: {
        code: 'BRIDGE_UNAVAILABLE',
        message: 'window.chips is unavailable',
      },
    });
    return;
  }

  try {
    const result = await window.chips.invoke(
      message.namespace,
      message.action,
      message.params
    );
    console.debug('[PluginHost] iframe bridge invoke allowed', {
      pluginId: message.pluginId,
      namespace: message.namespace,
      action: message.action,
    });
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      result,
    });
  } catch (error) {
    postIframeBridgeResponse(message.requestId, {
      requestNonce: message.requestNonce,
      error: toBridgeErrorPayload(error),
    });
  }
}

async function handleIframeConfigUpdate(
  config: Record<string, unknown>,
  persist = true
): Promise<void> {
  if ('_pendingFiles' in config) {
    await handleImageCardConfigChange(config);
  } else {
    localConfig.value = {
      ...localConfig.value,
      ...config,
    };
    hasUnsavedChanges.value = true;
    debouncedEmitChange();
  }

  if (persist) {
    await saveConfig();
  }
}

function handleIframeEditorCancel(): void {
  hasUnsavedChanges.value = false;
  localConfig.value = { ...props.config };
}

function handleIframeResize(message: IframeResizeMessage): void {
  if (
    !pluginIframeRef.value ||
    typeof message.height !== 'number' ||
    !Number.isFinite(message.height)
  ) {
    return;
  }

  const nextHeight = Math.max(220, Math.round(message.height));
  pluginIframeRef.value.style.minHeight = `${nextHeight}px`;
}

function handleIframeMessage(event: MessageEvent): void {
  if (!pluginIframeRef.value?.contentWindow || event.source !== pluginIframeRef.value.contentWindow) {
    return;
  }

  if (!isTrustedIframeOrigin(event.origin)) {
    return;
  }

  if (typeof event.data !== 'object' || event.data === null) {
    return;
  }

  const record = event.data as Record<string, unknown>;
  if (typeof record.type !== 'string') {
    return;
  }

  if (!isTrustedIframeBridgeEnvelope(record)) {
    return;
  }

  if (record.type === 'bridge-request') {
    void handleIframeBridgeRequest(record as unknown as IframeBridgeRequestMessage);
    return;
  }

  if (record.type === 'config-update') {
    const message = record as Partial<IframeConfigUpdateMessage>;
    const update = message.config;
    if (update && typeof update === 'object' && !Array.isArray(update)) {
      const persist = message.persist !== false;
      void handleIframeConfigUpdate(update, persist);
    }
    return;
  }

  if (record.type === 'editor-cancel') {
    handleIframeEditorCancel();
    return;
  }

  if (record.type === 'resize') {
    handleIframeResize(record as unknown as IframeResizeMessage);
  }
}

async function handleIframeLoad(): Promise<void> {
  try {
    const locale = editorStore.locale ?? 'zh-CN';
    const vocabulary = await loadIframeVocabulary(locale);
    const initSent = sendIframeInit(vocabulary);
    if (!initSent) {
      throw new Error('Failed to send iframe init message');
    }
    postIframeLanguageChange(locale, vocabulary);
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    loadError.value = resolvedError;
    emit('plugin-error', resolvedError);
    console.error('[PluginHost] Failed to initialize iframe editor', resolvedError);
  }
}

/**
 * 防抖发送配置变更
 */
function debouncedEmitChange(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    emitConfigChange();
  }, DEBOUNCE_DELAY);
}

/**
 * 发送配置变更事件
 */
function emitConfigChange(): void {
  emit('config-change', { ...localConfig.value });
  
  // 更新 store 中的卡片配置
  updateStoreConfig();
}

function flushPendingConfigEmit(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  emitConfigChange();
}

/**
 * 更新 Store 中的配置
 */
function updateStoreConfig(): void {
  const targetCard = getTargetCard();
  if (!targetCard) return;
  
  const baseCardIndex = targetCard.structure.findIndex(bc => bc.id === props.baseCardId);
  if (baseCardIndex === -1) return;
  
  // 创建新的 structure 数组
  const newStructure = [...targetCard.structure];
  const currentBaseCard = newStructure[baseCardIndex];
  if (!currentBaseCard) {
    return;
  }
  newStructure[baseCardIndex] = {
    ...currentBaseCard,
    config: { ...localConfig.value },
  };
  
  // 更新 store
  cardStore.updateCardStructure(targetCard.id, newStructure);
  editorStore.markUnsaved();
}

async function persistCardConfig(): Promise<void> {
  const targetCard = getTargetCard();
  if (!targetCard) {
    return;
  }

  const cardPath = requireCardPath(
    targetCard.id,
    targetCard.filePath,
    'PluginHost.persistCardConfig',
    resourceService.workspaceRoot,
  );
  const persistedPath = await saveCardToWorkspace(targetCard, cardPath);
  if (!targetCard.filePath) {
    cardStore.updateFilePath(targetCard.id, persistedPath);
  }
  cardStore.markCardSaved(targetCard.id);
  if (!cardStore.hasModifiedCards) {
    editorStore.markSaved();
  }
}

async function persistCardConfigWithQueue(): Promise<void> {
  if (saveInFlight) {
    trailingSaveRequested = true;
    return saveInFlight;
  }

  const run = async () => {
    do {
      trailingSaveRequested = false;
      await persistCardConfig();
    } while (trailingSaveRequested);
  };

  saveInFlight = run().finally(() => {
    saveInFlight = null;
  });

  return saveInFlight;
}

/**
 * 保存配置
 */
async function saveConfig(): Promise<void> {
  if (!hasUnsavedChanges.value) return;

  try {
    flushPendingConfigEmit();
    await persistCardConfigWithQueue();
    hasUnsavedChanges.value = false;
  } catch (error) {
    hasUnsavedChanges.value = true;
    const targetCard = getTargetCard();
    const cardPath = resolveTargetCardPath(targetCard);
    console.error('[PluginHost] Failed to persist card config', {
      cardId: targetCard?.id ?? '',
      baseCardId: props.baseCardId,
      cardPath,
      error,
    });
  }
}

/**
 * 启动自动保存
 */
function startAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
  
  autoSaveTimer = setInterval(() => {
    if (hasUnsavedChanges.value) {
      saveConfig();
    }
  }, AUTO_SAVE_INTERVAL);
}

/**
 * 停止自动保存
 */
function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * 重新加载插件
 */
async function reload(): Promise<void> {
  await loadPlugin();
}

// ==================== Watchers ====================
// 监听卡片类型变化
watch(() => props.cardType, async () => {
  await loadPlugin();
});

// 监听基础卡片 ID 变化
watch(() => props.baseCardId, async () => {
  await loadPlugin();
});

// 监听外部配置变化
watch(() => props.config, (newConfig) => {
  // 只有在没有本地更改时才同步外部配置
  if (!hasUnsavedChanges.value) {
    localConfig.value = { ...newConfig };
    
    // 如果有插件，更新插件配置
    if (currentPlugin.value) {
      currentPlugin.value.setConfig(newConfig);
    }

    if (useIframeEditor.value) {
      sendIframeInit();
    }
  }
}, { deep: true });

watch(() => editorStore.locale, () => {
  void sendIframeLanguageChange();
});

watch(() => uiStore.theme, () => {
  sendIframeThemeChange();
});

// ==================== Lifecycle ====================
onMounted(async () => {
  window.addEventListener('message', handleIframeMessage);
  await nextTick();
  await loadPlugin();
  startAutoSave();
});

onUnmounted(async () => {
  window.removeEventListener('message', handleIframeMessage);
  // 清理防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (hasUnsavedChanges.value) {
    await saveConfig();
  }
  
  // 停止自动保存
  stopAutoSave();
  
  // 卸载插件
  await unloadPlugin();
});

// ==================== Expose ====================
defineExpose({
  isLoading: isLoadingInternal,
  loadError,
  currentPlugin,
  hasUnsavedChanges,
  reload,
  saveConfig,
});
</script>

<template>
  <div class="plugin-host">
    <!-- 加载状态（延迟显示，防止闪烁） -->
    <Transition name="plugin-host-fade">
      <div
        v-if="showLoading"
        class="plugin-host__loading"
      >
        <div class="plugin-host__spinner"></div>
        <span class="plugin-host__loading-text">{{ loadingText }}</span>
      </div>
    </Transition>
    
    <!-- 错误状态 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="!showLoading && loadError"
        class="plugin-host__error"
      >
        <div class="plugin-host__error-icon">⚠️</div>
        <p class="plugin-host__error-text">{{ errorText }}</p>
        <Button
          class="plugin-host__retry-btn"
          html-type="button"
          type="default"
          @click="reload"
        >
          {{ t('plugin_host.retry') }}
        </Button>
      </div>
    </Transition>
    
    <!-- 注册的编辑器组件 -->
    <div
      v-if="!isLoadingInternal && !loadError && usePluginComponent && currentEditorComponent"
      class="plugin-host__editor-component"
    >
      <component
        :is="currentEditorComponent"
        :config="localConfig"
        :initial-content="(localConfig.content_text as string) || ''"
        :options="editorOptions"
        :state="editorState"
        :on-content-change="handleEditorContentChange"
        :on-selection-change="handleSelectionChange"
        :on-focus="handleEditorFocus"
        :on-blur="handleEditorBlur"
        :on-update-config="handleImageCardConfigChange"
      />
    </div>

    <!-- iframe 编辑器 -->
    <div
      v-if="!isLoadingInternal && !loadError && useIframeEditor"
      class="plugin-host__iframe-wrapper"
    >
      <iframe
        ref="pluginIframeRef"
        class="plugin-host__iframe"
        :src="iframeEditorUrl"
        sandbox="allow-scripts allow-same-origin"
        referrerpolicy="no-referrer"
        @load="handleIframeLoad"
      />
    </div>
    
    <!-- 插件容器（用于挂载原生插件） -->
    <div
      v-show="!isLoadingInternal && !loadError && currentPlugin && !usePluginComponent"
      ref="pluginContainerRef"
      class="plugin-host__container"
    ></div>
    
    <!-- 默认编辑器 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="!isLoadingInternal && !loadError && useDefaultEditor && currentBaseCard"
        class="plugin-host__default-editor"
      >
        <DefaultEditor
          :base-card="currentBaseCard"
          :mode="'form'"
          @config-change="handleDefaultConfigChange"
        />
      </div>
    </Transition>
    
    <!-- 未保存指示器 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="hasUnsavedChanges"
        class="plugin-host__unsaved-indicator"
        :title="t('plugin_host.unsaved')"
      >
        <span class="plugin-host__unsaved-dot"></span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ==================== 容器 ==================== */
/* 编辑面板只提供容器，界面完全由插件设计 */
.plugin-host {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ==================== 加载状态 ==================== */
.plugin-host__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--chips-color-surface, #ffffff);
  z-index: 10;
}

.plugin-host__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--chips-color-border, #e0e0e0);
  border-top-color: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  animation: plugin-host-spin 0.8s linear infinite;
}

@keyframes plugin-host-spin {
  to {
    transform: rotate(360deg);
  }
}

.plugin-host__loading-text {
  margin-top: var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
}

/* ==================== 错误状态 ==================== */
.plugin-host__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 32px);
  background: var(--chips-color-surface, #ffffff);
  text-align: center;
  z-index: 10;
}

.plugin-host__error-icon {
  font-size: 48px;
  margin-bottom: var(--chips-spacing-md, 12px);
}

.plugin-host__error-text {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-error, #ef4444);
  margin: 0 0 var(--chips-spacing-md, 12px);
}

.plugin-host__retry-btn {
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-primary, #3b82f6);
  background: transparent;
  border: 1px solid var(--chips-color-primary, #3b82f6);
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  transition: background-color var(--chips-transition-fast, 0.15s) ease,
              color var(--chips-transition-fast, 0.15s) ease;
}

.plugin-host__retry-btn:hover {
  background: var(--chips-color-primary, #3b82f6);
  color: var(--chips-color-on-primary, #ffffff);
}

/* ==================== 插件容器 ==================== */
.plugin-host__container {
  flex: 1;
  overflow: auto;
}

/* ==================== 编辑器组件 ==================== */
/* 插件容器 - 布局完全由插件自己控制 */
.plugin-host__editor-component {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.plugin-host__iframe-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.plugin-host__iframe {
  flex: 1;
  width: 100%;
  min-height: 220px;
  border: 0;
  background: transparent;
}

/* ==================== 默认编辑器 ==================== */
.plugin-host__default-editor {
  flex: 1;
  overflow: auto;
}

/* ==================== 未保存指示器 ==================== */
.plugin-host__unsaved-indicator {
  position: absolute;
  top: var(--chips-spacing-sm, 8px);
  right: var(--chips-spacing-sm, 8px);
  z-index: 15;
}

.plugin-host__unsaved-dot {
  display: block;
  width: 8px;
  height: 8px;
  background: var(--chips-color-warning, #f59e0b);
  border-radius: 50%;
  animation: plugin-host-pulse 1.5s ease-in-out infinite;
}

@keyframes plugin-host-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

/* ==================== 过渡动画 ==================== */
.plugin-host-fade-enter-active,
.plugin-host-fade-leave-active {
  transition: opacity var(--chips-transition-fast, 0.15s) ease;
}

.plugin-host-fade-enter-from,
.plugin-host-fade-leave-to {
  opacity: 0;
}
</style>
