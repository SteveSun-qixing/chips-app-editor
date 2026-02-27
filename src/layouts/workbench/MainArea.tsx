import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { useCardStore, useUIStore } from '@/core/state';
import type { CardWindowConfig } from '@/types';
import { t } from '@/services/i18n-service';
import './MainArea.css';

export interface TabInfo {
    id: string;
    title: string;
    modified?: boolean;
    closable?: boolean;
    icon?: string;
}

export interface MainAreaProps {
    activeTabId?: string | null;
    showTabs?: boolean;
    emptyText?: string;
    emptyIcon?: string;
    onTabChange?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
    onTabReorder?: (fromIndex: number, toIndex: number) => void;
    onTabContextMenu?: (tabId: string, position: { x: number; y: number }) => void;
    tabContentSlot?: (tab: TabInfo, window: CardWindowConfig | null) => React.ReactNode;
    emptyActionsSlot?: React.ReactNode;
}

export function getCardIcon(_window: CardWindowConfig, cardStore: any): string {
    const baseType =
        _window.cardType ??
        cardStore.getState().openCards.get(_window.cardId)?.structure[0]?.type ??
        '';

    switch (baseType) {
        case 'RichTextCard':
            return '📝';
        case 'MarkdownCard':
            return '📚';
        case 'ImageCard':
            return '🖼️';
        case 'VideoCard':
            return '🎬';
        case 'AudioCard':
            return '🎵';
        case 'CodeCard':
            return '💻';
        default:
            return '📄';
    }
}

export function MainArea(props: MainAreaProps) {
    const {
        activeTabId = null,
        showTabs = true,
        emptyText = '',
        emptyIcon = '📄',
        onTabChange,
        onTabClose,
        onTabReorder,
        onTabContextMenu,
        tabContentSlot,
        emptyActionsSlot,
    } = props;

    const cardWindows = useUIStore((s) => s.windowList.filter((w): w is CardWindowConfig => w.type === 'card'));
    const openCards = useCardStore((s) => s.openCards);

    const [activeTab, setActiveTab] = useState(activeTabId);

    useEffect(() => {
        setActiveTab(activeTabId);
    }, [activeTabId]);

    const tabs = useMemo((): TabInfo[] => {
        return cardWindows.map((window) => ({
            id: window.cardId,
            title: window.title || window.cardId,
            modified: openCards.get(window.cardId)?.isModified ?? false,
            closable: true,
            icon: getCardIcon(window, useCardStore((s) => s)), // passing the hook object is a hack, better to use the specific state. but `getCardIcon` is a simple utility. In a real app we might put this in a helper. Just use `useCardStore` directly.
        }));
    }, [cardWindows, openCards]);

    const activeWindow = useMemo((): CardWindowConfig | null => {
        if (!activeTab) return null;
        return cardWindows.find((w) => w.cardId === activeTab) ?? null;
    }, [activeTab, cardWindows]);

    const hasTabs = tabs.length > 0;
    const emptyTextValue = emptyText || t('main_area.empty');

    const switchTab = useCallback((tabId: string) => {
        setActiveTab(tabId);
        onTabChange?.(tabId);
    }, [onTabChange]);

    const closeTab = useCallback((tabId: string, event?: React.MouseEvent) => {
        event?.stopPropagation();
        onTabClose?.(tabId);

        if (activeTab === tabId) {
            const currentIndex = tabs.findIndex((t) => t.id === tabId);
            const nextTab = tabs[currentIndex + 1] ?? tabs[currentIndex - 1];
            const nextId = nextTab?.id ?? null;
            setActiveTab(nextId);
            if (nextId) {
                onTabChange?.(nextId);
            }
        }
    }, [activeTab, tabs, onTabClose, onTabChange]);

    const handleTabMiddleClick = useCallback((tabId: string, event: React.MouseEvent) => {
        if (event.button === 1) {
            event.preventDefault();
            closeTab(tabId, event);
        }
    }, [closeTab]);

    const handleTabContextMenu = useCallback((tabId: string, event: React.MouseEvent) => {
        event.preventDefault();
        onTabContextMenu?.(tabId, { x: event.clientX, y: event.clientY });
    }, [onTabContextMenu]);

    return (
        <main className="main-area">
            {/* 标签栏 */}
            {showTabs && hasTabs && (
                <div className="main-area__tabs" role="tablist">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={[
                                'main-area__tab',
                                activeTab === tab.id ? 'main-area__tab--active' : '',
                                tab.modified ? 'main-area__tab--modified' : ''
                            ].filter(Boolean).join(' ')}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            tabIndex={activeTab === tab.id ? 0 : -1}
                            onClick={() => switchTab(tab.id)}
                            onMouseDown={(e: React.MouseEvent) => handleTabMiddleClick(tab.id, e)}
                            onContextMenu={(e: React.MouseEvent) => handleTabContextMenu(tab.id, e)}
                        >
                            {tab.icon && <span className="main-area__tab-icon">{tab.icon}</span>}
                            <span className="main-area__tab-title">{tab.title}</span>
                            {tab.modified && <span className="main-area__tab-indicator">●</span>}
                            {tab.closable && (
                                <Button
                                    className="main-area__tab-close"
                                    htmlType="button"
                                    type="text"
                                    aria-label={t('main_area.close_tab')}
                                    onClick={(e: React.MouseEvent) => closeTab(tab.id, e)}
                                >
                                    ×
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 内容区域 */}
            <div className="main-area__content">
                {hasTabs ? (
                    tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className="main-area__panel"
                            role="tabpanel"
                            aria-hidden={activeTab !== tab.id}
                            style={{ display: activeTab === tab.id ? 'block' : 'none' }}
                        >
                            {tabContentSlot ? (
                                tabContentSlot(tab, activeWindow)
                            ) : (
                                <div className="main-area__card-preview">
                                    {/* Default preview content missing without children as we used slots. For now a simple text. */}
                                    {`Preview for ${tab.title}`}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="main-area__empty">
                        <span className="main-area__empty-icon">{emptyIcon}</span>
                        <p className="main-area__empty-text">{emptyTextValue}</p>
                        {emptyActionsSlot}
                    </div>
                )}
            </div>
        </main>
    );
}
