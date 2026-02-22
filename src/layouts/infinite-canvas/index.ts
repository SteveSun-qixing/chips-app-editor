/**
 * 无限画布布局模块导出
 * @module layouts/infinite-canvas
 */

export { default as InfiniteCanvas } from './InfiniteCanvas.vue';
export { default as DesktopLayer } from './DesktopLayer.vue';
export { default as WindowLayer } from './WindowLayer.vue';
export { default as ZoomControl } from './ZoomControl.vue';
export { useCanvasControls } from './use-canvas';
export type {
  CanvasControlsOptions,
  CanvasControlsReturn,
  ContentBounds,
  Point,
} from './use-canvas';
