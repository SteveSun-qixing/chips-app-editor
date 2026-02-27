import React, { useMemo } from 'react';
import './InsertIndicator.css';

export interface InsertIndicatorProps {
    /** 是否显示 */
    visible?: boolean;
    /** 位置（像素） */
    position?: number;
    /** 方向 */
    direction?: 'horizontal' | 'vertical';
    /** 长度（像素） */
    length?: number;
    /** 偏移量 */
    offset?: number;
}

export function InsertIndicator(props: InsertIndicatorProps) {
    const {
        visible = false,
        position = 0,
        direction = 'horizontal',
        length = 0,
        offset = 0,
    } = props;

    const indicatorStyle = useMemo(() => {
        if (direction === 'horizontal') {
            return {
                top: `${position}px`,
                left: `${offset}px`,
                width: length > 0 ? `${length}px` : '100%',
                height: '2px',
                flexDirection: 'row' as const,
            };
        } else {
            return {
                left: `${position}px`,
                top: `${offset}px`,
                height: length > 0 ? `${length}px` : '100%',
                width: '2px',
                flexDirection: 'column' as const,
            };
        }
    }, [direction, position, length, offset]);

    if (!visible) return null;

    return (
        <div className="insert-indicator" style={indicatorStyle}>
            <div className="insert-indicator__dot insert-indicator__dot--start"></div>
            <div className="insert-indicator__line"></div>
            <div className="insert-indicator__dot insert-indicator__dot--end"></div>
        </div>
    );
}
