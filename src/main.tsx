/**
 * Chips Editor - 卡片编辑引擎
 * React 应用入口文件
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ensurePluginInitListener } from '@/utils/plugin-init';
import { EditorShell } from '@/EditorShell';
import './styles/global.css';

// 在 React app mount 之前注册插件初始化事件监听器
// 确保不会错过 Bridge preload 发送的早期 chips:plugin-init 事件
ensurePluginInitListener();

const rootNode = document.querySelector('#app');
if (rootNode) {
    createRoot(rootNode).render(
        <StrictMode>
            <EditorShell />
        </StrictMode>
    );
}

// 开发模式下的调试信息
if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[Chips Editor] Development mode (React)');
}
