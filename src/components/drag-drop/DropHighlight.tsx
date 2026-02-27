import React from 'react';
import './DropHighlight.css';

export interface DropHighlightProps {
    /** 是否可以放置 */
    canDrop?: boolean;
    /** 是否激活（鼠标悬停） */
    active?: boolean;
    /** 高亮类型 */
    type?: 'default' | 'nest' | 'insert';
    children?: React.ReactNode;
}

export function DropHighlight(props: DropHighlightProps) {
    const {
        canDrop = true,
        active = false,
        type = 'default',
        children,
    } = props;

    const highlightClassNames = [
        'drop-highlight',
        active ? 'drop-highlight--active' : '',
        canDrop ? 'drop-highlight--can-drop' : 'drop-highlight--cannot-drop',
        `drop-highlight--${type}`,
    ].filter(Boolean).join(' ');

    return (
        <div className={highlightClassNames}>
            {children}

            {/* 高亮边框 */}
            {active && (
                <div className="drop-highlight__border">
                    {/* 禁止图标 */}
                    {!canDrop && (
                        <div className="drop-highlight__forbidden">
                            <span className="drop-highlight__forbidden-icon">🚫</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
