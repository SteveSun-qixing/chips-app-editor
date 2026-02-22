/**
 * 性能优化工具集
 * @module utils/performance
 * @description 提供防抖、节流、内存管理等性能优化工具
 */

/**
 * 防抖函数
 * @description 在连续调用中，只有最后一次调用会被执行
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 *
 * // 连续调用只会执行最后一次
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // 只有这次会执行
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  } as T & { cancel: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

/**
 * 节流函数
 * @description 在指定时间内只执行一次
 *
 * @param fn - 要节流的函数
 * @param limit - 时间限制（毫秒）
 * @returns 节流后的函数
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 *
 * // 100ms 内只执行一次
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): T & { cancel: () => void } {
  let lastRun = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttledFn = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastRun >= limit) {
      fn.apply(this, args);
      lastRun = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastRun = Date.now();
        timeoutId = null;
      }, limit - (now - lastRun));
    }
  } as T & { cancel: () => void };

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn;
}

/**
 * 请求动画帧节流
 * @description 使用 requestAnimationFrame 进行节流，适合动画和渲染
 *
 * @param fn - 要节流的函数
 * @returns 节流后的函数
 *
 * @example
 * ```typescript
 * const rafThrottledMove = rafThrottle((e: MouseEvent) => {
 *   updatePosition(e.clientX, e.clientY);
 * });
 *
 * element.addEventListener('mousemove', rafThrottledMove);
 * ```
 */
export function rafThrottle<T extends (...args: unknown[]) => void>(
  fn: T
): T & { cancel: () => void } {
  let frameId: number | null = null;

  const throttledFn = function (this: unknown, ...args: Parameters<T>) {
    if (frameId !== null) return;

    frameId = requestAnimationFrame(() => {
      fn.apply(this, args);
      frameId = null;
    });
  } as T & { cancel: () => void };

  throttledFn.cancel = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  return throttledFn;
}

/**
 * 延迟执行（带取消）
 * @param fn - 要执行的函数
 * @param delay - 延迟时间
 * @returns 取消函数
 */
export function delayExecution(fn: () => void, delay: number): () => void {
  const timeoutId = setTimeout(fn, delay);
  return () => clearTimeout(timeoutId);
}

/**
 * 批量更新收集器
 * @description 收集多次更新，在微任务中批量执行
 */
export class BatchUpdater<T> {
  private updates: T[] = [];
  private scheduled = false;
  private handler: (updates: T[]) => void;

  constructor(handler: (updates: T[]) => void) {
    this.handler = handler;
  }

  /**
   * 添加更新
   * @param update - 更新内容
   */
  add(update: T): void {
    this.updates.push(update);
    this.scheduleFlush();
  }

  /**
   * 调度刷新
   */
  private scheduleFlush(): void {
    if (this.scheduled) return;

    this.scheduled = true;
    queueMicrotask(() => {
      this.flush();
    });
  }

  /**
   * 执行所有更新
   */
  private flush(): void {
    const updates = this.updates;
    this.updates = [];
    this.scheduled = false;

    if (updates.length > 0) {
      this.handler(updates);
    }
  }

  /**
   * 立即执行所有待处理的更新
   */
  flushSync(): void {
    if (this.updates.length > 0) {
      const updates = this.updates;
      this.updates = [];
      this.scheduled = false;
      this.handler(updates);
    }
  }

  /**
   * 清除所有待处理的更新
   */
  clear(): void {
    this.updates = [];
    this.scheduled = false;
  }
}

/**
 * 性能监控器
 * @description 监控和报告性能指标
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private enabled = false;

  /**
   * 启用监控
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用监控
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 开始计时
   * @param label - 标签
   * @returns 结束计时的函数
   */
  startTimer(label: string): () => number {
    if (!this.enabled) {
      return () => 0;
    }

    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
      return duration;
    };
  }

  /**
   * 记录指标
   * @param label - 标签
   * @param value - 值
   */
  recordMetric(label: string, value: number): void {
    if (!this.enabled) return;

    const metricValues = this.metrics.get(label);
    if (metricValues) {
      metricValues.push(value);
      return;
    }
    this.metrics.set(label, [value]);
  }

  /**
   * 获取指标统计
   * @param label - 标签
   */
  getStats(label: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    sum: number;
  } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum,
    };
  }

  /**
   * 获取所有指标
   */
  getAllStats(): Map<string, ReturnType<typeof this.getStats>> {
    const result = new Map<string, ReturnType<typeof this.getStats>>();
    for (const label of this.metrics.keys()) {
      result.set(label, this.getStats(label));
    }
    return result;
  }

  /**
   * 清除指标
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * 打印报告
   */
  printReport(): void {
    console.warn('Performance Report');
    for (const [label, stats] of this.getAllStats()) {
      if (stats) {
        console.warn(`${label}:`, {
          count: stats.count,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          avg: `${stats.avg.toFixed(2)}ms`,
        });
      }
    }
  }
}

/**
 * 内存泄漏检测器
 * @description 跟踪对象引用，帮助检测内存泄漏
 */
export class LeakDetector {
  private trackedObjects = new WeakMap<object, string>();
  private objectCounts = new Map<string, number>();
  private enabled = false;

  /**
   * 启用检测
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用检测
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 跟踪对象
   * @param obj - 要跟踪的对象
   * @param type - 对象类型
   */
  track(obj: object, type: string): void {
    if (!this.enabled) return;

    this.trackedObjects.set(obj, type);
    this.objectCounts.set(type, (this.objectCounts.get(type) || 0) + 1);
  }

  /**
   * 取消跟踪
   * @param obj - 对象
   */
  untrack(obj: object): void {
    if (!this.enabled) return;

    const type = this.trackedObjects.get(obj);
    if (type) {
      this.trackedObjects.delete(obj);
      const count = this.objectCounts.get(type) || 0;
      if (count > 0) {
        this.objectCounts.set(type, count - 1);
      }
    }
  }

  /**
   * 获取对象计数
   */
  getCounts(): Map<string, number> {
    return new Map(this.objectCounts);
  }

  /**
   * 打印报告
   */
  printReport(): void {
    console.warn('Leak Detection Report');
    for (const [type, count] of this.objectCounts) {
      console.warn(`${type}: ${count} instances`);
    }
  }
}

/**
 * 对象池
 * @description 重用对象以减少 GC 压力
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void = () => {},
    maxSize = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  /**
   * 获取对象
   */
  acquire(): T {
    const reused = this.pool.pop();
    if (reused !== undefined) {
      return reused;
    }
    return this.factory();
  }

  /**
   * 释放对象
   * @param obj - 要释放的对象
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * 获取池大小
   */
  get size(): number {
    return this.pool.length;
  }
}

/**
 * 事件位置池
 * @description 重用位置对象
 */
export const positionPool = new ObjectPool<{ x: number; y: number }>(
  () => ({ x: 0, y: 0 }),
  (obj) => {
    obj.x = 0;
    obj.y = 0;
  }
);

// 全局性能监控器实例
export const performanceMonitor = new PerformanceMonitor();

// 全局泄漏检测器实例
export const leakDetector = new LeakDetector();
