/**
 * Chips Editor - 卡片编辑引擎
 * 应用入口文件
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { ensurePluginInitListener } from '@/utils/plugin-init';
import './styles/global.css';

// 在 Vue app mount 之前注册插件初始化事件监听器
// 确保不会错过 Bridge preload 发送的早期 chips:plugin-init 事件
ensurePluginInitListener();

// 创建应用实例
const app = createApp(App);

// 注册 Pinia 状态管理
const pinia = createPinia();
app.use(pinia);

// 挂载应用
app.mount('#app');

// 开发模式下的调试信息
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn('[Chips Editor] Development mode');
}
