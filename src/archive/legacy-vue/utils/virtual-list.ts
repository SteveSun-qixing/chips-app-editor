/**
 * 虚拟列表工具
 * @module utils/virtual-list
 * @description 提供虚拟滚动支持，用于高效渲染大量列表项
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';

/**
 * 虚拟列表项
 */
export interface VirtualItem<T> {
  /** 数据项 */
  data: T;
  /** 索引 */
  index: number;
  /** 顶部偏移 */
  offsetTop: number;
  /** 项高度 */
  height: number;
}

/**
 * 虚拟列表配置
 */
export interface VirtualListConfig {
  /** 项高度（固定高度时使用） */
  itemHeight?: number;
  /** 预渲染数量（上下各多渲染几个） */
  overscan?: number;
  /** 获取项高度的函数（动态高度时使用） */
  getItemHeight?: (index: number) => number;
}

/**
 * 虚拟列表返回值
 */
export interface VirtualListReturn<T> {
  /** 可见项列表 */
  visibleItems: ComputedRef<VirtualItem<T>[]>;
  /** 总高度 */
  totalHeight: ComputedRef<number>;
  /** 开始索引 */
  startIndex: Ref<number>;
  /** 结束索引 */
  endIndex: Ref<number>;
  /** 容器偏移 */
  containerOffset: ComputedRef<number>;
  /** 更新滚动位置 */
  updateScrollTop: (scrollTop: number) => void;
  /** 滚动到指定索引 */
  scrollToIndex: (index: number) => void;
  /** 获取指定索引的偏移 */
  getOffsetForIndex: (index: number) => number;
}

/**
 * 虚拟列表 Hook
 * @description 用于实现虚拟滚动，高效渲染大量列表项
 *
 * @param items - 数据项列表
 * @param containerHeight - 容器高度
 * @param config - 配置选项
 * @returns 虚拟列表控制对象
 *
 * @example
 * ```typescript
 * const items = ref([...Array(10000).keys()]);
 * const containerRef = ref<HTMLElement | null>(null);
 * const containerHeight = ref(400);
 *
 * const {
 *   visibleItems,
 *   totalHeight,
 *   containerOffset,
 *   updateScrollTop,
 * } = useVirtualList(items, containerHeight, {
 *   itemHeight: 40,
 *   overscan: 3,
 * });
 *
 * // 在模板中使用
 * // <div ref="containerRef" @scroll="e => updateScrollTop(e.target.scrollTop)">
 * //   <div :style="{ height: totalHeight + 'px' }">
 * //     <div :style="{ transform: `translateY(${containerOffset}px)` }">
 * //       <div v-for="item in visibleItems" :key="item.index">
 * //         {{ item.data }}
 * //       </div>
 * //     </div>
 * //   </div>
 * // </div>
 * ```
 */
export function useVirtualList<T>(
  items: Ref<T[]>,
  containerHeight: Ref<number>,
  config: VirtualListConfig = {}
): VirtualListReturn<T> {
  const { itemHeight = 40, overscan = 3, getItemHeight } = config;

  /** 当前滚动位置 */
  const scrollTop = ref(0);

  /** 项高度缓存 */
  const heightCache = new Map<number, number>();

  /**
   * 获取项高度
   */
  function getHeight(index: number): number {
    if (getItemHeight) {
      const cachedHeight = heightCache.get(index);
      if (cachedHeight !== undefined) {
        return cachedHeight;
      }
      const computedHeight = getItemHeight(index);
      heightCache.set(index, computedHeight);
      return computedHeight;
    }
    return itemHeight;
  }

  /**
   * 计算总高度
   */
  const totalHeight = computed(() => {
    const count = items.value.length;
    if (!getItemHeight) {
      return count * itemHeight;
    }
    let height = 0;
    for (let i = 0; i < count; i++) {
      height += getHeight(i);
    }
    return height;
  });

  /**
   * 根据滚动位置找到开始索引
   */
  function findStartIndex(scrollTop: number): number {
    const count = items.value.length;
    if (!getItemHeight) {
      return Math.floor(scrollTop / itemHeight);
    }

    let offset = 0;
    for (let i = 0; i < count; i++) {
      const height = getHeight(i);
      if (offset + height > scrollTop) {
        return i;
      }
      offset += height;
    }
    return count - 1;
  }

  /**
   * 根据开始索引找到结束索引
   */
  function findEndIndex(startIndex: number, containerHeight: number): number {
    const count = items.value.length;
    let offset = getOffsetForIndex(startIndex);
    let i = startIndex;

    while (i < count && offset < scrollTop.value + containerHeight) {
      offset += getHeight(i);
      i++;
    }

    return Math.min(i, count - 1);
  }

  /**
   * 获取指定索引的偏移
   */
  function getOffsetForIndex(index: number): number {
    if (!getItemHeight) {
      return index * itemHeight;
    }

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }
    return offset;
  }

  /** 开始索引 */
  const startIndex = ref(0);

  /** 结束索引 */
  const endIndex = ref(0);

  /** 更新可见范围 */
  function updateVisibleRange(): void {
    const rawStart = findStartIndex(scrollTop.value);
    const rawEnd = findEndIndex(rawStart, containerHeight.value);

    startIndex.value = Math.max(0, rawStart - overscan);
    endIndex.value = Math.min(items.value.length - 1, rawEnd + overscan);
  }

  // 监听滚动和数据变化
  watch([scrollTop, items, containerHeight], updateVisibleRange, { immediate: true });

  /** 可见项列表 */
  const visibleItems = computed<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = [];
    const start = startIndex.value;
    const end = endIndex.value;

    for (let i = start; i <= end; i++) {
      const item = items.value[i];
      if (item !== undefined) {
        result.push({
          data: item,
          index: i,
          offsetTop: getOffsetForIndex(i),
          height: getHeight(i),
        });
      }
    }

    return result;
  });

  /** 容器偏移 */
  const containerOffset = computed(() => {
    return getOffsetForIndex(startIndex.value);
  });

  /**
   * 更新滚动位置
   */
  function updateScrollTop(newScrollTop: number): void {
    scrollTop.value = newScrollTop;
  }

  /**
   * 滚动到指定索引
   */
  function scrollToIndex(index: number): void {
    scrollTop.value = getOffsetForIndex(index);
  }

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    containerOffset,
    updateScrollTop,
    scrollToIndex,
    getOffsetForIndex,
  };
}

/**
 * 虚拟网格配置
 */
export interface VirtualGridConfig {
  /** 项宽度 */
  itemWidth: number;
  /** 项高度 */
  itemHeight: number;
  /** 间距 */
  gap?: number;
  /** 预渲染行数 */
  overscan?: number;
}

/**
 * 虚拟网格项
 */
export interface VirtualGridItem<T> {
  /** 数据项 */
  data: T;
  /** 索引 */
  index: number;
  /** 行索引 */
  row: number;
  /** 列索引 */
  col: number;
  /** 顶部偏移 */
  offsetTop: number;
  /** 左侧偏移 */
  offsetLeft: number;
}

/**
 * 虚拟网格返回值
 */
export interface VirtualGridReturn<T> {
  /** 可见项列表 */
  visibleItems: ComputedRef<VirtualGridItem<T>[]>;
  /** 总高度 */
  totalHeight: ComputedRef<number>;
  /** 列数 */
  columns: ComputedRef<number>;
  /** 更新滚动位置 */
  updateScrollTop: (scrollTop: number) => void;
  /** 更新容器宽度 */
  updateContainerWidth: (width: number) => void;
}

/**
 * 虚拟网格 Hook
 * @description 用于实现虚拟网格，高效渲染大量网格项
 *
 * @param items - 数据项列表
 * @param containerWidth - 容器宽度
 * @param containerHeight - 容器高度
 * @param config - 配置选项
 * @returns 虚拟网格控制对象
 */
export function useVirtualGrid<T>(
  items: Ref<T[]>,
  containerWidth: Ref<number>,
  containerHeight: Ref<number>,
  config: VirtualGridConfig
): VirtualGridReturn<T> {
  const { itemWidth, itemHeight, gap = 0, overscan = 2 } = config;

  const scrollTop = ref(0);

  /** 列数 */
  const columns = computed(() => {
    const effectiveWidth = containerWidth.value + gap;
    return Math.max(1, Math.floor(effectiveWidth / (itemWidth + gap)));
  });

  /** 行数 */
  const rows = computed(() => {
    return Math.ceil(items.value.length / columns.value);
  });

  /** 总高度 */
  const totalHeight = computed(() => {
    return rows.value * (itemHeight + gap) - gap;
  });

  /** 可见行范围 */
  const visibleRowRange = computed(() => {
    const startRow = Math.floor(scrollTop.value / (itemHeight + gap));
    const visibleRows = Math.ceil(containerHeight.value / (itemHeight + gap));

    return {
      start: Math.max(0, startRow - overscan),
      end: Math.min(rows.value - 1, startRow + visibleRows + overscan),
    };
  });

  /** 可见项列表 */
  const visibleItems = computed<VirtualGridItem<T>[]>(() => {
    const result: VirtualGridItem<T>[] = [];
    const { start, end } = visibleRowRange.value;
    const colCount = columns.value;

    for (let row = start; row <= end; row++) {
      for (let col = 0; col < colCount; col++) {
        const index = row * colCount + col;
        if (index >= items.value.length) break;

        const item = items.value[index];
        if (item !== undefined) {
          result.push({
            data: item,
            index,
            row,
            col,
            offsetTop: row * (itemHeight + gap),
            offsetLeft: col * (itemWidth + gap),
          });
        }
      }
    }

    return result;
  });

  function updateScrollTop(newScrollTop: number): void {
    scrollTop.value = newScrollTop;
  }

  function updateContainerWidth(width: number): void {
    containerWidth.value = width;
  }

  return {
    visibleItems,
    totalHeight,
    columns,
    updateScrollTop,
    updateContainerWidth,
  };
}
