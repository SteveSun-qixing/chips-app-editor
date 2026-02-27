/**
 * 卡箱库组件导出
 * @module components/card-box-library
 */

// 主组件
export { CardBoxLibrary } from './CardBoxLibrary';

// 子组件
export { CardTypeGrid } from './CardTypeGrid';
export { LayoutTypeGrid } from './LayoutTypeGrid';
export { DragPreview } from './DragPreview';

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
