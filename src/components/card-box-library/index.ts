/**
 * 卡箱库组件导出
 * @module components/card-box-library
 */

// 主组件
export { default as CardBoxLibrary } from './CardBoxLibrary.vue';

// 子组件
export { default as CardTypeGrid } from './CardTypeGrid.vue';
export { default as LayoutTypeGrid } from './LayoutTypeGrid.vue';
export { default as DragPreview } from './DragPreview.vue';

// 类型
export type {
  CardTypeDefinition,
  LayoutTypeDefinition,
  DragData,
  DragState,
} from './types';

// 数据
export {
  cardTypes,
  layoutTypes,
  searchCardTypes,
  searchLayoutTypes,
} from './data';

// 拖放创建
export {
  useDragCreate,
  useGlobalDragCreate,
  resetGlobalDragCreate,
  type UseDragCreateReturn,
} from './use-drag-create';
