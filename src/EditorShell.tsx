/**
 * 编辑器主体壳层
 * @module EditorShell
 * @description 负责显示加载/错误/就绪状态，以及布局条件渲染
 */

import React, { useState, useCallback } from 'react';
import { useEditorStore } from '@/core/state';
import { useEditorInit } from '@/hooks/use-editor-init';
import { useCardOperations } from '@/hooks/use-card-operations';
import { EditorProvider } from '@/contexts/EditorContext';
import { t } from '@/services/i18n-service';
import { InfiniteCanvas } from '@/layouts/infinite-canvas';
import { Workbench } from '@/layouts/workbench';
import './EditorShell.css';

// 引擎设置弹窗将在后续阶段迁移
// TODO: 阶段05 — 导入真实 EngineSettingsDialog




/** 引擎设置弹窗占位 */
function EngineSettingsPlaceholder(props: { visible: boolean; onClose: () => void }) {
    if (!props.visible) return null;
    return (
        <div className="settings-dialog-placeholder">
            <p>⚙️ Engine Settings</p>
            <button onClick={props.onClose}>关闭</button>
        </div>
    );
}

/**
 * 编辑器壳层组件
 *
 * 职责：
 * 1. 调用 useEditorInit() 执行初始化
 * 2. 根据初始化状态渲染 loading / error / ready
 * 3. ready 状态下根据布局类型条件渲染对应布局组件
 * 4. 通过 EditorProvider 向下提供上下文
 */
export function EditorShell() {
    const { isReady, errorMessage, handleRetry } = useEditorInit();
    const { handleDropCreate, handleEditPanelConfigChange } = useCardOperations();
    const [showEngineSettings, setShowEngineSettings] = useState(false);

    const openEngineSettings = useCallback(() => setShowEngineSettings(true), []);
    const closeEngineSettings = useCallback(() => setShowEngineSettings(false), []);

    // 读取布局类型（响应式）
    const currentLayout = useEditorStore((s) => s.currentLayout);

    // ─── Loading 状态 ──────────────────────────────────────
    if (!isReady && !errorMessage) {
        return (
            <div id="chips-editor">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p className="loading-text">{t('app.loading')}</p>
                </div>
            </div>
        );
    }

    // ─── Error 状态 ────────────────────────────────────────
    if (errorMessage) {
        return (
            <div id="chips-editor">
                <div className="error-container">
                    <p className="error-title">{t('app.error_title')}</p>
                    <p className="error-message">{errorMessage}</p>
                    <button className="retry-button" type="button" onClick={handleRetry}>
                        {t('app.error_retry')}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Ready 状态 ────────────────────────────────────────
    return (
        <EditorProvider openEngineSettings={openEngineSettings}>
            <div id="chips-editor">
                {currentLayout === 'infinite-canvas' && (
                    <InfiniteCanvas
                        onDropCreate={handleDropCreate as never}
                        onOpenSettings={openEngineSettings}
                    />
                )}

                {currentLayout === 'workbench' && <Workbench />}

                {currentLayout !== 'infinite-canvas' && currentLayout !== 'workbench' && (
                    <div className="unknown-layout">
                        <p>{t('app.layout_unknown', { layout: currentLayout })}</p>
                    </div>
                )}

                <EngineSettingsPlaceholder
                    visible={showEngineSettings}
                    onClose={closeEngineSettings}
                />
            </div>
        </EditorProvider>
    );
}
