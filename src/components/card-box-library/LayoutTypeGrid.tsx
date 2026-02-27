import React from 'react';
import type { LayoutTypeDefinition, DragData } from './types';
import { layoutTypes as allLayoutTypes } from './data';
import { t } from '@/services/i18n-service';
import './LayoutTypeGrid.css';

export interface LayoutTypeGridProps {
    types?: LayoutTypeDefinition[];
    onDragStart?: (data: DragData, event: React.DragEvent) => void;
}

export function LayoutTypeGrid(props: LayoutTypeGridProps) {
    const { types = allLayoutTypes, onDragStart } = props;

    const handleDragStart = (type: LayoutTypeDefinition, event: React.DragEvent) => {
        const data: DragData = {
            type: 'layout',
            typeId: type.id,
            name: t(type.name),
        };

        onDragStart?.(data, event);
    };

    return (
        <div className="layout-type-grid">
            <div className="layout-type-grid__items">
                {types.map((type) => (
                    <div
                        key={type.id}
                        className="layout-type-grid__item"
                        draggable="true"
                        title={t(type.description)}
                        onDragStart={(e) => handleDragStart(type, e)}
                    >
                        <span className="layout-type-grid__item-icon">{type.icon}</span>
                        <div className="layout-type-grid__item-info">
                            <span className="layout-type-grid__item-name">{t(type.name)}</span>
                            <span className="layout-type-grid__item-desc">{t(type.description)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
