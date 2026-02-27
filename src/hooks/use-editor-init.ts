/**
 * 编辑器初始化 Hook
 * @module hooks/use-editor-init
 * @description 封装编辑器应用的完整初始化流程
 *
 * 职责：
 * - 订阅插件初始化事件
 * - 初始化 i18n
 * - 初始化工作区服务
 * - 注册设置面板
 * - 初始化设置服务
 * - 注册工具窗口
 * - 订阅 Bridge 运行时事件
 * - 管理生命周期清理
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getEditorStore, getUIStore, getSettingsStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import { builtinPanelDefinitions } from '@/components/engine-settings';
import { initializeEditorI18n, t, setLocale } from '@/services/i18n-service';
import { initializeSettingsService } from '@/services/settings-service';
import { setContainerWidth, toPx } from '@/services/page-layout-service';
import { setWorkspacePaths } from '@/services/resource-service';
import { subscribeEditorRuntimeEvent } from '@/services/editor-runtime-gateway';
import {
    subscribePluginInit,
    extractLaunchFilePath,
    extractWorkspaceRoot,
    extractExternalRoot,
} from '@/utils/plugin-init';
import type { PluginInitPayload } from '@/types/plugin-init';
import type { ToolWindowConfig } from '@/types';
import { generateScopedId } from '@/utils';

// ─── 工具窗口布局常量 ─────────────────────────────────────

const TOOL_WINDOW_CPX = {
    topOffset: 20,
    leftOffset: 20,
    fileManagerWidth: 280,
    toolWindowWidth: 320,
    cardBoxWidth: 400,
    cardWindowWidth: 360,
    windowHeight: 500,
    cardBoxHeight: 300,
    cardBoxBottomOffset: 350,
} as const;

// ─── 初始化 Hook 返回值 ──────────────────────────────────

export interface UseEditorInitReturn {
    /** 是否初始化完成 */
    isReady: boolean;
    /** 错误信息 */
    errorMessage: string | null;
    /** 重试 */
    handleRetry: () => void;
}

// ─── 工具窗口注册 ────────────────────────────────────────

function initializeToolWindows(): void {
    const uiStore = getUIStore();
    const w = typeof window !== 'undefined' ? window.innerWidth : 1400;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    const topOffsetPx = toPx(TOOL_WINDOW_CPX.topOffset);
    const leftOffsetPx = toPx(TOOL_WINDOW_CPX.leftOffset);
    const fileManagerWidthPx = toPx(TOOL_WINDOW_CPX.fileManagerWidth);
    const toolWindowWidthPx = toPx(TOOL_WINDOW_CPX.toolWindowWidth);
    const cardBoxWidthPx = toPx(TOOL_WINDOW_CPX.cardBoxWidth);
    const cardWindowHeightPx = toPx(TOOL_WINDOW_CPX.windowHeight);
    const cardBoxHeightPx = toPx(TOOL_WINDOW_CPX.cardBoxHeight);
    const cardBoxBottomOffsetPx = toPx(TOOL_WINDOW_CPX.cardBoxBottomOffset);

    const fileManagerConfig: ToolWindowConfig = {
        id: generateScopedId('tool'),
        type: 'tool',
        component: 'FileManager',
        title: t('app.tool_file_manager'),
        icon: '📁',
        position: { x: leftOffsetPx, y: topOffsetPx },
        size: { width: fileManagerWidthPx, height: cardWindowHeightPx },
        state: 'normal',
        zIndex: 100,
        resizable: true,
        draggable: true,
        closable: false,
        minimizable: true,
    };

    const editPanelConfig: ToolWindowConfig = {
        id: generateScopedId('tool'),
        type: 'tool',
        component: 'EditPanel',
        title: t('app.tool_edit_panel'),
        icon: '✏️',
        position: {
            x: Math.max(leftOffsetPx, w - toolWindowWidthPx - leftOffsetPx),
            y: topOffsetPx,
        },
        size: { width: toolWindowWidthPx, height: cardWindowHeightPx },
        state: 'normal',
        zIndex: 100,
        resizable: true,
        draggable: true,
        closable: false,
        minimizable: true,
    };

    const cardBoxLibraryConfig: ToolWindowConfig = {
        id: generateScopedId('tool'),
        type: 'tool',
        component: 'CardBoxLibrary',
        title: t('app.tool_card_box_library'),
        icon: '📦',
        position: {
            x: leftOffsetPx,
            y: Math.max(topOffsetPx, h - cardBoxBottomOffsetPx),
        },
        size: { width: cardBoxWidthPx, height: cardBoxHeightPx },
        state: 'normal',
        zIndex: 100,
        resizable: true,
        draggable: true,
        closable: false,
        minimizable: true,
    };

    uiStore.addWindow(fileManagerConfig);
    uiStore.addWindow(editPanelConfig);
    uiStore.addWindow(cardBoxLibraryConfig);
}

// ─── Hook 实现 ───────────────────────────────────────────

/**
 * 编辑器初始化 Hook
 *
 * 管理完整的初始化生命周期，包括：
 * 1. 订阅插件初始化事件获取工作区路径
 * 2. 初始化 i18n、工作区、设置系统
 * 3. 注册工具窗口
 * 4. 订阅 Bridge 运行时事件
 * 5. 组件卸载时清理所有订阅
 */
export function useEditorInit(): UseEditorInitReturn {
    const [isReady, setIsReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const cleanupRef = useRef<Array<() => void>>([]);

    const handleRetry = useCallback(() => {
        globalThis.location.reload();
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function init(): Promise<void> {
            try {
                const editorStore = getEditorStore();
                const settingsStore = getSettingsStore();
                const workspaceService = useWorkspaceService();

                // 1. 初始化容器宽度
                if (typeof window !== 'undefined') {
                    setContainerWidth(window.innerWidth);
                    const handleResize = () => setContainerWidth(window.innerWidth);
                    window.addEventListener('resize', handleResize);
                    cleanupRef.current.push(() => window.removeEventListener('resize', handleResize));
                }

                // 2. 订阅插件初始化事件
                const unsubscribePluginInit = subscribePluginInit((payload: PluginInitPayload) => {
                    const workspaceRoot = extractWorkspaceRoot(payload);
                    const externalRoot = extractExternalRoot(payload);
                    if (workspaceRoot) {
                        setWorkspacePaths(workspaceRoot, externalRoot ?? '');
                    }
                    // 如果有启动文件路径且已就绪，自动打开
                    const launchFilePath = extractLaunchFilePath(payload);
                    if (launchFilePath && isReady) {
                        workspaceService.openFileByPath(launchFilePath).catch((err: unknown) => {
                            console.warn('[Chips Editor] Failed to open launch file:', err);
                        });
                    }
                });
                cleanupRef.current.push(unsubscribePluginInit);

                // 3. 初始化 i18n
                const locale = editorStore.getState().locale;
                await initializeEditorI18n(locale);

                if (cancelled) return;

                // 4. 初始化工作区服务
                await workspaceService.initialize();

                if (cancelled) return;

                // 5. 注册所有内置设置面板
                settingsStore.registerPanels(builtinPanelDefinitions);

                // 6. 初始化设置服务（恢复持久化数据、应用设置）
                await initializeSettingsService();

                if (cancelled) return;

                // 7. 注册工具窗口
                initializeToolWindows();

                // 8. 设置默认布局
                editorStore.setLayout('infinite-canvas');

                // 9. 订阅 Bridge 运行时事件
                try {
                    const uiStore = getUIStore();
                    cleanupRef.current.push(
                        subscribeEditorRuntimeEvent('theme.changed', (data: unknown) => {
                            const payload = data as Record<string, unknown> | null;
                            const themeId = typeof payload?.themeId === 'string' ? payload.themeId : null;
                            if (themeId) uiStore.setTheme(themeId);
                        }),
                    );
                    cleanupRef.current.push(
                        subscribeEditorRuntimeEvent('language.changed', (data: unknown) => {
                            const payload = data as Record<string, unknown> | null;
                            const language = typeof payload?.language === 'string' ? payload.language : null;
                            if (language) {
                                setLocale(language);
                                editorStore.setLocale(language);
                            }
                        }),
                    );
                } catch (error) {
                    console.warn('[Chips Editor] Failed to subscribe runtime events:', error);
                }

                if (cancelled) return;

                setIsReady(true);
                console.warn('[Chips Editor] 初始化完成');
            } catch (error) {
                if (!cancelled) {
                    const msg = error instanceof Error ? error.message : t('app.error_unknown');
                    setErrorMessage(msg);
                    console.error('[Chips Editor] Initialization failed:', error);
                }
            }
        }

        void init();

        return () => {
            cancelled = true;
            for (const cleanup of cleanupRef.current) {
                cleanup();
            }
            cleanupRef.current = [];
        };
    }, []); // 仅在挂载时执行一次

    return { isReady, errorMessage, handleRetry };
}
