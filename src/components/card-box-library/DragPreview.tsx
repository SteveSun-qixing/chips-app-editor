import React, { useMemo } from 'react';
import type { DragData } from './types';
import { cardTypes, layoutTypes } from './data';
import { t } from '@/services/i18n-service';
import './DragPreview.css';

export interface DragPreviewProps {
    /** 拖放数据 */
    data: DragData;
    /** 位置 */
    position: { x: number; y: number };
}

export function DragPreview(props: DragPreviewProps) {
    const { data, position } = props;

    const previewInfo = useMemo(() => {
        if (data.type === 'workspace-file') {
            return {
                icon: data.fileType === 'card' ? '🃏' : '📦',
                name: data.name,
                hintType: data.fileType === 'card' ? t('common.card') : t('common.box'),
            };
        }

        const typeInfo = data.type === 'card'
            ? cardTypes.find((type) => type.id === data.typeId)
            : layoutTypes.find((type) => type.id === data.typeId);

        if (!typeInfo) return null;

        return {
            icon: typeInfo.icon,
            name: t(typeInfo.name),
            hintType: data.type === 'card' ? t('common.card') : t('common.box'),
        };
    }, [data]);

    const previewStyle = useMemo(() => ({
        left: `${position.x}px`,
        top: `${position.y}px`,
    }), [position]);

    if (!previewInfo) return null;

    return (
        <div className="drag-preview" style={previewStyle}>
            <div className="drag-preview__card">
                <span className="drag-preview__icon">{previewInfo.icon}</span>
                <span className="drag-preview__name">{previewInfo.name}</span>
            </div>
            <div className="drag-preview__hint">
                {t('drag_preview.hint', { type: previewInfo.hintType })}
            </div>
        </div>
    );
}
