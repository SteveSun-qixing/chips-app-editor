import React from 'react';
import type { CardTypeDefinition, DragData } from './types';
import { cardTypes as allCardTypes } from './data';
import { t } from '@/services/i18n-service';
import './CardTypeGrid.css';

export interface CardTypeGridProps {
    types?: CardTypeDefinition[];
    onDragStart?: (data: DragData, event: React.DragEvent) => void;
}

export function CardTypeGrid(props: CardTypeGridProps) {
    const { types = allCardTypes, onDragStart } = props;

    const handleDragStart = (type: CardTypeDefinition, event: React.DragEvent) => {
        const data: DragData = {
            type: 'card',
            typeId: type.id,
            name: t(type.name),
        };

        onDragStart?.(data, event);
    };

    return (
        <div className="card-type-grid">
            <div className="card-type-grid__items">
                {types.map((type) => (
                    <div
                        key={type.id}
                        className="card-type-grid__item"
                        draggable="true"
                        title={t(type.description)}
                        onDragStart={(e) => handleDragStart(type, e)}
                    >
                        <span className="card-type-grid__item-icon">{type.icon}</span>
                        <span className="card-type-grid__item-name">{t(type.name)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
