import React from 'react';
import { BaseWindow } from './BaseWindow';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';

export interface CardWindowProps {
    config: CardWindowConfig;
    onUpdateConfig?: (config: Partial<CardWindowConfig>) => void;
    onFocus?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
    onCollapse?: () => void;
}

export function CardWindow(props: CardWindowProps) {
    const { config, onUpdateConfig, onFocus, onClose, onMinimize, onCollapse } = props;

    const handleUpdatePosition = (position: WindowPosition) => {
        onUpdateConfig?.({ position });
    };

    const handleUpdateSize = (size: WindowSize) => {
        onUpdateConfig?.({ size });
    };

    // 临时占位组件
    return (
        <BaseWindow
            config={config}
            onUpdatePosition={handleUpdatePosition}
            onUpdateSize={handleUpdateSize}
            onFocus={onFocus}
            onClose={onClose}
            onMinimize={onMinimize}
            onCollapse={onCollapse}
        >
            <div style={{ padding: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '48px', opacity: 0.5 }}>🔨</span>
                <div style={{ marginTop: '8px', color: '#666' }}>CardWindow React Migration Pending</div>
            </div>
        </BaseWindow>
    );
}
