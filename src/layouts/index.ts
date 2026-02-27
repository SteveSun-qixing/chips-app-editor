/**
 * 布局模块导出
 * @module layouts
 */

// 无限画布布局
export {
  InfiniteCanvas,
  DesktopLayer,
  WindowLayer,
  ZoomControl,
  useCanvasControls,
} from './infinite-canvas';

export type {
  CanvasControlsOptions,
  CanvasControlsReturn,
  ContentBounds,
  Point,
} from './infinite-canvas';

// 工作台布局
export {
  Workbench,
  SidePanel,
  MainArea,
  useWorkbenchControls,
} from './workbench';

export type {
  WorkbenchOptions,
  WorkbenchState,
  WorkbenchControlsReturn,
  SidePanelPosition,
  TabInfo,
  WorkbenchLayoutConfig,
} from './workbench';

// 布局切换
export { createLayoutSwitch, useLayoutSwitch } from './use-layout-switch';
export type {
  LayoutSwitchOptions,
  LayoutSwitchReturn,
} from './use-layout-switch';

/** 布局模块版本号 */
export const LAYOUTS_VERSION = '1.0.0';
