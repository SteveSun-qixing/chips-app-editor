import React, { useCallback, type ReactNode } from 'react';
import { ToolWindow } from '@/components/window';
import { Dock } from '@/components/dock';
import { useUIStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import type { ToolWindowConfig } from '@/types';
import './WindowLayer.css';

export interface WindowLayerProps {
    children?: ReactNode;
    onOpenSettings?: () => void;
    // TODO: Vue version had dynamic slot for each tool component
    // In React, we might want a renderProp or context
}

export function WindowLayer({ children, onOpenSettings }: WindowLayerProps) {
    // 获取处于非最小化状态的工具窗口
    const toolWindows = useUIStore((s) =>
        s.windowList.filter((w): w is ToolWindowConfig => w.type === 'tool' && w.state !== 'minimized')
    );

    const windowManager = useWindowManager();

    const handleToolWindowUpdate = useCallback((windowId: string, updates: Partial<ToolWindowConfig>) => {
        windowManager.updateWindow(windowId, updates);
    }, [windowManager]);

    const handleToolWindowClose = useCallback((windowId: string) => {
        windowManager.closeWindow(windowId);
    }, [windowManager]);

    const handleToolWindowFocus = useCallback((windowId: string) => {
        windowManager.focusWindow(windowId);
    }, [windowManager]);

    return (
        <div className="window-layer">
            {/* 工具窗口 */}
            {toolWindows.map((window) => (
                <ToolWindow
                    key={window.id}
                    config={window}
                    onUpdateConfig={(updates) => handleToolWindowUpdate(window.id, updates)}
                    onClose={() => handleToolWindowClose(window.id)}
                    onFocus={() => handleToolWindowFocus(window.id)}
                >
                    {/* React 版本动态组件，之后需要专门的注册机或者组件 Map 来渲染 content */}
                    {/* 这里简单展示暂位符，或直接通过插件注册的 map 渲染 */}
                    <div style={{ padding: '8px', color: '#666' }}>
                        [{window.component} Plugin Context]
                    </div>
                </ToolWindow>
            ))}

            {/* 其他窗口层内容 */}
            {children}

            {/* 程序坞 */}
            <Dock onOpenSettings={onOpenSettings} />
        </div>
    );
}
