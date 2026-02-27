import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { t } from '@/services/i18n-service';
import './SidePanel.css';

export type SidePanelPosition = 'left' | 'right';

export interface SidePanelProps {
    position?: SidePanelPosition;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    expanded?: boolean;
    title?: string;
    resizable?: boolean;
    collapsedWidth?: number;
    onUpdateWidth?: (width: number) => void;
    onUpdateExpanded?: (expanded: boolean) => void;
    onResizeStart?: () => void;
    onResizeEnd?: (width: number) => void;
    headerSlot?: React.ReactNode;
    children?: React.ReactNode;
}

export function SidePanel(props: SidePanelProps) {
    const {
        position = 'left',
        width = 280,
        minWidth = 180,
        maxWidth = 480,
        expanded = true,
        title = '',
        resizable = true,
        collapsedWidth = 40,
        onUpdateWidth,
        onUpdateExpanded,
        onResizeStart,
        onResizeEnd,
        headerSlot,
        children,
    } = props;

    const [currentWidth, setCurrentWidth] = useState(width);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(0);

    const [isExpanded, setIsExpanded] = useState(expanded);
    const panelRef = useRef<HTMLElement | null>(null);

    // Sync props to state if not resizing
    useEffect(() => {
        if (!isResizing) {
            setCurrentWidth(width);
        }
    }, [width, isResizing]);

    useEffect(() => {
        setIsExpanded(expanded);
    }, [expanded]);

    const displayWidth = isExpanded ? currentWidth : collapsedWidth;

    const panelStyle = useMemo<React.CSSProperties>(() => ({
        width: `${displayWidth}px`,
        '--panel-width': `${displayWidth}px`,
    } as React.CSSProperties), [displayWidth]);

    const panelClass = useMemo(() => {
        return [
            'side-panel',
            `side-panel--${position}`,
            isExpanded ? 'side-panel--expanded' : 'side-panel--collapsed',
            isResizing ? 'side-panel--resizing' : ''
        ].filter(Boolean).join(' ');
    }, [position, isExpanded, isResizing]);

    const handleClass = useMemo(() => {
        return [
            'side-panel__resize-handle',
            `side-panel__resize-handle--${position === 'left' ? 'right' : 'left'}`
        ].join(' ');
    }, [position]);

    const toggleExpand = useCallback(() => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        onUpdateExpanded?.(nextState);
    }, [isExpanded, onUpdateExpanded]);

    const expand = useCallback(() => {
        if (!isExpanded) {
            setIsExpanded(true);
            onUpdateExpanded?.(true);
        }
    }, [isExpanded, onUpdateExpanded]);

    const handleSetWidth = useCallback((newWidth: number) => {
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        setCurrentWidth(clampedWidth);
        onUpdateWidth?.(clampedWidth);
    }, [minWidth, maxWidth, onUpdateWidth]);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const deltaX = e.clientX - resizeStartXRef.current;
        const newWidth = position === 'left'
            ? resizeStartWidthRef.current + deltaX
            : resizeStartWidthRef.current - deltaX;
        handleSetWidth(newWidth);
    }, [position, isResizing, handleSetWidth]);

    const handleResizeEnd = useCallback(() => {
        if (!isResizing) return;
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResizeEnd?.(currentWidth);
    }, [isResizing, currentWidth, onResizeEnd]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        if (!resizable || !isExpanded) return;
        e.preventDefault();
        setIsResizing(true);
        resizeStartXRef.current = e.clientX;
        resizeStartWidthRef.current = currentWidth;

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        onResizeStart?.();
    }, [resizable, isExpanded, currentWidth, onResizeStart]);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    const handleResizeDoubleClick = useCallback(() => {
        handleSetWidth(width);
    }, [handleSetWidth, width]);

    return (
        <aside
            ref={panelRef}
            className={panelClass}
            style={panelStyle}
            role="complementary"
            aria-expanded={isExpanded}
            aria-label={title || t(position === 'left' ? 'side_panel.left' : 'side_panel.right')}
        >
            {/* 面板头部 */}
            {(title || headerSlot) && (
                <header className="side-panel__header">
                    {headerSlot || <span className="side-panel__title">{title}</span>}
                    <Button
                        htmlType="button"
                        type="text"
                        className="side-panel__toggle"
                        aria-label={isExpanded ? t('side_panel.collapse') : t('side_panel.expand')}
                        onClick={toggleExpand}
                    >
                        <span className="side-panel__toggle-icon">
                            {isExpanded ? (position === 'left' ? '◀' : '▶') : (position === 'left' ? '▶' : '◀')}
                        </span>
                    </Button>
                </header>
            )}

            {/* 面板内容 */}
            <div style={{ display: isExpanded ? 'flex' : 'none' }} className="side-panel__content">
                {children}
            </div>

            {/* 收起状态时的触发区域 */}
            {!isExpanded && (
                <div
                    className="side-panel__collapsed-trigger"
                    role="button"
                    tabIndex={0}
                    aria-label={t('side_panel.expand')}
                    onClick={expand}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            expand();
                        }
                    }}
                >
                    <span className="side-panel__collapsed-icon">
                        {position === 'left' ? '▶' : '◀'}
                    </span>
                </div>
            )}

            {/* 调整大小手柄 */}
            {resizable && isExpanded && (
                <div
                    className={handleClass}
                    role="separator"
                    aria-orientation="vertical"
                    aria-valuenow={currentWidth}
                    aria-valuemin={minWidth}
                    aria-valuemax={maxWidth}
                    tabIndex={0}
                    onMouseDown={handleResizeStart}
                    onDoubleClick={handleResizeDoubleClick}
                />
            )}
        </aside>
    );
}
