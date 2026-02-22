/**
 * 工作台布局模块导出
 * @module layouts/workbench
 */

export { default as Workbench } from './Workbench.vue';
export { default as SidePanel } from './SidePanel.vue';
export { default as MainArea } from './MainArea.vue';
export { useWorkbenchControls } from './use-workbench';
export type {
  WorkbenchOptions,
  WorkbenchState,
  WorkbenchControlsReturn,
} from './use-workbench';
export type { SidePanelPosition } from './SidePanel.vue';
export type { TabInfo } from './MainArea.vue';
export type { WorkbenchLayoutConfig } from './Workbench.vue';
