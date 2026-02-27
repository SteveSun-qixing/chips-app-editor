import React, { useState, useCallback, useMemo } from 'react';
import { useCardNest, type CardNestDragData } from '@/core';
import { t } from '@/services/i18n-service';
import { DropHighlight } from './DropHighlight';
import './NestableCard.css';

export interface NestableCardProps {
    /** 卡片 ID */
    cardId: string;
    /** 卡片名称 */
    cardName: string;
    /** 是否可以作为嵌套目标 */
    canBeTarget?: boolean;
    /** 是否可以被拖动嵌套到其他卡片 */
    canBeDragged?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 最大嵌套层级 */
    maxNestLevel?: number;
    /** 当前嵌套层级 */
    currentLevel?: number;
    children?: React.ReactNode;
    /** 卡片嵌套事件 */
    onNest?: (sourceId: string) => void;
    /** 开始拖动事件 */
    onDragStart?: () => void;
    /** 结束拖动事件 */
    onDragEnd?: (success: boolean) => void;
}

export function NestableCard(props: NestableCardProps) {
    const {
        cardId,
        cardName,
        canBeTarget = true,
        canBeDragged = true,
        disabled = false,
        maxNestLevel = 3,
        currentLevel = 0,
        children,
        onNest,
        onDragStart,
        onDragEnd,
    } = props;

    const { isNesting, draggedCard, targetCardId, canNest, startNest, setTarget, endNest, cancelNest } = useCardNest();

    const [isDragOver, setIsDragOver] = useState(false);
    const [isDraggingThis, setIsDraggingThis] = useState(false);

    const canAcceptNest = useMemo(() => {
        if (!canBeTarget || disabled) return false;
        if (currentLevel >= maxNestLevel - 1) return false;

        // 不能嵌套自己
        if (draggedCard?.cardId === cardId) return false;

        return true;
    }, [canBeTarget, disabled, currentLevel, maxNestLevel, draggedCard, cardId]);

    const isCurrentTarget = useMemo(() => {
        return isNesting && targetCardId === cardId;
    }, [isNesting, targetCardId, cardId]);

    const handleDragStart = useCallback((event: React.DragEvent) => {
        if (!canBeDragged || disabled) return;

        event.stopPropagation();

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/x-chips-card-nest', JSON.stringify({
                cardId,
                cardName,
            }));

            if (typeof Image !== 'undefined') {
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                event.dataTransfer.setDragImage(img, 0, 0);
            }
        }

        const nestData: CardNestDragData = {
            cardId,
            cardName,
        };

        startNest(nestData);
        setIsDraggingThis(true);

        onDragStart?.();
    }, [canBeDragged, disabled, cardId, cardName, startNest, onDragStart]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        if (!isNesting || !canAcceptNest) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = canAcceptNest ? 'move' : 'none';
        }
    }, [isNesting, canAcceptNest]);

    const handleDragEnter = useCallback((event: React.DragEvent) => {
        if (!isNesting) return;

        event.preventDefault();
        event.stopPropagation();

        setIsDragOver(true);
        setTarget(cardId, canAcceptNest);
    }, [isNesting, cardId, canAcceptNest, setTarget]);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const currentTarget = event.currentTarget as HTMLElement | null;

        if (relatedTarget && currentTarget?.contains(relatedTarget)) {
            return;
        }

        setIsDragOver(false);

        if (isCurrentTarget) {
            setTarget(null, false);
        }
    }, [isCurrentTarget, setTarget]);

    const handleDragEnd = useCallback(() => {
        setIsDraggingThis(false);

        const result = endNest();
        if (result) {
            onDragEnd?.(true);
        } else {
            onDragEnd?.(false);
        }
    }, [endNest, onDragEnd]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        setIsDragOver(false);

        if (!canAcceptNest || !canNest) {
            cancelNest();
            return;
        }

        const result = endNest();
        if (result && result.sourceId !== cardId) {
            onNest?.(result.sourceId);
        }
    }, [canAcceptNest, canNest, cancelNest, endNest, cardId, onNest]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent | KeyboardEvent) => {
        if (event.key === 'Escape' && isDraggingThis) {
            cancelNest();
            setIsDraggingThis(false);
            onDragEnd?.(false);
        }
    }, [isDraggingThis, cancelNest, onDragEnd]);

    const cardClassNames = [
        'nestable-card',
        isDraggingThis ? 'nestable-card--dragging' : '',
        isCurrentTarget ? 'nestable-card--target' : '',
        canAcceptNest && isDragOver ? 'nestable-card--can-accept' : '',
        !canAcceptNest && isDragOver ? 'nestable-card--cannot-accept' : '',
        disabled ? 'nestable-card--disabled' : '',
    ].filter(Boolean).join(' ');

    return (
        <DropHighlight
            active={isCurrentTarget}
            canDrop={canAcceptNest && canNest}
            type="nest"
        >
            <div
                className={cardClassNames}
                draggable={canBeDragged && !disabled}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onKeyDown={handleKeyDown}
            >
                {children}

                {/* 嵌套提示 */}
                {isCurrentTarget && canAcceptNest && (
                    <div className="nestable-card__hint">
                        <span className="nestable-card__hint-icon">📥</span>
                        <span className="nestable-card__hint-text">{t('nestable_card.hint')}</span>
                    </div>
                )}

                {/* 不可嵌套提示 */}
                {isCurrentTarget && !canAcceptNest && (
                    <div className="nestable-card__hint nestable-card__hint--error">
                        <span className="nestable-card__hint-icon">🚫</span>
                        <span className="nestable-card__hint-text">
                            {currentLevel >= maxNestLevel - 1
                                ? t('nestable_card.max_level')
                                : t('nestable_card.cannot_nest')}
                        </span>
                    </div>
                )}
            </div>
        </DropHighlight>
    );
}
