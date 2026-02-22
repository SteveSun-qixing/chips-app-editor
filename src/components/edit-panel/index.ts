/**
 * 编辑面板组件导出
 * @module components/edit-panel
 */

export { default as EditPanel } from './EditPanel.vue';
export { default as PluginHost } from './PluginHost.vue';
export { default as DefaultEditor } from './DefaultEditor.vue';

// 类型导出
export type {
  EditPanelProps,
  PluginHostProps,
  DefaultEditorProps,
  EditorPlugin,
  ConfigChangeEvent,
} from './types';
