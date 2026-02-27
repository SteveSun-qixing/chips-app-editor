import React, { useMemo, useCallback } from 'react';
import { useUIStore, getUIStore } from '@/core/state';
import { DockItem } from './DockItem';
import type { ToolWindowConfig } from '@/types';
import { t } from '@/services/i18n-service';
import './Dock.css';

export interface DockProps {
    onOpenSettings?: () => void;
}

export function Dock({ onOpenSettings }: DockProps) {
    // 程序坞是否可见
    const visible = useUIStore((s) => s.dockVisible);

    // 程序坞位置
    const position = useUIStore((s) => s.dockPosition);

    // 获取所有工具窗口列表（始终显示所有工具窗口）
    const allTools = useUIStore((s) => s.windowList.filter((w): w is ToolWindowConfig => w.type === 'tool'));

    // 依赖 getUIStore() 而不绑定在 useUIStore 以避免无谓刷新。
    // 但是 minimized 状态需要刷新。因此我们可以再取 minimizedToolIds
    const minimizedIds = useUIStore((s) => s.minimizedToolIds);
    const uiStore = getUIStore();

    const handleToolClick = useCallback((toolId: string) => {
        const tool = uiStore.getWindow(toolId);
        if (tool?.state === 'minimized') {
            uiStore.restoreTool(toolId);
        } else {
            uiStore.focusWindow(toolId);
        }
    }, [uiStore]);

    const className = useMemo(() => {
        return ['dock', `dock--${position}`].filter(Boolean).join(' ');
    }, [position]);

    if (!visible) return null;

    return (
        <div className={className}>
            {/* 工具窗口图标 */}
            {allTools.map((tool) => (
                <DockItem
                    key={tool.id}
                    toolId={tool.id}
                    icon={tool.icon}
                    title={tool.title || ''}
                    minimized={minimizedIds.includes(tool.id)}
                    onRestore={handleToolClick}
                />
            ))}

            {/* 分隔线 */}
            {allTools.length > 0 && <div className="dock__divider" />}

            {/* 引擎设置按钮 */}
            <DockItem
                toolId="__engine-settings__"
                icon="⚙️"
                title={t('engine_settings.title')}
                minimized={false}
                onRestore={onOpenSettings}
            />
        </div>
    );
}
