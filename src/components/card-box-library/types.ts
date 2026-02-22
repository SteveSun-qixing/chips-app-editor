/**
 * 卡箱库类型定义
 * @module components/card-box-library/types
 */

/** 卡片类型定义 */
export interface CardTypeDefinition {
  /** 类型ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon: string;
  /** 描述 */
  description: string;
  /** 关键词（用于搜索） */
  keywords: string[];
}

/** 布局类型定义 */
export interface LayoutTypeDefinition {
  /** 布局ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon: string;
  /** 描述 */
  description: string;
  /** 关键词（用于搜索） */
  keywords: string[];
}

/** 卡片类型拖放数据 */
export interface CardLibraryDragData {
  /** 拖放类型 */
  type: 'card';
  /** 类型ID */
  typeId: string;
  /** 名称 */
  name: string;
}

/** 布局类型拖放数据 */
export interface LayoutLibraryDragData {
  /** 拖放类型 */
  type: 'layout';
  /** 类型ID */
  typeId: string;
  /** 名称 */
  name: string;
}

/** 卡箱库拖放数据 */
export type LibraryDragData = CardLibraryDragData | LayoutLibraryDragData;

/** 文件管理器拖放数据 */
export interface WorkspaceFileDragData {
  /** 拖放类型 */
  type: 'workspace-file';
  /** 文件 ID */
  fileId: string;
  /** 文件类型 */
  fileType: 'card' | 'box';
  /** 文件路径 */
  filePath: string;
  /** 名称 */
  name: string;
}

/** 拖放数据 */
export type DragData = LibraryDragData | WorkspaceFileDragData;

/** 拖放状态 */
export interface DragState {
  /** 是否正在拖放 */
  isDragging: boolean;
  /** 拖放数据 */
  data: DragData | null;
  /** 预览位置 */
  previewPosition: { x: number; y: number } | null;
}
