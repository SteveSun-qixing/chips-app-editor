/**
 * 编辑器上下文 Provider
 * @module contexts/EditorContext
 * @description 提供编辑器核心服务给子组件树，替代 Vue provide/inject
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getEditorStore, getCardStore, getUIStore, getSettingsStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import { useWorkspaceService } from '@/core/workspace-service';

/**
 * 编辑器上下文值接口
 */
export interface EditorContextValue {
    editorStore: ReturnType<typeof getEditorStore>;
    cardStore: ReturnType<typeof getCardStore>;
    uiStore: ReturnType<typeof getUIStore>;
    settingsStore: ReturnType<typeof getSettingsStore>;
    windowManager: ReturnType<typeof useWindowManager>;
    workspaceService: ReturnType<typeof useWorkspaceService>;
    openEngineSettings: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/**
 * EditorProvider Props
 */
interface EditorProviderProps {
    children: ReactNode;
    openEngineSettings: () => void;
}

/**
 * 编辑器上下文 Provider
 *
 * 将核心 Store 和服务实例注入 React 组件树。
 * 子组件通过 useEditorContext() 获取。
 */
export function EditorProvider({ children, openEngineSettings }: EditorProviderProps) {
    const value = useMemo<EditorContextValue>(
        () => ({
            editorStore: getEditorStore(),
            cardStore: getCardStore(),
            uiStore: getUIStore(),
            settingsStore: getSettingsStore(),
            windowManager: useWindowManager(),
            workspaceService: useWorkspaceService(),
            openEngineSettings,
        }),
        [openEngineSettings],
    );

    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

/**
 * 获取编辑器上下文（consumer hook）
 *
 * @throws 如果在 EditorProvider 外调用
 */
export function useEditorContext(): EditorContextValue {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorContext must be used within <EditorProvider>');
    }
    return context;
}
