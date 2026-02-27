import React, { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { useUIStore } from '@/core/state';
import type { WindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';
import './BaseWindow.css';

export interface BaseWindowProps {
    /** 窗口配置 */
    config: WindowConfig;
    /** 是否可拖拽 */
    draggable?: boolean;
    /** 是否可缩放 */
    resizable?: boolean;
    /** 最小宽度 */
    minWidth?: number;
    /** 最小高度 */
    minHeight?: number;

    // 插槽
    header?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;

    // 事件回调
    onUpdatePosition?: (position: WindowPosition) => void;
    onUpdateSize?: (size: WindowSize) => void;
    onFocus?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
    onCollapse?: () => void;
}

export function BaseWindow(props: BaseWindowProps) {
    const {
        config,
        draggable = true,
        resizable = true,
        minWidth = 200,
        minHeight = 100,
        header,
        actions,
        children,
        onUpdatePosition,
        onUpdateSize,
        onFocus,
        onClose,
        onMinimize,
        onCollapse,
    } = props;

    // 订阅 store，判断是否聚焦
    const isFocused = useUIStore((s) => s.focusedWindowId === config.id);

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const dragInitialPositionRef = useRef({ x: 0, y: 0 });

    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef({ x: 0, y: 0 });
    const resizeInitialSizeRef = useRef({ width: 0, height: 0 });

    // ---------------- 拖拽逻辑 ----------------
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        // 忽略来自按钮的点击
        if ((e.target as HTMLElement).closest('.base-window__action')) {
            return;
        }

        if (!draggable) return;

        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        dragInitialPositionRef.current = { ...config.position };

        e.preventDefault();
    }, [draggable, config.position]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        if (onUpdatePosition) {
            onUpdatePosition({
                x: dragInitialPositionRef.current.x + deltaX,
                y: dragInitialPositionRef.current.y + deltaY,
            });
        }
    }, [isDragging, onUpdatePosition]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        } else {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // ---------------- 缩放逻辑 ----------------
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        if (!resizable) return;

        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = { x: e.clientX, y: e.clientY };
        resizeInitialSizeRef.current = { ...config.size };

        e.preventDefault();
    }, [resizable, config.size]);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;

        if (onUpdateSize) {
            onUpdateSize({
                width: Math.max(minWidth, resizeInitialSizeRef.current.width + deltaX),
                height: Math.max(minHeight, resizeInitialSizeRef.current.height + deltaY),
            });
        }
    }, [isResizing, minWidth, minHeight, onUpdateSize]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        } else {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // ---------------- 辅助方法 ----------------
    const handleFocus = useCallback(() => onFocus?.(), [onFocus]);
    const handleMinimizeClk = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onMinimize?.(); }, [onMinimize]);
    const handleCollapseClk = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onCollapse?.(); }, [onCollapse]);
    const handleCloseClk = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onClose?.(); }, [onClose]);

    // ---------------- 计算样式 ----------------
    const windowStyle = useMemo<React.CSSProperties>(() => ({
        transform: `translate(${config.position.x}px, ${config.position.y}px)`,
        width: `${config.size.width}px`,
        height: config.state === 'collapsed' ? 'auto' : `${config.size.height}px`,
        zIndex: config.zIndex,
    }), [config.position.x, config.position.y, config.size.width, config.size.height, config.state, config.zIndex]);

    const classNames = [
        'base-window',
        isDragging && 'base-window--dragging',
        isResizing && 'base-window--resizing',
        config.state === 'minimized' && 'base-window--minimized',
        config.state === 'collapsed' && 'base-window--collapsed',
        isFocused && 'base-window--focused',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            style={windowStyle}
            onMouseDown={handleFocus}
        >
            {/* 标题栏 */}
            <div
                className="base-window__header"
                onMouseDown={handleDragStart}
            >
                {header || <span className="base-window__title">{config.title}</span>}

                <div className="base-window__actions">
                    {actions || (
                        <>
                            {config.minimizable !== false && (
                                <Button
                                    className="base-window__action base-window__action--minimize"
                                    htmlType="button"
                                    type="text"
                                    aria-label={t('window.minimize')}
                                    onClick={handleMinimizeClk}
                                >
                                    <span className="base-window__action-icon">−</span>
                                </Button>
                            )}
                            <Button
                                className="base-window__action base-window__action--collapse"
                                htmlType="button"
                                type="text"
                                aria-label={config.state === 'collapsed' ? t('window.expand') : t('window.collapse')}
                                onClick={handleCollapseClk}
                            >
                                <span className="base-window__action-icon">{config.state === 'collapsed' ? '▽' : '△'}</span>
                            </Button>
                            {config.closable !== false && (
                                <Button
                                    className="base-window__action base-window__action--close"
                                    htmlType="button"
                                    type="text"
                                    aria-label={t('window.close')}
                                    onClick={handleCloseClk}
                                >
                                    <span className="base-window__action-icon">×</span>
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 内容区（收起时隐藏） */}
            <div
                className="base-window__content"
                style={{ display: config.state !== 'collapsed' ? 'flex' : 'none' }}
            >
                {children}
            </div>

            {/* 缩放手柄 */}
            {resizable && config.state === 'normal' && (
                <div
                    className="base-window__resize-handle"
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>
    );
}
