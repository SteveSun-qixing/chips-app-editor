/**
 * 拖放管理器
 * @module core/drag-drop-manager
 * @description 统一管理编辑器中的所有拖放操作
 */

import { ref, readonly, type Ref } from 'vue';

// ==================== 类型定义 ====================

/** 拖放源类型 */
export type DragSourceType =
  | 'file'           // 从操作系统拖入的文件
  | 'card-library'   // 从卡箱库拖出的卡片类型
  | 'layout-library' // 从卡箱库拖出的布局类型
  | 'base-card'      // 从卡片内拖动基础卡片
  | 'card';          // 拖动整个卡片

/** 拖放目标类型 */
export type DropTargetType =
  | 'canvas'         // 画布空白区域
  | 'card'           // 卡片（用于嵌套）
  | 'card-slot'      // 卡片内的插槽位置
  | 'trash';         // 垃圾桶（删除）

/** 拖放效果 */
export type DropEffect = 'copy' | 'move' | 'link' | 'none';

/** 文件类型 */
export type FileDropType =
  | 'image'          // 图片文件
  | 'video'          // 视频文件
  | 'audio'          // 音频文件
  | 'card-file'      // 卡片文件 (.chip)
  | 'box-file'       // 箱子文件 (.box)
  | 'document'       // 文档文件
  | 'unknown';       // 未知类型

/** 拖放源配置 */
export interface DragSourceConfig {
  /** 拖放源类型 */
  type: DragSourceType;
  /** 数据 */
  data: unknown;
  /** 允许的目标类型 */
  allowedTargets?: DropTargetType[];
  /** 拖放效果 */
  effect?: DropEffect;
  /** 是否可以拖动 */
  canDrag?: () => boolean;
  /** 开始拖动回调 */
  onDragStart?: () => void;
  /** 拖动结束回调 */
  onDragEnd?: (success: boolean) => void;
}

/** 拖放目标配置 */
export interface DropTargetConfig {
  /** 目标类型 */
  type: DropTargetType;
  /** 目标 ID */
  id: string;
  /** 接受的源类型 */
  acceptedSources?: DragSourceType[];
  /** 是否可以放置 */
  canDrop?: (source: DragSource) => boolean;
  /** 放置回调 */
  onDrop?: (source: DragSource, position: Position) => void | Promise<void>;
  /** 进入回调 */
  onDragEnter?: (source: DragSource) => void;
  /** 离开回调 */
  onDragLeave?: (source: DragSource) => void;
  /** 悬停回调 */
  onDragOver?: (source: DragSource, position: Position) => void;
}

/** 拖放源 */
export interface DragSource {
  /** 唯一 ID */
  id: string;
  /** 类型 */
  type: DragSourceType;
  /** 数据 */
  data: unknown;
  /** 配置 */
  config: DragSourceConfig;
}

/** 拖放目标 */
export interface DropTarget {
  /** 唯一 ID */
  id: string;
  /** 类型 */
  type: DropTargetType;
  /** 配置 */
  config: DropTargetConfig;
  /** 元素矩形 */
  rect?: DOMRect;
}

/** 位置 */
export interface Position {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
}

/** 插入位置信息 */
export interface InsertPosition {
  /** 目标卡片/容器 ID */
  targetId: string;
  /** 插入索引 */
  index: number;
  /** 位置（相对于目标的上/下/左/右） */
  position: 'before' | 'after' | 'inside';
}

/** 拖放状态 */
export interface DragDropState {
  /** 是否正在拖放 */
  isDragging: boolean;
  /** 当前拖放源 */
  source: DragSource | null;
  /** 当前悬停目标 */
  hoverTarget: DropTarget | null;
  /** 当前位置 */
  position: Position | null;
  /** 插入位置 */
  insertPosition: InsertPosition | null;
  /** 是否可以放置 */
  canDrop: boolean;
  /** 拖放效果 */
  dropEffect: DropEffect;
}

/** 文件拖入数据 */
export interface FileDragData {
  /** 文件列表 */
  files: File[];
  /** 文件类型 */
  types: FileDropType[];
}

/** 基础卡片拖动数据 */
export interface BaseCardDragData {
  /** 卡片 ID */
  cardId: string;
  /** 基础卡片 ID */
  baseCardId: string;
  /** 基础卡片类型 */
  baseCardType: string;
  /** 原始索引 */
  originalIndex: number;
}

/** 卡片嵌套拖动数据 */
export interface CardNestDragData {
  /** 被拖动的卡片 ID */
  cardId: string;
  /** 卡片名称 */
  cardName: string;
}

// ==================== 文件类型检测 ====================

/** 支持的图片 MIME 类型 */
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

/** 支持的视频 MIME 类型 */
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

/** 支持的音频 MIME 类型 */
const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac'];

/** 文档 MIME 类型 */
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

/**
 * 检测文件类型
 * @param file - 文件对象
 * @returns 文件类型
 */
export function detectFileType(file: File): FileDropType {
  const { type, name } = file;
  const ext = name.split('.').pop()?.toLowerCase();

  // 检查扩展名（用于卡片和箱子文件）
  if (ext === 'chip') return 'card-file';
  if (ext === 'box') return 'box-file';

  // 检查 MIME 类型
  if (IMAGE_MIMES.includes(type)) return 'image';
  if (VIDEO_MIMES.includes(type)) return 'video';
  if (AUDIO_MIMES.includes(type)) return 'audio';
  if (DOCUMENT_MIMES.includes(type)) return 'document';

  // 通过扩展名补充判断
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext || '')) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return 'document';

  return 'unknown';
}

/**
 * 检测多个文件的类型
 * @param files - 文件列表
 * @returns 文件类型列表
 */
export function detectFileTypes(files: FileList | File[]): FileDropType[] {
  return Array.from(files).map(detectFileType);
}

// ==================== 拖放管理器类 ====================

/**
 * 拖放管理器
 *
 * 统一管理编辑器中的所有拖放操作，包括：
 * - 注册/注销拖放源和目标
 * - 拖放类型识别
 * - 目标区域检测
 * - 拖放状态管理
 *
 * @example
 * ```typescript
 * const manager = new DragDropManager();
 *
 * // 注册拖放目标
 * manager.registerTarget('canvas', {
 *   type: 'canvas',
 *   id: 'main-canvas',
 *   onDrop: (source, position) => {
 *     console.warn('Dropped at', position);
 *   },
 * });
 *
 * // 开始拖放
 * manager.startDrag({
 *   type: 'file',
 *   data: files,
 * });
 * ```
 */
export class DragDropManager {
  /** 注册的拖放源 */
  private sources = new Map<string, DragSourceConfig>();

  /** 注册的拖放目标 */
  private targets = new Map<string, DropTargetConfig>();

  /** 拖放状态 */
  private _state = ref<DragDropState>({
    isDragging: false,
    source: null,
    hoverTarget: null,
    position: null,
    insertPosition: null,
    canDrop: false,
    dropEffect: 'none',
  });

  /** 拖放计数器（用于生成唯一 ID） */
  private dragCounter = 0;

  /** 只读状态 */
  get state(): Readonly<Ref<DragDropState>> {
    return readonly(this._state) as Readonly<Ref<DragDropState>>;
  }

  // ==================== 注册/注销 ====================

  /**
   * 注册拖放源
   * @param id - 源 ID
   * @param config - 源配置
   */
  registerSource(id: string, config: DragSourceConfig): void {
    this.sources.set(id, config);
  }

  /**
   * 注销拖放源
   * @param id - 源 ID
   */
  unregisterSource(id: string): void {
    this.sources.delete(id);
  }

  /**
   * 注册拖放目标
   * @param id - 目标 ID
   * @param config - 目标配置
   */
  registerTarget(id: string, config: DropTargetConfig): void {
    this.targets.set(id, config);
  }

  /**
   * 注销拖放目标
   * @param id - 目标 ID
   */
  unregisterTarget(id: string): void {
    this.targets.delete(id);
  }

  /**
   * 获取拖放源配置
   * @param id - 源 ID
   * @returns 源配置或 undefined
   */
  getSource(id: string): DragSourceConfig | undefined {
    return this.sources.get(id);
  }

  /**
   * 获取拖放目标配置
   * @param id - 目标 ID
   * @returns 目标配置或 undefined
   */
  getTarget(id: string): DropTargetConfig | undefined {
    return this.targets.get(id);
  }

  // ==================== 拖放操作 ====================

  /**
   * 开始拖放
   * @param config - 拖放源配置
   * @returns 拖放源
   */
  startDrag(config: DragSourceConfig): DragSource {
    // 检查是否可以拖动
    if (config.canDrag && !config.canDrag()) {
      throw new Error('Cannot drag this source');
    }

    const id = `drag-${++this.dragCounter}`;
    const source: DragSource = {
      id,
      type: config.type,
      data: config.data,
      config,
    };

    this._state.value = {
      isDragging: true,
      source,
      hoverTarget: null,
      position: null,
      insertPosition: null,
      canDrop: false,
      dropEffect: config.effect || 'copy',
    };

    // 触发开始回调
    config.onDragStart?.();

    return source;
  }

  /**
   * 更新拖放位置
   * @param position - 当前位置
   */
  updatePosition(position: Position): void {
    if (!this._state.value.isDragging) return;
    this._state.value.position = position;
  }

  /**
   * 设置悬停目标
   * @param targetId - 目标 ID
   * @param rect - 目标矩形（可选）
   */
  setHoverTarget(targetId: string | null, rect?: DOMRect): void {
    if (!this._state.value.isDragging) return;

    if (!targetId) {
      const prevTarget = this._state.value.hoverTarget;
      if (prevTarget && this._state.value.source) {
        prevTarget.config.onDragLeave?.(this._state.value.source);
      }

      this._state.value.hoverTarget = null;
      this._state.value.canDrop = false;
      return;
    }

    const config = this.targets.get(targetId);
    if (!config) return;

    const target: DropTarget = {
      id: targetId,
      type: config.type,
      config,
      rect,
    };

    // 检查是否换了目标
    const prevTarget = this._state.value.hoverTarget;
    if (prevTarget && prevTarget.id !== targetId && this._state.value.source) {
      prevTarget.config.onDragLeave?.(this._state.value.source);
    }

    // 触发进入回调
    if ((!prevTarget || prevTarget.id !== targetId) && this._state.value.source) {
      config.onDragEnter?.(this._state.value.source);
    }

    this._state.value.hoverTarget = target;
    const source = this._state.value.source;
    this._state.value.canDrop = source ? this.checkCanDrop(source, target) : false;
  }

  /**
   * 设置插入位置
   * @param insertPosition - 插入位置信息
   */
  setInsertPosition(insertPosition: InsertPosition | null): void {
    if (!this._state.value.isDragging) return;
    this._state.value.insertPosition = insertPosition;
  }

  /**
   * 执行放置
   * @returns 是否成功放置
   */
  async drop(): Promise<boolean> {
    const { source, hoverTarget, position, canDrop } = this._state.value;

    if (!source || !hoverTarget || !canDrop || !position) {
      this.endDrag(false);
      return false;
    }

    try {
      await hoverTarget.config.onDrop?.(source, position);
      this.endDrag(true);
      return true;
    } catch (error) {
      console.error('Drop failed:', error);
      this.endDrag(false);
      return false;
    }
  }

  /**
   * 处理拖放（简化接口）
   * @param source - 拖放源
   * @param target - 拖放目标
   * @param position - 放置位置
   * @returns 是否成功
   */
  async handleDrop(source: DragSource, target: DropTarget, position: Position): Promise<boolean> {
    if (!this.checkCanDrop(source, target)) {
      return false;
    }

    try {
      await target.config.onDrop?.(source, position);
      return true;
    } catch (error) {
      console.error('Drop failed:', error);
      return false;
    }
  }

  /**
   * 结束拖放
   * @param success - 是否成功
   */
  endDrag(success = false): void {
    const source = this._state.value.source;
    const hoverTarget = this._state.value.hoverTarget;

    // 触发离开回调
    if (hoverTarget && source) {
      hoverTarget.config.onDragLeave?.(source);
    }

    // 触发结束回调
    source?.config.onDragEnd?.(success);

    // 重置状态
    this._state.value = {
      isDragging: false,
      source: null,
      hoverTarget: null,
      position: null,
      insertPosition: null,
      canDrop: false,
      dropEffect: 'none',
    };
  }

  /**
   * 取消拖放
   */
  cancelDrag(): void {
    this.endDrag(false);
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查是否可以放置
   * @param source - 拖放源
   * @param target - 拖放目标
   * @returns 是否可以放置
   */
  checkCanDrop(source: DragSource, target: DropTarget): boolean {
    // 检查目标是否接受此源类型
    const { acceptedSources, canDrop } = target.config;

    if (acceptedSources && !acceptedSources.includes(source.type)) {
      return false;
    }

    // 检查源是否允许放到此目标
    const { allowedTargets } = source.config;
    if (allowedTargets && !allowedTargets.includes(target.type)) {
      return false;
    }

    // 调用自定义检查函数
    if (canDrop && !canDrop(source)) {
      return false;
    }

    return true;
  }

  /**
   * 根据位置计算插入索引
   * @param items - 项目列表的矩形
   * @param position - 当前位置
   * @param direction - 方向（水平或垂直）
   * @returns 插入索引
   */
  calculateInsertIndex(
    items: Array<{ rect: DOMRect; id: string }>,
    position: Position,
    direction: 'horizontal' | 'vertical' = 'vertical'
  ): number {
    if (items.length === 0) return 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const { rect } = item;

      if (direction === 'vertical') {
        const midY = rect.top + rect.height / 2;
        if (position.y < midY) {
          return i;
        }
      } else {
        const midX = rect.left + rect.width / 2;
        if (position.x < midX) {
          return i;
        }
      }
    }

    return items.length;
  }

  /**
   * 检测点是否在矩形内
   * @param position - 位置
   * @param rect - 矩形
   * @returns 是否在矩形内
   */
  isPointInRect(position: Position, rect: DOMRect): boolean {
    return (
      position.x >= rect.left &&
      position.x <= rect.right &&
      position.y >= rect.top &&
      position.y <= rect.bottom
    );
  }

  /**
   * 查找包含点的目标
   * @param position - 位置
   * @param targetRects - 目标矩形映射
   * @returns 目标 ID 或 null
   */
  findTargetAtPoint(
    position: Position,
    targetRects: Map<string, DOMRect>
  ): string | null {
    // 从小到大排序（子元素在前）
    const sortedTargets = Array.from(targetRects.entries()).sort(
      ([, a], [, b]) => a.width * a.height - b.width * b.height
    );

    for (const [id, rect] of sortedTargets) {
      if (this.isPointInRect(position, rect)) {
        return id;
      }
    }

    return null;
  }

  /**
   * 重置管理器
   */
  reset(): void {
    this.cancelDrag();
    this.sources.clear();
    this.targets.clear();
    this.dragCounter = 0;
  }
}

// ==================== 全局实例 ====================

/** 全局拖放管理器实例 */
let globalDragDropManager: DragDropManager | null = null;

/**
 * 获取全局拖放管理器
 * @returns 拖放管理器实例
 */
export function useDragDropManager(): DragDropManager {
  if (!globalDragDropManager) {
    globalDragDropManager = new DragDropManager();
  }
  return globalDragDropManager;
}

/**
 * 重置全局拖放管理器（主要用于测试）
 */
export function resetDragDropManager(): void {
  if (globalDragDropManager) {
    globalDragDropManager.reset();
  }
  globalDragDropManager = null;
}

// ==================== Composables ====================

/**
 * 文件拖入 Hook 返回值
 */
export interface UseFileDropReturn {
  /** 是否有文件悬停 */
  isFileDragOver: Readonly<Ref<boolean>>;
  /** 拖入的文件数据 */
  draggedFiles: Readonly<Ref<FileDragData | null>>;
  /** 处理拖入事件 */
  handleDragEnter: (event: DragEvent) => void;
  /** 处理拖动悬停 */
  handleDragOver: (event: DragEvent) => void;
  /** 处理拖出事件 */
  handleDragLeave: (event: DragEvent) => void;
  /** 处理放置事件 */
  handleDrop: (event: DragEvent) => FileDragData | null;
}

/**
 * 文件拖入 Hook
 *
 * 处理从操作系统拖入文件到编辑器的逻辑。
 *
 * @returns 文件拖入相关方法和状态
 *
 * @example
 * ```vue
 * <template>
 *   <div
 *     @dragenter="handleDragEnter"
 *     @dragover="handleDragOver"
 *     @dragleave="handleDragLeave"
 *     @drop="handleDrop"
 *   >
 *     <div v-if="isFileDragOver">释放以导入文件</div>
 *   </div>
 * </template>
 *
 * <script setup>
 * const { isFileDragOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useFileDrop();
 * </script>
 * ```
 */
export function useFileDrop(): UseFileDropReturn {
  const isFileDragOver = ref(false);
  const draggedFiles = ref<FileDragData | null>(null);
  let dragEnterCounter = 0;

  function hasFiles(event: DragEvent): boolean {
    if (!event.dataTransfer) return false;
    return event.dataTransfer.types.includes('Files');
  }

  function handleDragEnter(event: DragEvent): void {
    if (!hasFiles(event)) return;

    event.preventDefault();
    event.stopPropagation();

    dragEnterCounter++;
    isFileDragOver.value = true;
  }

  function handleDragOver(event: DragEvent): void {
    if (!hasFiles(event)) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    dragEnterCounter--;
    if (dragEnterCounter <= 0) {
      dragEnterCounter = 0;
      isFileDragOver.value = false;
      draggedFiles.value = null;
    }
  }

  function handleDrop(event: DragEvent): FileDragData | null {
    event.preventDefault();
    event.stopPropagation();

    dragEnterCounter = 0;
    isFileDragOver.value = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      draggedFiles.value = null;
      return null;
    }

    const fileArray = Array.from(files);
    const types = detectFileTypes(fileArray);

    const data: FileDragData = {
      files: fileArray,
      types,
    };

    draggedFiles.value = data;
    return data;
  }

  return {
    isFileDragOver: readonly(isFileDragOver),
    draggedFiles: readonly(draggedFiles) as Readonly<Ref<FileDragData | null>>,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

/**
 * 卡片排序 Hook 返回值
 */
export interface UseCardSortReturn {
  /** 是否正在排序 */
  isSorting: Readonly<Ref<boolean>>;
  /** 拖动的基础卡片数据 */
  draggedCard: Readonly<Ref<BaseCardDragData | null>>;
  /** 当前插入位置 */
  insertIndex: Readonly<Ref<number>>;
  /** 开始排序 */
  startSort: (data: BaseCardDragData) => void;
  /** 更新插入位置 */
  updateInsertIndex: (index: number) => void;
  /** 结束排序 */
  endSort: () => { from: number; to: number } | null;
  /** 取消排序 */
  cancelSort: () => void;
}

/**
 * 卡片排序 Hook
 *
 * 处理在复合卡片内拖动基础卡片排序的逻辑。
 *
 * @returns 卡片排序相关方法和状态
 *
 * @example
 * ```typescript
 * const { isSorting, draggedCard, insertIndex, startSort, updateInsertIndex, endSort } = useCardSort();
 *
 * // 开始排序
 * startSort({ cardId: 'card-1', baseCardId: 'base-1', baseCardType: 'text', originalIndex: 0 });
 *
 * // 更新位置
 * updateInsertIndex(2);
 *
 * // 结束排序
 * const result = endSort();
 * if (result) {
 *   reorderCards(result.from, result.to);
 * }
 * ```
 */
export function useCardSort(): UseCardSortReturn {
  const isSorting = ref(false);
  const draggedCard = ref<BaseCardDragData | null>(null);
  const insertIndex = ref(-1);

  function startSort(data: BaseCardDragData): void {
    isSorting.value = true;
    draggedCard.value = data;
    insertIndex.value = data.originalIndex;
  }

  function updateInsertIndex(index: number): void {
    if (!isSorting.value) return;
    insertIndex.value = index;
  }

  function endSort(): { from: number; to: number } | null {
    if (!isSorting.value || !draggedCard.value) {
      cancelSort();
      return null;
    }

    const from = draggedCard.value.originalIndex;
    const to = insertIndex.value;

    isSorting.value = false;
    draggedCard.value = null;
    insertIndex.value = -1;

    if (from === to) {
      return null;
    }

    return { from, to };
  }

  function cancelSort(): void {
    isSorting.value = false;
    draggedCard.value = null;
    insertIndex.value = -1;
  }

  return {
    isSorting: readonly(isSorting),
    draggedCard: readonly(draggedCard),
    insertIndex: readonly(insertIndex),
    startSort,
    updateInsertIndex,
    endSort,
    cancelSort,
  };
}

/**
 * 卡片嵌套 Hook 返回值
 */
export interface UseCardNestReturn {
  /** 是否正在嵌套拖放 */
  isNesting: Readonly<Ref<boolean>>;
  /** 拖动的卡片数据 */
  draggedCard: Readonly<Ref<CardNestDragData | null>>;
  /** 目标卡片 ID */
  targetCardId: Readonly<Ref<string | null>>;
  /** 是否可以嵌套 */
  canNest: Readonly<Ref<boolean>>;
  /** 开始嵌套拖放 */
  startNest: (data: CardNestDragData) => void;
  /** 设置目标卡片 */
  setTarget: (targetId: string | null, canAccept: boolean) => void;
  /** 结束嵌套拖放 */
  endNest: () => { sourceId: string; targetId: string } | null;
  /** 取消嵌套拖放 */
  cancelNest: () => void;
}

/**
 * 卡片嵌套 Hook
 *
 * 处理拖动卡片到另一个卡片进行嵌套的逻辑。
 *
 * @returns 卡片嵌套相关方法和状态
 *
 * @example
 * ```typescript
 * const { isNesting, targetCardId, canNest, startNest, setTarget, endNest } = useCardNest();
 *
 * // 开始嵌套
 * startNest({ cardId: 'card-1', cardName: '笔记卡片' });
 *
 * // 设置目标
 * setTarget('card-2', true);
 *
 * // 结束嵌套
 * const result = endNest();
 * if (result) {
 *   nestCard(result.sourceId, result.targetId);
 * }
 * ```
 */
export function useCardNest(): UseCardNestReturn {
  const isNesting = ref(false);
  const draggedCard = ref<CardNestDragData | null>(null);
  const targetCardId = ref<string | null>(null);
  const canNest = ref(false);

  function startNest(data: CardNestDragData): void {
    isNesting.value = true;
    draggedCard.value = data;
    targetCardId.value = null;
    canNest.value = false;
  }

  function setTarget(targetId: string | null, canAccept: boolean): void {
    if (!isNesting.value) return;

    targetCardId.value = targetId;
    canNest.value = canAccept && targetId !== null && targetId !== draggedCard.value?.cardId;
  }

  function endNest(): { sourceId: string; targetId: string } | null {
    if (!isNesting.value || !draggedCard.value || !targetCardId.value || !canNest.value) {
      cancelNest();
      return null;
    }

    const sourceId = draggedCard.value.cardId;
    const targetId = targetCardId.value;

    isNesting.value = false;
    draggedCard.value = null;
    targetCardId.value = null;
    canNest.value = false;

    return { sourceId, targetId };
  }

  function cancelNest(): void {
    isNesting.value = false;
    draggedCard.value = null;
    targetCardId.value = null;
    canNest.value = false;
  }

  return {
    isNesting: readonly(isNesting),
    draggedCard: readonly(draggedCard),
    targetCardId: readonly(targetCardId),
    canNest: readonly(canNest),
    startNest,
    setTarget,
    endNest,
    cancelNest,
  };
}
