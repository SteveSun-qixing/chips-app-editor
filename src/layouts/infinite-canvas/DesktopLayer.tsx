import React, { useCallback, type ReactNode } from 'react';
import { CardWindow } from '@/components/window';
import { useUIStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import type { CardWindowConfig } from '@/types';
import './DesktopLayer.css';

export interface DesktopLayerProps {
    children?: ReactNode;
    style?: React.CSSProperties;
}

export function DesktopLayer({ children, style }: DesktopLayerProps) {
    // 订阅 Store 获取卡片窗口列表
    const cardWindows = useUIStore((s) => {
        // 根据 _cardWindows 的逻辑，可以手动筛选，或者因为 ui.ts 导出了 selector (如果导出了)
        // 这里我们直接过滤 windowList 得到 cardWindows
        return s.windowList.filter((w): w is CardWindowConfig => w.type === 'card');
    });

    const handleCardWindowUpdate = useCallback((windowId: string, updates: Partial<CardWindowConfig>) => {
        useWindowManager().updateWindow(windowId, updates);
    }, []);

    const handleCardWindowClose = useCallback((windowId: string) => {
        useWindowManager().closeWindow(windowId);
    }, []);

    const handleCardWindowFocus = useCallback((windowId: string, cardId: string) => {
        useWindowManager().focusWindow(windowId);
        // TODO: cardStore doesn't expose a React hook with setActiveCard easily if we just wanna use the action
        // We should use `getCardStore().setActiveCard(cardId)` but wait! cardStore was rewritten to return getters/setters!
        // Let's import getCardStore
        import('@/core/state').then(({ getCardStore }) => {
            getCardStore().setActiveCard(cardId);
        });
    }, []);

    return (
        <div className="desktop-layer" style={style}>
            {/* 卡片窗口 */}
            {cardWindows.map((window) => (
                <CardWindow
                    key={window.id}
                    config={window}
                    onUpdateConfig={(updates) => handleCardWindowUpdate(window.id, updates)}
                    onClose={() => handleCardWindowClose(window.id)}
                    onFocus={() => handleCardWindowFocus(window.id, window.cardId)}
                />
            ))}

            {/* 其他桌面内容插槽 */}
            {children}
        </div>
    );
}
