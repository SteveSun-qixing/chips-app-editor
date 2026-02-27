import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import './DragGhost.css';

export interface DragGhostProps {
    /** 是否显示 */
    visible?: boolean;
    /** X 坐标 */
    x?: number;
    /** Y 坐标 */
    y?: number;
    /** 标题 */
    title?: string;
    /** 图标 */
    icon?: string;
    /** 类型提示 */
    typeHint?: string;
    /** 是否可放置 */
    canDrop?: boolean;
}

export function DragGhost(props: DragGhostProps) {
    const {
        visible = false,
        x = 0,
        y = 0,
        title = '',
        icon = '📄',
        typeHint = '',
        canDrop = true,
    } = props;

    const ghostStyle = useMemo(() => ({
        left: `${x}px`,
        top: `${y}px`,
    }), [x, y]);

    if (!visible) return null;

    return createPortal(
        <div
            className={`drag-ghost ${!canDrop ? 'drag-ghost--cannot-drop' : ''}`}
            style={ghostStyle}
        >
            <div className="drag-ghost__card">
                <span className="drag-ghost__icon">{icon}</span>
                <div className="drag-ghost__content">
                    <span className="drag-ghost__title">{title}</span>
                    {typeHint && <span className="drag-ghost__hint">{typeHint}</span>}
                </div>
            </div>

            {/* 状态指示 */}
            <div className="drag-ghost__status">
                {canDrop ? (
                    <span className="drag-ghost__status-icon drag-ghost__status-icon--ok">✓</span>
                ) : (
                    <span className="drag-ghost__status-icon drag-ghost__status-icon--no">✕</span>
                )}
            </div>
        </div>,
        document.body
    );
}
