/**
 * 拖放组件类型定义
 * @module components/drag-drop/types
 */

import type { FileDropType } from '@/core';

/** 拖放预览数据 */
export interface DragPreviewData {
  /** 标题 */
  title: string;
  /** 图标 */
  icon: string;
  /** 类型提示 */
  typeHint?: string;
}

/** 插入指示线配置 */
export interface InsertIndicatorConfig {
  /** 位置（像素） */
  position: number;
  /** 方向 */
  direction: 'horizontal' | 'vertical';
  /** 长度 */
  length?: number;
  /** 偏移量 */
  offset?: number;
}

/** 拖放区域配置 */
export interface DropZoneConfig {
  /** 区域 ID */
  id: string;
  /** 接受的文件类型 */
  acceptTypes?: FileDropType[];
  /** 是否禁用 */
  disabled?: boolean;
}

/** 排序配置 */
export interface SortConfig {
  /** 容器 ID */
  containerId: string;
  /** 方向 */
  direction: 'horizontal' | 'vertical';
  /** 是否禁用 */
  disabled?: boolean;
}

/** 嵌套配置 */
export interface NestConfig {
  /** 目标 ID */
  targetId: string;
  /** 是否可以嵌套 */
  canNest: boolean;
}

/** 拖放事件数据 */
export interface DragDropEventData {
  /** 源类型 */
  sourceType: string;
  /** 源数据 */
  sourceData: unknown;
  /** 目标 ID */
  targetId?: string;
  /** 位置 */
  position?: { x: number; y: number };
}
