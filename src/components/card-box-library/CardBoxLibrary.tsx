import React, { useState, useCallback, useMemo } from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { CardTypeGrid } from './CardTypeGrid';
import { LayoutTypeGrid } from './LayoutTypeGrid';
import { useGlobalDragCreate } from './use-drag-create';
import { cardTypes as allCardTypes, layoutTypes as allLayoutTypes } from './data';
import type { DragData } from './types';
import { t } from '@/services/i18n-service';
import './CardBoxLibrary.css';

/** 标签页类型 */
type TabType = 'cards' | 'boxes';

export interface CardBoxLibraryProps {
    onDragStart?: (data: DragData, event: React.DragEvent) => void;
}

export function CardBoxLibrary(props: CardBoxLibraryProps) {
    const { onDragStart } = props;

    /** 当前激活的标签页 */
    const [activeTab, setActiveTab] = useState<TabType>('cards');

    /** 全局拖放创建实例 */
    const dragCreate = useGlobalDragCreate();

    /** 卡片类型列表 */
    const cardTypes = useMemo(() => allCardTypes, []);

    /** 布局类型列表 */
    const layoutTypes = useMemo(() => allLayoutTypes, []);

    /** 是否有内容 */
    const hasContent = useMemo(() => {
        if (activeTab === 'cards') {
            return cardTypes.length > 0;
        }
        return layoutTypes.length > 0;
    }, [activeTab, cardTypes, layoutTypes]);

    /**
     * 切换标签页
     */
    const switchTab = useCallback((tab: TabType) => {
        setActiveTab(tab);
    }, []);

    /**
     * 处理拖放开始
     */
    const handleDragStart = useCallback((data: DragData, event: React.DragEvent) => {
        dragCreate.startDrag(data, event.nativeEvent);
        onDragStart?.(data, event);
    }, [dragCreate, onDragStart]);

    return (
        <div className="card-box-library">
            {/* 标签页 */}
            <div className="card-box-library__tabs">
                <Button
                    className={`card-box-library__tab ${activeTab === 'cards' ? 'card-box-library__tab--active' : ''}`}
                    htmlType="button"
                    type="text"
                    onClick={() => switchTab('cards')}
                >
                    <span className="card-box-library__tab-icon">🃏</span>
                    <span className="card-box-library__tab-label">{t('card_box.tab_cards')}</span>
                </Button>
                <Button
                    className={`card-box-library__tab ${activeTab === 'boxes' ? 'card-box-library__tab--active' : ''}`}
                    htmlType="button"
                    type="text"
                    onClick={() => switchTab('boxes')}
                >
                    <span className="card-box-library__tab-icon">📦</span>
                    <span className="card-box-library__tab-label">{t('card_box.tab_boxes')}</span>
                </Button>
            </div>

            {/* 内容区域 */}
            <div className="card-box-library__content">
                {activeTab === 'cards' ? (
                    hasContent ? (
                        <CardTypeGrid types={cardTypes} onDragStart={handleDragStart} />
                    ) : (
                        <div className="card-box-library__empty">
                            <span className="card-box-library__empty-icon">📭</span>
                            <span className="card-box-library__empty-text">{t('card_box.empty_cards')}</span>
                            <span className="card-box-library__empty-hint">{t('card_box.empty_hint')}</span>
                        </div>
                    )
                ) : hasContent ? (
                    <LayoutTypeGrid types={layoutTypes} onDragStart={handleDragStart} />
                ) : (
                    <div className="card-box-library__empty">
                        <span className="card-box-library__empty-icon">📭</span>
                        <span className="card-box-library__empty-text">{t('card_box.empty_boxes')}</span>
                        <span className="card-box-library__empty-hint">{t('card_box.empty_hint')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
