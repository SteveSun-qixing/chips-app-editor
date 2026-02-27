import React, { useCallback, useMemo } from 'react';
import './DockItem.css';

export interface DockItemProps {
    /** 工具窗口 ID */
    toolId: string;
    /** 工具图标 */
    icon?: string;
    /** 工具标题 */
    title: string;
    /** 是否已最小化 */
    minimized?: boolean;
    /** 点击恢复/聚焦窗口 */
    onRestore?: (toolId: string) => void;
}

export function DockItem(props: DockItemProps) {
    const { toolId, icon, title, minimized = false, onRestore } = props;

    const displayIcon = icon || '📦';

    const handleClick = useCallback(() => {
        onRestore?.(toolId);
    }, [onRestore, toolId]);

    const className = useMemo(() => {
        return ['dock-item', minimized ? 'dock-item--minimized' : ''].filter(Boolean).join(' ');
    }, [minimized]);

    return (
        <div
            className={className}
            title={title}
            onClick={handleClick}
        >
            <span className="dock-item__icon">{displayIcon}</span>
            <div className="dock-item__tooltip">{title}</div>
        </div>
    );
}
