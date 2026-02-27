import React, { useCallback, type ReactNode } from 'react';
import { BaseWindow } from './BaseWindow';
import { useUIStore, getUIStore } from '@/core/state';
import type { ToolWindowConfig, WindowPosition, WindowSize } from '@/types';
import './ToolWindow.css';

export interface ToolWindowProps {
    /** 窗口配置 */
    config: ToolWindowConfig;
    children?: ReactNode;
    onClose?: () => void;
    onFocus?: () => void;
    onUpdateConfig?: (config: Partial<ToolWindowConfig>) => void;
}

export function ToolWindow(props: ToolWindowProps) {
    const { config, children, onClose, onFocus, onUpdateConfig } = props;

    // 订阅 store 判断是否已最小化
    const isMinimized = useUIStore((s) => s.minimizedToolIds.includes(config.id));
    const uiStore = getUIStore();

    const handleUpdatePosition = useCallback((position: WindowPosition) => {
        onUpdateConfig?.({ position });
    }, [onUpdateConfig]);

    const handleUpdateSize = useCallback((size: WindowSize) => {
        onUpdateConfig?.({ size });
    }, [onUpdateConfig]);

    const handleMinimize = useCallback(() => {
        uiStore.minimizeTool(config.id);
    }, [uiStore, config.id]);

    const handleCollapse = useCallback(() => {
        const newState = config.state === 'collapsed' ? 'normal' : 'collapsed';
        onUpdateConfig?.({ state: newState });
    }, [config.state, onUpdateConfig]);

    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    const handleFocus = useCallback(() => {
        onFocus?.();
    }, [onFocus]);

    if (isMinimized) {
        return null;
    }

    const Header = (
        <div className="tool-window__header">
            {config.icon && <span className="tool-window__icon">{config.icon}</span>}
            <span className="tool-window__title">{config.title}</span>
        </div>
    );

    return (
        <BaseWindow
            config={config}
            header={Header}
            onUpdatePosition={handleUpdatePosition}
            onUpdateSize={handleUpdateSize}
            onFocus={handleFocus}
            onClose={handleClose}
            onMinimize={handleMinimize}
            onCollapse={handleCollapse}
        >
            <div className="tool-window__content">
                {children}
            </div>
        </BaseWindow>
    );
}
