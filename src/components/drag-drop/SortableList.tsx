import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useCardSort, type BaseCardDragData } from '@/core';
import { InsertIndicator } from './InsertIndicator';
import './SortableList.css';

export interface SortableItem {
    /** 项目 ID */
    id: string;
    /** 项目类型 */
    type?: string;
    /** 附加数据 */
    data?: unknown;
}

export interface SortableListProps {
    /** 项目列表 */
    items: SortableItem[];
    /** 容器 ID */
    containerId: string;
    /** 排列方向 */
    direction?: 'horizontal' | 'vertical';
    /** 是否禁用 */
    disabled?: boolean;
    /** 项目高度/宽度（用于计算插入位置） */
    itemSize?: number;
    /** 间距 */
    gap?: number;
    children?: (item: SortableItem, index: number, isDragging: boolean) => React.ReactNode;
    /** 排序完成事件 */
    onSort?: (from: number, to: number) => void;
    /** 开始拖动事件 */
    onDragStart?: (item: SortableItem, index: number) => void;
    /** 结束拖动事件 */
    onDragEnd?: (success: boolean) => void;
}

export function SortableList(props: SortableListProps) {
    const {
        items,
        containerId,
        direction = 'vertical',
        disabled = false,
        itemSize = 0,
        gap = 8,
        children,
        onSort,
        onDragStart,
        onDragEnd,
    } = props;

    const { isSorting, draggedCard, insertIndex, startSort, updateInsertIndex, endSort, cancelSort } = useCardSort();

    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

    const [localDragging, setLocalDragging] = useState(false);
    const [localDragIndex, setLocalDragIndex] = useState(-1);

    const isActive = useMemo(() => {
        return isSorting && draggedCard?.cardId === containerId;
    }, [isSorting, draggedCard, containerId]);

    const indicatorPosition = useMemo(() => {
        if (!isActive || insertIndex < 0) return 0;

        const idx = insertIndex;
        if (itemSize > 0) {
            return idx * (itemSize + gap);
        }

        const itemEls = Array.from(itemRefs.current.values());
        if (itemEls.length === 0) return 0;

        if (idx >= itemEls.length) {
            const lastItem = itemEls[itemEls.length - 1];
            if (lastItem) {
                const rect = lastItem.getBoundingClientRect();
                const containerRect = containerRef.current?.getBoundingClientRect();
                if (containerRect) {
                    return direction === 'vertical'
                        ? rect.bottom - containerRect.top + gap / 2
                        : rect.right - containerRect.left + gap / 2;
                }
            }
            return 0;
        }

        const targetItem = itemEls[idx];
        if (targetItem) {
            const rect = targetItem.getBoundingClientRect();
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                return direction === 'vertical'
                    ? rect.top - containerRect.top - gap / 2
                    : rect.left - containerRect.left - gap / 2;
            }
        }

        return 0;
    }, [isActive, insertIndex, itemSize, gap, direction]);

    const setItemRef = useCallback((id: string, el: HTMLElement | null) => {
        if (el) {
            itemRefs.current.set(id, el);
        } else {
            itemRefs.current.delete(id);
        }
    }, []);

    const calculateInsertIndex = useCallback((clientX: number, clientY: number): number => {
        const itemEntries = Array.from(itemRefs.current.entries());
        if (itemEntries.length === 0) return 0;

        for (let i = 0; i < itemEntries.length; i++) {
            const el = itemEntries[i]?.[1];
            if (!el) continue;

            const rect = el.getBoundingClientRect();
            const mid = direction === 'vertical'
                ? rect.top + rect.height / 2
                : rect.left + rect.width / 2;

            const pos = direction === 'vertical' ? clientY : clientX;

            if (pos < mid) {
                return i;
            }
        }

        return itemEntries.length;
    }, [direction]);

    const handleDragStart = useCallback((event: React.DragEvent, item: SortableItem, index: number) => {
        if (disabled) return;

        event.stopPropagation();

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.id);

            if (typeof Image !== 'undefined') {
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                event.dataTransfer.setDragImage(img, 0, 0);
            }
        }

        const sortData: BaseCardDragData = {
            cardId: containerId,
            baseCardId: item.id,
            baseCardType: item.type || 'unknown',
            originalIndex: index,
        };

        startSort(sortData);
        setLocalDragging(true);
        setLocalDragIndex(index);
        onDragStart?.(item, index);
    }, [disabled, containerId, startSort, onDragStart]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        if (!isActive || disabled) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        const newIndex = calculateInsertIndex(event.clientX, event.clientY);
        updateInsertIndex(newIndex);
    }, [isActive, disabled, calculateInsertIndex, updateInsertIndex]);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
            return;
        }
    }, []);

    const handleDragEnd = useCallback((event: React.DragEvent) => {
        event.stopPropagation();

        setLocalDragging(false);
        setLocalDragIndex(-1);

        const result = endSort();
        if (result) {
            onSort?.(result.from, result.to);
            onDragEnd?.(true);
        } else {
            onDragEnd?.(false);
        }
    }, [endSort, onSort, onDragEnd]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isActive) {
                cancelSort();
                setLocalDragging(false);
                setLocalDragIndex(-1);
                onDragEnd?.(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, cancelSort, onDragEnd]);

    useEffect(() => {
        if (!isSorting) {
            setLocalDragging(false);
            setLocalDragIndex(-1);
        }
    }, [isSorting]);

    return (
        <div
            ref={containerRef}
            className={`sortable-list sortable-list--${direction} ${isActive ? 'sortable-list--sorting' : ''} ${disabled ? 'sortable-list--disabled' : ''}`}
            style={{ gap: `${gap}px` }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {items.map((item, index) => {
                const isDragging = localDragging && localDragIndex === index;
                return (
                    <div
                        key={item.id}
                        ref={(el) => setItemRef(item.id, el)}
                        className={`sortable-list__item ${isDragging ? 'sortable-list__item--dragging' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, item, index)}
                        onDragEnd={handleDragEnd}
                    >
                        {children ? children(item, index, isDragging) : item.id}
                    </div>
                );
            })}

            <InsertIndicator
                visible={isActive && insertIndex >= 0}
                position={indicatorPosition}
                direction={direction === 'vertical' ? 'horizontal' : 'vertical'}
            />
        </div>
    );
}
