import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useCardStore } from '@/core/state';
import { PluginHost } from './PluginHost';
import type { EditPanelPosition } from './types';
import { t } from '@/services/i18n-service';
import './EditPanel.css';

// ==================== Props ====================
export interface EditPanelProps {
    /** 面板位置 */
    position?: EditPanelPosition;
    /** 面板宽度 */
    width?: number;
    /** 是否默认展开 */
    defaultExpanded?: boolean;
    /** 面板展开/收起 */
    onToggle?: (expanded: boolean) => void;
    /** 配置变更 */
    onConfigChanged?: (baseCardId: string, config: Record<string, unknown>) => void;
}

export interface EditPanelRef {
    isExpanded: boolean;
    expand: () => void;
    collapse: () => void;
    toggleExpand: () => void;
}

export const EditPanel = forwardRef<EditPanelRef, EditPanelProps>((props, ref) => {
    const {
        position = 'right',
        width = 320,
        defaultExpanded = true,
        onToggle,
        onConfigChanged,
    } = props;

    // ==================== Stores ====================
    const cardStore = useCardStore((state: any) => state);

    // ==================== State ====================
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isTransitioning, setIsTransitioning] = useState(false); // Can be used for animation states
    const [panelWidth, setPanelWidth] = useState(width);

    // ==================== Computed ====================
    const selectedBaseCard = useMemo(() => {
        const activeCard = cardStore.activeCard;
        if (!activeCard || !cardStore.selectedBaseCardId) {
            return null;
        }
        return activeCard.structure.find((bc: any) => bc.id === cardStore.selectedBaseCardId) ?? null;
    }, [cardStore.activeCard, cardStore.selectedBaseCardId]);

    const panelStyle = useMemo(() => {
        const currentWidth = isExpanded ? panelWidth : 0;
        return {
            '--panel-width': `${currentWidth}px`,
            width: `${currentWidth}px`,
        } as React.CSSProperties;
    }, [isExpanded, panelWidth]);

    const panelClass = useMemo(() => {
        return [
            'edit-panel',
            isExpanded ? 'edit-panel--expanded' : 'edit-panel--collapsed',
            isTransitioning ? 'edit-panel--transitioning' : '',
            `edit-panel--${position}`,
        ].filter(Boolean).join(' ');
    }, [isExpanded, isTransitioning, position]);

    const emptyText = useMemo(() => t('edit_panel.empty_hint'), []);
    const selectedBaseCardId = useMemo(() => selectedBaseCard?.id ?? '', [selectedBaseCard]);

    // ==================== Methods ====================
    const toggleExpand = useCallback(() => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        onToggle?.(nextState);
    }, [isExpanded, onToggle]);

    const expand = useCallback(() => {
        if (!isExpanded) {
            setIsExpanded(true);
            onToggle?.(true);
        }
    }, [isExpanded, onToggle]);

    const collapse = useCallback(() => {
        if (isExpanded) {
            setIsExpanded(false);
            onToggle?.(false);
        }
    }, [isExpanded, onToggle]);

    const handleConfigChange = useCallback((config: Record<string, unknown>) => {
        if (!cardStore.selectedBaseCardId || !cardStore.activeCardId) {
            return;
        }
        onConfigChanged?.(cardStore.selectedBaseCardId, config);
    }, [cardStore.selectedBaseCardId, cardStore.activeCardId, onConfigChanged]);

    // ==================== Effects ====================
    // 监听宽度属性变化
    useEffect(() => {
        setPanelWidth(width);
    }, [width]);

    // 选中新卡片时自动展开面板
    const prevSelectedBaseCardIdRef = React.useRef(selectedBaseCard?.id);
    useEffect(() => {
        const currentId = selectedBaseCard?.id;
        const prevId = prevSelectedBaseCardIdRef.current;

        if (currentId && !prevId) {
            expand();
        }
        prevSelectedBaseCardIdRef.current = currentId;
    }, [selectedBaseCard, expand]);

    // ==================== Expose ====================
    useImperativeHandle(ref, () => ({
        isExpanded,
        expand,
        collapse,
        toggleExpand,
    }), [isExpanded, expand, collapse, toggleExpand]);

    return (
        <div
            className={panelClass}
            style={panelStyle}
            role="complementary"
            aria-label={t('edit_panel.title')}
        >
            <div className="edit-panel__header">
                <div className="edit-panel__heading">
                    <h3 className="edit-panel__title">{t('edit_panel.title')}</h3>
                    <p className="edit-panel__subtitle">
                        {selectedBaseCardId}
                    </p>
                </div>
                <button
                    className="edit-panel__action edit-panel__action--toggle"
                    type="button"
                    aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
                    aria-expanded={isExpanded}
                    onClick={toggleExpand}
                >
                    {isExpanded ? '⟨' : '⟩'}
                </button>
            </div>

            {/* 面板内容 - 直接显示插件编辑器 */}
            {isExpanded && (
                <div className="edit-panel__content">
                    {/* 有选中卡片时显示编辑组件 */}
                    {selectedBaseCard ? (
                        <div key={selectedBaseCard.id} className="edit-panel__editor edit-panel-fade-enter-active">
                            <PluginHost
                                cardId={cardStore.activeCardId ?? undefined}
                                cardType={selectedBaseCard.type}
                                baseCardId={selectedBaseCard.id}
                                config={selectedBaseCard.config ?? {}}
                                onConfigChange={handleConfigChange}
                            />
                        </div>
                    ) : (
                        /* 空状态 */
                        <div className="edit-panel__empty edit-panel-fade-enter-active">
                            <div className="edit-panel__empty-icon">📝</div>
                            <p className="edit-panel__empty-text">{emptyText}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

EditPanel.displayName = 'EditPanel';
