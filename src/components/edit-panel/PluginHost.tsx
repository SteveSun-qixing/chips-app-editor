import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    forwardRef,
    useImperativeHandle,
    ComponentType,
} from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { useCardStore, useEditorStore, useUIStore } from '@/core/state';
import type { CardInfo } from '@/core/state/stores/card';
import { DefaultEditor } from './DefaultEditor';
import type { EditorPlugin } from './types';
import {
    getCardPluginPermissions,
    getEditorRuntime,
    getHostPluginVocabulary,
    getLocalPluginVocabulary,
} from '@/services/plugin-service';
import { t } from '@/services/i18n-service';
import { requireCardPath, resolveCardPath } from '@/services/card-path-service';
import { saveCardToWorkspace } from '@/services/card-persistence-service';
import { resourceService } from '@/services/resource-service';
import { invokeEditorRuntime } from '@/services/editor-runtime-gateway';
import {
    createRequestNonceTracker,
    generateBridgeNonce,
    getIframeTargetOrigin,
    hasRoutePermission,
    isTrustedBridgeEnvelope,
    isTrustedIframeOrigin,
    normalizePermissionToken,
    resolveIframeOrigin,
} from './plugin-host/bridge-security';
import { createIframeMessageChannel } from './plugin-host/message-channel';
import { createEditorResourceRegistry } from './plugin-host/resource-registry';
import type {
    IframeBridgeRequestMessage,
    IframeConfigUpdateMessage,
    IframeI18nEnvelope,
    IframeResizeMessage,
} from './plugin-host/types';
import { createIframeVocabularyLoader } from './plugin-host/vocabulary-loader';
import './PluginHost.css';

// ==================== Props ====================
export interface PluginHostProps {
    /** 复合卡片 ID（用于定位非活动窗口的卡片） */
    cardId?: string;
    /** 基础卡片类型 */
    cardType: string;
    /** 基础卡片 ID */
    baseCardId: string;
    /** 当前配置 */
    config: Record<string, unknown>;
    /** 配置变更 */
    onConfigChange?: (config: Record<string, unknown>) => void;
    /** 插件加载完成 */
    onPluginLoaded?: (plugin: EditorPlugin | null) => void;
    /** 插件加载失败 */
    onPluginError?: (error: Error) => void;
}

export interface PluginHostRef {
    isLoading: boolean;
    loadError: Error | null;
    currentPlugin: EditorPlugin | null;
    hasUnsavedChanges: boolean;
    reload: () => Promise<void>;
    saveConfig: () => Promise<void>;
}

const DEBOUNCE_DELAY = 300;
const AUTO_SAVE_INTERVAL = 5000;
const PERSIST_DELAY = 800;
const MAX_TRACKED_IFRAME_REQUEST_NONCES = 512;

function isValidBridgeTarget(namespace: string, action: string): boolean {
    const namespacePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    const actionPattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
    return namespacePattern.test(namespace) && actionPattern.test(action);
}

export const PluginHost = forwardRef<PluginHostRef, PluginHostProps>((props, ref) => {
    const { cardId, cardType, baseCardId, config, onConfigChange, onPluginLoaded, onPluginError } = props;

    // ==================== Stores ====================
    const cardStore = useCardStore((state: any) => state);
    const editorStore = useEditorStore((state) => state);
    const uiStore = useUIStore((state) => state);

    // ==================== State & Refs ====================
    const [currentPlugin, setCurrentPlugin] = useState<EditorPlugin | null>(null);
    const pluginContainerRef = useRef<HTMLDivElement | null>(null);
    const pluginIframeRef = useRef<HTMLIFrameElement | null>(null);

    const [iframeEditorUrl, setIframeEditorUrl] = useState('');
    const [iframePluginId, setIframePluginId] = useState('');
    const [iframeVocabulary, setIframeVocabulary] = useState<Record<string, string>>({});
    const [iframeVocabularyVersion, setIframeVocabularyVersion] = useState('init');
    const [iframeSessionNonce, setIframeSessionNonce] = useState('');
    const [iframeTrustedOrigin, setIframeTrustedOrigin] = useState<string | null>(null);
    const [iframePermissions, setIframePermissions] = useState<Set<string>>(new Set());
    const [iframePermissionsLoaded, setIframePermissionsLoaded] = useState(false);

    const [isLoadingInternal, setIsLoadingInternal] = useState(true);
    const [loadError, setLoadError] = useState<Error | null>(null);

    const loadedTypesRef = useRef(new Set<string>());
    const [runtimeMode, setRuntimeMode] = useState<'none' | 'component' | 'iframe'>('none');
    const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const saveInFlightRef = useRef<Promise<void> | null>(null);
    const trailingSaveRequestedRef = useRef(false);
    const iframePermissionLoadSequenceRef = useRef(0);

    const [currentEditorComponent, setCurrentEditorComponent] = useState<ComponentType<any> | null>(null);

    const [editorState, setEditorState] = useState({
        content: '',
        selection: null as { startOffset: number; endOffset: number; collapsed: boolean } | null,
        activeFormats: new Set<string>(),
        currentBlock: 'paragraph',
        canUndo: false,
        canRedo: false,
        isDirty: false,
        wordCount: 0,
        isFocused: false,
    });

    const resourceRegistryRef = useRef(createEditorResourceRegistry());
    const requestNonceTrackerRef = useRef(createRequestNonceTracker(MAX_TRACKED_IFRAME_REQUEST_NONCES));

    // ==================== Helpers ====================
    const getTargetCard = useCallback((): CardInfo | null => {
        if (cardId) {
            return cardStore.getCard(cardId) ?? null;
        }
        return cardStore.activeCard;
    }, [cardId, cardStore]);

    const resolveTargetCardPath = useCallback((card: CardInfo | null): string => {
        return resolveCardPath(card?.id, card?.filePath, resourceService.workspaceRoot);
    }, []);

    // ... vocabulary Loader & message channel instances
    // Note: we'll create refs or useMemo for these so they refer to the latest state correctly.
    const iframePluginIdRef = useRef(iframePluginId);
    iframePluginIdRef.current = iframePluginId;

    const iframeEditorUrlRef = useRef(iframeEditorUrl);
    iframeEditorUrlRef.current = iframeEditorUrl;

    const runtimeModeRef = useRef(runtimeMode);
    runtimeModeRef.current = runtimeMode;

    const iframeTrustedOriginRef = useRef(iframeTrustedOrigin);
    iframeTrustedOriginRef.current = iframeTrustedOrigin;

    const fetchHostPluginVocab = useCallback(async (pluginId: string, locale: string) => {
        try {
            const runtimeVocabulary = await getHostPluginVocabulary(pluginId, locale);
            if (!runtimeVocabulary) {
                return null;
            }
            return runtimeVocabulary.vocabulary;
        } catch {
            return null;
        }
    }, []);

    const vocabularyLoader = useMemo(() => createIframeVocabularyLoader({
        getPluginId: () => iframePluginIdRef.current,
        isEnabled: () => runtimeModeRef.current === 'iframe' && iframeEditorUrlRef.current.length > 0,
        getLocalVocabulary: async (pluginId, locale) => getLocalPluginVocabulary(pluginId, locale),
        getHostVocabulary: fetchHostPluginVocab,
    }), [fetchHostPluginVocab]);

    const messageChannel = useMemo(() => createIframeMessageChannel({
        getIframeWindow: () => pluginIframeRef.current?.contentWindow ?? null,
        getTargetOrigin: () => getIframeTargetOrigin(iframeTrustedOriginRef.current),
    }), []);

    const resetIframeSecurityContext = useCallback((url: string, pluginId: string) => {
        setIframeSessionNonce(generateBridgeNonce());
        setIframeTrustedOrigin(resolveIframeOrigin(url));
        setIframePermissions(new Set());
        setIframePermissionsLoaded(false);
        vocabularyLoader.reset();
        setIframeVocabularyVersion(vocabularyLoader.getCurrentVersion());
        requestNonceTrackerRef.current.reset();
    }, [vocabularyLoader]);

    const clearIframeSecurityContext = useCallback(() => {
        setIframeSessionNonce('');
        setIframeTrustedOrigin(null);
        setIframePermissions(new Set());
        setIframePermissionsLoaded(false);
        vocabularyLoader.reset();
        setIframeVocabularyVersion(vocabularyLoader.getCurrentVersion());
        requestNonceTrackerRef.current.reset();
    }, [vocabularyLoader]);

    const ensureIframePermissionsLoaded = useCallback(async (pluginId: string) => {
        if (!pluginId) {
            setIframePermissions(new Set());
            setIframePermissionsLoaded(true);
            return;
        }

        setIframePermissionsLoaded((prevLoaded) => {
            if (prevLoaded && iframePluginIdRef.current === pluginId) return prevLoaded;

            const loadSequence = ++iframePermissionLoadSequenceRef.current;
            getCardPluginPermissions(pluginId).then((permissions) => {
                if (loadSequence !== iframePermissionLoadSequenceRef.current || iframePluginIdRef.current !== pluginId) {
                    return;
                }

                const normalized = new Set(
                    Array.from(permissions.values()).map((permission) => normalizePermissionToken(permission))
                );
                setIframePermissions(normalized);
                setIframePermissionsLoaded(true);
            });

            return prevLoaded;
        });
    }, []);

    // ==================== Computed equivalents ====================
    const editorOptions = useMemo(() => {
        const targetCard = getTargetCard();
        const cardPath = resolveTargetCardPath(targetCard);
        return {
            toolbar: true,
            autoSave: true,
            cardPath,
            onResolveResource: async (resourcePath: string): Promise<string> => {
                try {
                    return await resourceRegistryRef.current.resolveByRelativePath(cardPath, resourcePath);
                } catch {
                    return '';
                }
            },
            onReleaseResolvedResource: async (resourcePath: string): Promise<void> => {
                await resourceRegistryRef.current.releaseByRelativePath(cardPath, resourcePath);
            },
        };
    }, [getTargetCard, resolveTargetCardPath]);

    const usePluginComponent = currentEditorComponent !== null;
    const useIframeEditor = runtimeMode === 'iframe' && iframeEditorUrl.length > 0;
    const useDefaultEditor = !currentPlugin && !currentEditorComponent && runtimeMode !== 'iframe';

    const currentBaseCard = useMemo(() => {
        const targetCard = getTargetCard();
        if (!targetCard) return null;
        return targetCard.structure.find(bc => bc.id === baseCardId) ?? null;
    }, [getTargetCard, baseCardId]);

    const loadingText = useMemo(() => t('plugin_host.loading'), []);
    const errorText = useMemo(() => loadError?.message ?? t('plugin_host.error'), [loadError]);

    // ==================== Actions ====================

    const updateStoreConfig = useCallback((cfg: Record<string, unknown>) => {
        const targetCard = getTargetCard();
        if (!targetCard) return;

        const baseIndex = targetCard.structure.findIndex(bc => bc.id === baseCardId);
        if (baseIndex === -1) return;

        const newStructure = [...targetCard.structure];
        const cbc = newStructure[baseIndex];
        if (!cbc) return;

        newStructure[baseIndex] = {
            ...cbc,
            config: { ...cfg },
        };

        cardStore.updateCardStructure(targetCard.id, newStructure);
        cardStore.markCardModified(targetCard.id);
    }, [getTargetCard, baseCardId, cardStore]);

    const emitConfigChange = useCallback((cfg: Record<string, unknown>) => {
        onConfigChange?.({ ...cfg });
        updateStoreConfig(cfg);
    }, [onConfigChange, updateStoreConfig]);

    const flushPendingConfigEmit = useCallback((cfg: Record<string, unknown>) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        emitConfigChange(cfg);
    }, [emitConfigChange]);

    const persistCardConfig = useCallback(async () => {
        const targetCard = getTargetCard();
        if (!targetCard) return;

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
    }, [getTargetCard, cardStore]);

    const persistCardConfigWithQueue = useCallback(async () => {
        if (saveInFlightRef.current) {
            trailingSaveRequestedRef.current = true;
            return saveInFlightRef.current;
        }

        const run = async () => {
            do {
                trailingSaveRequestedRef.current = false;
                await persistCardConfig();
            } while (trailingSaveRequestedRef.current);
        };

        saveInFlightRef.current = run().finally(() => {
            saveInFlightRef.current = null;
        });

        return saveInFlightRef.current;
    }, [persistCardConfig]);

    const latestLocalConfigRef = useRef(localConfig);
    latestLocalConfigRef.current = localConfig;

    const saveConfig = useCallback(async () => {
        if (!hasUnsavedChanges) return;

        try {
            flushPendingConfigEmit(latestLocalConfigRef.current);
            await persistCardConfigWithQueue();
            setHasUnsavedChanges(false);
        } catch (error) {
            setHasUnsavedChanges(true);
            const targetCard = getTargetCard();
            const cardPath = resolveTargetCardPath(targetCard);
            console.error('[PluginHost] Failed to persist card config', {
                cardId: targetCard?.id ?? '',
                baseCardId,
                cardPath,
                error,
            });
        }
    }, [hasUnsavedChanges, flushPendingConfigEmit, persistCardConfigWithQueue, getTargetCard, resolveTargetCardPath, baseCardId]);

    const schedulePersist = useCallback(() => {
        if (persistTimerRef.current) {
            clearTimeout(persistTimerRef.current);
        }

        persistTimerRef.current = setTimeout(() => {
            persistTimerRef.current = null;
            void saveConfig();
        }, PERSIST_DELAY);
    }, [saveConfig]);

    const debouncedEmitChange = useCallback((cfg: Record<string, unknown>) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            emitConfigChange(cfg);
        }, DEBOUNCE_DELAY);
    }, [emitConfigChange]);


    const unloadPlugin = useCallback(async () => {
        if (currentPlugin) {
            try {
                if (hasUnsavedChanges) {
                    await saveConfig();
                }
                await currentPlugin.unmount();
            } catch (error) {
                console.error('Failed to unmount plugin:', error);
            }
            setCurrentPlugin(null);
        }

        await resourceRegistryRef.current.releaseAll();

        if (pluginContainerRef.current) {
            pluginContainerRef.current.innerHTML = '';
        }

        if (pluginIframeRef.current) {
            pluginIframeRef.current.src = 'about:blank';
        }

        setIframeEditorUrl('');
        setIframePluginId('');
        setIframeVocabulary({});
        clearIframeSecurityContext();
        setRuntimeMode('none');
    }, [currentPlugin, hasUnsavedChanges, saveConfig, clearIframeSecurityContext]);

    const loadPlugin = useCallback(async () => {
        const isFirstLoad = !loadedTypesRef.current.has(cardType);

        if (isFirstLoad) {
            setIsLoadingInternal(true);
        }

        setLoadError(null);

        try {
            await unloadPlugin();

            const runtime = await getEditorRuntime(cardType);
            if (runtime?.mode === 'component' && runtime.component) {
                setCurrentEditorComponent(() => runtime.component as ComponentType<any>);
                setRuntimeMode('component');
                setCurrentPlugin(null);
                setIframeEditorUrl('');
                setIframePluginId('');
                setIframeVocabulary({});
                clearIframeSecurityContext();
                onPluginLoaded?.(null);
                loadedTypesRef.current.add(cardType);
                console.warn('[PluginHost] 加载组件模式编辑器:', cardType);
            } else if (runtime?.mode === 'iframe' && runtime.iframeUrl) {
                setCurrentEditorComponent(null);
                setRuntimeMode('iframe');
                setCurrentPlugin(null);
                setIframeEditorUrl(runtime.iframeUrl);
                setIframePluginId(runtime.pluginId);
                setIframeVocabulary({});
                resetIframeSecurityContext(runtime.iframeUrl, runtime.pluginId);
                void ensureIframePermissionsLoaded(runtime.pluginId);
                onPluginLoaded?.(null);
                loadedTypesRef.current.add(cardType);
                console.warn('[PluginHost] 加载 iframe 模式编辑器:', cardType, runtime.iframeUrl);
            } else {
                setCurrentPlugin(null);
                setCurrentEditorComponent(null);
                setRuntimeMode('none');
                setIframeEditorUrl('');
                setIframePluginId('');
                setIframeVocabulary({});
                clearIframeSecurityContext();
                onPluginLoaded?.(null);
            }

            setLocalConfig({ ...config });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setLoadError(err);
            onPluginError?.(err);
            console.error('[PluginHost] 加载插件失败:', error);
        } finally {
            setIsLoadingInternal(false);
        }
    }, [cardType, config, unloadPlugin, clearIframeSecurityContext, resetIframeSecurityContext, ensureIframePermissionsLoaded, onPluginLoaded, onPluginError]);

    const handleImageCardConfigChange = useCallback(async (newConfig: Record<string, unknown>) => {
        const pendingFiles = newConfig._pendingFiles as Record<string, File> | undefined;

        const cleanConfig = { ...newConfig };
        delete cleanConfig._pendingFiles;

        if (pendingFiles && Object.keys(pendingFiles).length > 0) {
            const targetCard = getTargetCard();
            if (targetCard) {
                const cardPath = resolveTargetCardPath(targetCard);
                if (!cardPath) {
                    console.error('[PluginHost] Missing card path, skip pending resource write', { cardId: targetCard.id });
                } else {
                    for (const [relativeFilePath, file] of Object.entries(pendingFiles)) {
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const normalizedCardPath = cardPath.replace(/\/+$/, '');
                            const normalizedRelativePath = relativeFilePath.replace(/^\/+/, '');
                            const targetPath = `${normalizedCardPath}/${normalizedRelativePath}`;
                            await resourceService.writeBinary(targetPath, arrayBuffer);
                            console.warn(`[PluginHost] Resource saved: ${targetPath}`);
                        } catch (error) {
                            console.error(`[PluginHost] Failed to save resource: ${relativeFilePath}`, error);
                        }
                    }
                }
            }
        }

        setLocalConfig(cleanConfig);
        setHasUnsavedChanges(true);
        debouncedEmitChange(cleanConfig);
        schedulePersist();
    }, [getTargetCard, resolveTargetCardPath, debouncedEmitChange, schedulePersist]);

    const handleDefaultConfigChange = useCallback((newConfig: Record<string, unknown>) => {
        const merged = { ...newConfig };
        setLocalConfig(merged);
        setHasUnsavedChanges(true);
        debouncedEmitChange(merged);
        schedulePersist();
    }, [debouncedEmitChange, schedulePersist]);

    const handleEditorContentChange = useCallback((html: string) => {
        const merged = {
            ...latestLocalConfigRef.current,
            content_text: html,
            content_source: 'inline',
        };
        setLocalConfig(merged);
        setEditorState(prev => ({
            ...prev,
            content: html,
            isDirty: true,
            wordCount: html.replace(/<[^>]*>/g, '').length,
        }));
        setHasUnsavedChanges(true);
        debouncedEmitChange(merged);
        schedulePersist();
    }, [debouncedEmitChange, schedulePersist]);

    const handleSelectionChange = useCallback((
        selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
        formats: Set<string>,
        block: string
    ) => {
        setEditorState(prev => ({
            ...prev,
            selection,
            activeFormats: formats,
            currentBlock: block,
        }));
    }, []);

    const handleEditorFocus = useCallback(() => {
        setEditorState(prev => ({ ...prev, isFocused: true }));
    }, []);

    const handleEditorBlur = useCallback(() => {
        setEditorState(prev => ({ ...prev, isFocused: false }));
    }, []);

    // ====== iframe helpers ======
    const buildThemeCss = useCallback(() => {
        const cssText = document.documentElement.style.cssText.trim();
        return cssText ? `:root { ${cssText} }` : '';
    }, []);

    const postMessageToIframe = useCallback((message: Record<string, unknown>) => {
        const posted = messageChannel.post(message);
        if (!posted) {
            console.error('[PluginHost] Failed to postMessage to iframe', { type: message.type });
        }
        return posted;
    }, [messageChannel]);

    const loadIframeVocabulary = useCallback(async (locale: string) => {
        const resolvedVocabulary = await vocabularyLoader.load(locale);
        setIframeVocabulary(resolvedVocabulary);
        return resolvedVocabulary;
    }, [vocabularyLoader]);

    const buildI18nEnvelope = useCallback((locale: string, vocabulary: Record<string, string>) => {
        const envelope = vocabularyLoader.buildEnvelope(locale, vocabulary);
        setIframeVocabularyVersion(envelope.version);
        return envelope;
    }, [vocabularyLoader]);

    const sendIframeInit = useCallback((vocabulary: Record<string, string> = iframeVocabulary) => {
        if (!useIframeEditor) return false;

        const targetCard = getTargetCard();
        const cardPath = resolveTargetCardPath(targetCard);
        const locale = editorStore.locale ?? 'zh-CN';
        const i18n = buildI18nEnvelope(locale, vocabulary);
        return postMessageToIframe({
            type: 'init',
            payload: {
                config: { ...latestLocalConfigRef.current },
                bridge: {
                    pluginId: iframePluginId,
                    sessionNonce: iframeSessionNonce,
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
    }, [useIframeEditor, getTargetCard, resolveTargetCardPath, editorStore.locale, buildI18nEnvelope, iframePluginId, iframeSessionNonce, buildThemeCss, uiStore.theme, postMessageToIframe, iframeVocabulary]);

    const sendIframeThemeChange = useCallback(() => {
        if (!useIframeEditor) return;

        postMessageToIframe({
            type: 'theme-change',
            pluginId: iframePluginId,
            sessionNonce: iframeSessionNonce,
            theme: {
                css: buildThemeCss(),
                tokens: {
                    themeId: uiStore.theme,
                },
            },
        });
    }, [useIframeEditor, iframePluginId, iframeSessionNonce, buildThemeCss, uiStore.theme, postMessageToIframe]);

    const postIframeLanguageChange = useCallback((locale: string, vocabulary: Record<string, string>) => {
        const i18n = buildI18nEnvelope(locale, vocabulary);
        postMessageToIframe({
            type: 'language-change',
            locale: i18n.locale,
            vocabularyVersion: i18n.version,
            vocabulary: i18n.payload.vocabulary,
            i18n,
            pluginId: iframePluginId,
            sessionNonce: iframeSessionNonce,
        });
    }, [buildI18nEnvelope, iframePluginId, iframeSessionNonce, postMessageToIframe]);

    const sendIframeLanguageChange = useCallback(async () => {
        if (!useIframeEditor) return;

        const locale = editorStore.locale ?? 'zh-CN';
        const vocabulary = await loadIframeVocabulary(locale);
        postIframeLanguageChange(locale, vocabulary);
    }, [useIframeEditor, editorStore.locale, loadIframeVocabulary, postIframeLanguageChange]);

    const postIframeBridgeResponse = useCallback((
        requestId: string,
        payload: {
            requestNonce: string;
            result?: unknown;
            error?: {
                code: string;
                message: string;
                details?: unknown;
                retryable?: boolean;
            };
        }
    ) => {
        postMessageToIframe({
            type: 'bridge-response',
            pluginId: iframePluginId,
            sessionNonce: iframeSessionNonce,
            requestId,
            requestNonce: payload.requestNonce,
            ...(payload.error ? { error: payload.error } : { result: payload.result }),
        });
    }, [iframePluginId, iframeSessionNonce, postMessageToIframe]);

    const handleIframeConfigUpdate = useCallback(async (cfg: Record<string, unknown>, persist = true) => {
        if ('_pendingFiles' in cfg) {
            await handleImageCardConfigChange(cfg);
        } else {
            const merged = { ...latestLocalConfigRef.current, ...cfg };
            setLocalConfig(merged);
            setHasUnsavedChanges(true);
            debouncedEmitChange(merged);
        }

        if (persist) {
            await saveConfig();
        } else {
            schedulePersist();
        }
    }, [handleImageCardConfigChange, debouncedEmitChange, saveConfig, schedulePersist]);

    const handleIframeEditorCancel = useCallback(() => {
        setHasUnsavedChanges(false);
        setLocalConfig({ ...config });
    }, [config]);

    const handleIframeLoad = useCallback(async () => {
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
            setLoadError(resolvedError);
            onPluginError?.(resolvedError);
            console.error('[PluginHost] Failed to initialize iframe editor', resolvedError);
        }
    }, [editorStore.locale, loadIframeVocabulary, sendIframeInit, postIframeLanguageChange, onPluginError]);

    const toBridgeErrorPayload = useCallback((error: unknown): {
        code: string;
        message: string;
        details?: unknown;
        retryable?: boolean;
    } => {
        if (typeof error === 'object' && error !== null) {
            const candidate = error as Record<string, unknown>;
            const message = typeof candidate.message === 'string' ? candidate.message : 'Bridge invoke failed';
            const code = typeof candidate.code === 'string' ? candidate.code : 'BRIDGE_INVOKE_FAILED';
            return {
                code,
                message,
                ...(candidate.details !== undefined ? { details: candidate.details } : {}),
                ...(typeof candidate.retryable === 'boolean' ? { retryable: candidate.retryable } : {}),
            };
        }

        if (error instanceof Error) {
            return { code: 'BRIDGE_INVOKE_FAILED', message: error.message };
        }

        return { code: 'BRIDGE_INVOKE_FAILED', message: String(error) };
    }, []);

    const handleIframeBridgeRequest = useCallback(async (message: IframeBridgeRequestMessage) => {
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
            message.pluginId !== iframePluginId
            || message.sessionNonce !== iframeSessionNonce
        ) {
            postIframeBridgeResponse(message.requestId, {
                requestNonce: message.requestNonce,
                error: { code: 'BRIDGE_TRUST_REJECTED', message: 'Untrusted iframe bridge envelope' },
            });
            return;
        }

        if (!requestNonceTrackerRef.current.track(message.requestNonce)) {
            postIframeBridgeResponse(message.requestId, {
                requestNonce: message.requestNonce,
                error: { code: 'BRIDGE_REPLAY_BLOCKED', message: 'Duplicated request nonce detected' },
            });
            return;
        }

        if (!isValidBridgeTarget(message.namespace, message.action)) {
            postIframeBridgeResponse(message.requestId, {
                requestNonce: message.requestNonce,
                error: { code: 'BRIDGE_INVALID_TARGET', message: 'Invalid namespace or action' },
            });
            return;
        }

        await ensureIframePermissionsLoaded(message.pluginId);

        // Check permission from state updater or ref if state is stale
        setIframePermissions(perms => {
            if (!hasRoutePermission(perms, message.namespace, message.action)) {
                console.warn('[PluginHost] iframe bridge permission denied', { pluginId: message.pluginId, namespace: message.namespace, action: message.action });
                postIframeBridgeResponse(message.requestId, {
                    requestNonce: message.requestNonce,
                    error: {
                        code: 'BRIDGE_PERMISSION_DENIED',
                        message: `Card plugin is not allowed to invoke ${message.namespace}.${message.action}`,
                        details: { pluginId: message.pluginId, namespace: message.namespace, action: message.action },
                    },
                });
            } else {
                invokeEditorRuntime(message.namespace, message.action, message.params)
                    .then(result => {
                        console.debug('[PluginHost] iframe bridge invoke allowed', { pluginId: message.pluginId, namespace: message.namespace, action: message.action });
                        postIframeBridgeResponse(message.requestId, { requestNonce: message.requestNonce, result });
                    })
                    .catch(error => {
                        postIframeBridgeResponse(message.requestId, { requestNonce: message.requestNonce, error: toBridgeErrorPayload(error) });
                    });
            }
            return perms;
        });
    }, [iframePluginId, iframeSessionNonce, ensureIframePermissionsLoaded, postIframeBridgeResponse, toBridgeErrorPayload]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!pluginIframeRef.current?.contentWindow || event.source !== pluginIframeRef.current.contentWindow) return;
            if (!isTrustedIframeOrigin(event.origin, iframeTrustedOriginRef.current)) return;
            if (typeof event.data !== 'object' || event.data === null) return;

            const record = event.data as Record<string, unknown>;
            if (typeof record.type !== 'string') return;
            if (!isTrustedBridgeEnvelope(record, iframePluginIdRef.current, iframeSessionNonce)) return;

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
                const msg = record as unknown as IframeResizeMessage;
                if (pluginIframeRef.current && typeof msg.height === 'number' && Number.isFinite(msg.height)) {
                    const nextHeight = Math.max(220, Math.round(msg.height));
                    pluginIframeRef.current.style.minHeight = `${nextHeight}px`;
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [iframeSessionNonce, handleIframeBridgeRequest, handleIframeConfigUpdate, handleIframeEditorCancel]);

    // watch cardType, baseCardId changes
    useEffect(() => {
        loadPlugin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardType, baseCardId]);

    // config changes from props
    useEffect(() => {
        if (!hasUnsavedChanges) {
            setLocalConfig(config);
            if (currentPlugin) {
                currentPlugin.setConfig?.(config);
            }
            if (runtimeMode === 'iframe' && iframeEditorUrl.length > 0) {
                sendIframeInit(iframeVocabulary); // Should recreate if needed or cache
            }
        }
    }, [config, hasUnsavedChanges, currentPlugin, runtimeMode, iframeEditorUrl, sendIframeInit, iframeVocabulary]);

    useEffect(() => {
        sendIframeLanguageChange();
    }, [editorStore.locale, sendIframeLanguageChange]);

    useEffect(() => {
        sendIframeThemeChange();
    }, [uiStore.theme, sendIframeThemeChange]);

    const startAutoSave = useCallback(() => {
        if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setInterval(() => {
            setHasUnsavedChanges(prev => {
                if (prev) {
                    saveConfig();
                }
                return prev;
            });
        }, AUTO_SAVE_INTERVAL);
    }, [saveConfig]);

    const stopAutoSave = useCallback(() => {
        if (autoSaveTimerRef.current) {
            clearInterval(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        loadPlugin();
        startAutoSave();
        return () => {
            const clearPersistTimer = () => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
            };
            clearPersistTimer();
            setHasUnsavedChanges(prev => {
                if (prev) saveConfig();
                return prev;
            });
            stopAutoSave();
            unloadPlugin();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
        isLoading: isLoadingInternal,
        loadError,
        currentPlugin,
        hasUnsavedChanges,
        reload: loadPlugin,
        saveConfig,
    }), [isLoadingInternal, loadError, currentPlugin, hasUnsavedChanges, loadPlugin, saveConfig]);

    return (
        <div className="plugin-host">
            {/* 加载状态 */}
            {isLoadingInternal && (
                <div className="plugin-host__loading plugin-host-fade-enter-active">
                    <div className="plugin-host__spinner"></div>
                    <span className="plugin-host__loading-text">{loadingText}</span>
                </div>
            )}

            {/* 错误状态 */}
            {!isLoadingInternal && loadError && (
                <div className="plugin-host__error plugin-host-fade-enter-active">
                    <div className="plugin-host__error-icon">⚠️</div>
                    <p className="plugin-host__error-text">{errorText}</p>
                    <Button
                        className="plugin-host__retry-btn"
                        htmlType="button"
                        type="default"
                        onClick={loadPlugin}
                    >
                        {t('plugin_host.retry')}
                    </Button>
                </div>
            )}

            {/* 注册的编辑器组件 */}
            {!isLoadingInternal && !loadError && usePluginComponent && currentEditorComponent && (
                <div className="plugin-host__editor-component">
                    {React.createElement(currentEditorComponent, {
                        config: localConfig,
                        initialContent: (localConfig.content_text as string) || '',
                        options: editorOptions,
                        state: editorState,
                        onContentChange: handleEditorContentChange,
                        onSelectionChange: handleSelectionChange,
                        onFocus: handleEditorFocus,
                        onBlur: handleEditorBlur,
                        onUpdateConfig: handleImageCardConfigChange,
                    })}
                </div>
            )}

            {/* iframe 编辑器 */}
            {!isLoadingInternal && !loadError && useIframeEditor && (
                <div className="plugin-host__iframe-wrapper">
                    <iframe
                        ref={pluginIframeRef}
                        className="plugin-host__iframe"
                        src={iframeEditorUrl}
                        sandbox="allow-scripts allow-same-origin"
                        referrerPolicy="no-referrer"
                        onLoad={handleIframeLoad}
                    />
                </div>
            )}

            {/* 插件容器（用于挂载原生插件） */}
            <div
                style={{ display: !isLoadingInternal && !loadError && currentPlugin && !usePluginComponent ? 'block' : 'none' }}
                ref={pluginContainerRef}
                className="plugin-host__container"
            ></div>

            {/* 默认编辑器 */}
            {!isLoadingInternal && !loadError && useDefaultEditor && currentBaseCard && (
                <div className="plugin-host__default-editor plugin-host-fade-enter-active">
                    <DefaultEditor
                        baseCard={currentBaseCard}
                        mode={'form'}
                        onConfigChange={handleDefaultConfigChange}
                    />
                </div>
            )}

            {/* 未保存指示器 */}
            {hasUnsavedChanges && (
                <div className="plugin-host__unsaved-indicator plugin-host-fade-enter-active" title={t('plugin_host.unsaved')}>
                    <span className="plugin-host__unsaved-dot"></span>
                </div>
            )}
        </div>
    );
});

PluginHost.displayName = 'PluginHost';
