/**
 * 事件管理器
 * @module core/event-manager
 * @description 负责编辑器内部事件的发布和订阅
 */

/** 事件处理器类型 */
type EventHandler<T = unknown> = (data: T) => void;

/** 事件订阅信息 */
interface EventSubscription {
  /** 订阅ID */
  id: string;
  /** 处理器函数 */
  handler: EventHandler;
  /** 是否为一次性订阅 */
  once: boolean;
}

/**
 * 事件发射器
 * 
 * 提供事件发布/订阅功能，支持：
 * - 普通订阅 (on)
 * - 一次性订阅 (once)
 * - 取消订阅 (off)
 * - 通配符订阅 (*)
 * - Promise 等待事件 (waitFor)
 * 
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 * 
 * // 订阅事件
 * emitter.on('card:saved', (data) => {
 *   console.warn('卡片已保存:', data);
 * });
 * 
 * // 发布事件
 * emitter.emit('card:saved', { cardId: 'abc123' });
 * 
 * // 等待事件
 * const result = await emitter.waitFor('card:created');
 * ```
 */
export class EventEmitter {
  /** 事件订阅映射表 */
  private subscriptions = new Map<string, EventSubscription[]>();
  /** 订阅ID自增计数器 */
  private nextId = 1;

  /**
   * 订阅事件
   * 
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅ID，可用于取消订阅
   * 
   * @example
   * ```typescript
   * const id = emitter.on('card:opened', (data) => {
   *   console.warn('打开卡片:', data.cardId);
   * });
   * ```
   */
  on<T = unknown>(eventType: string, handler: EventHandler<T>): string {
    const id = `sub-${this.nextId++}`;
    const subscription: EventSubscription = {
      id,
      handler: handler as EventHandler,
      once: false,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.push(subscription);
    }

    return id;
  }

  /**
   * 一次性订阅事件
   * 
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅ID
   * 
   * @example
   * ```typescript
   * emitter.once('editor:ready', () => {
   *   console.warn('编辑器已就绪');
   * });
   * ```
   */
  once<T = unknown>(eventType: string, handler: EventHandler<T>): string {
    const id = `sub-${this.nextId++}`;
    const subscription: EventSubscription = {
      id,
      handler: handler as EventHandler,
      once: true,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.push(subscription);
    }

    return id;
  }

  /**
   * 取消订阅
   * 
   * @param eventType - 事件类型
   * @param handlerOrId - 处理器函数或订阅ID（可选）
   *   - 不传：移除该事件类型的所有订阅
   *   - 传入ID：移除特定订阅
   *   - 传入函数：移除匹配的处理器
   * 
   * @example
   * ```typescript
   * // 通过ID取消
   * emitter.off('card:saved', subId);
   * 
   * // 通过处理器取消
   * emitter.off('card:saved', handler);
   * 
   * // 移除所有订阅
   * emitter.off('card:saved');
   * ```
   */
  off(eventType: string, handlerOrId?: EventHandler | string): void {
    if (!this.subscriptions.has(eventType)) return;

    if (!handlerOrId) {
      // 移除该事件类型的所有订阅
      this.subscriptions.delete(eventType);
      return;
    }

    const subs = this.subscriptions.get(eventType);
    if (!subs) {
      return;
    }
    const index = subs.findIndex((sub) =>
      typeof handlerOrId === 'string'
        ? sub.id === handlerOrId
        : sub.handler === handlerOrId
    );

    if (index !== -1) {
      subs.splice(index, 1);
    }

    // 如果没有订阅者了，清理映射
    if (subs.length === 0) {
      this.subscriptions.delete(eventType);
    }
  }

  /**
   * 发布事件
   * 
   * @param eventType - 事件类型
   * @param data - 事件数据
   * 
   * @example
   * ```typescript
   * emitter.emit('card:created', { cardId: 'new123' });
   * ```
   */
  emit<T = unknown>(eventType: string, data: T): void {
    const subs = this.subscriptions.get(eventType) ?? [];
    // 支持通配符订阅
    const wildcardSubs = this.subscriptions.get('*') ?? [];
    const allSubs = [...subs, ...wildcardSubs];

    const toRemove: Array<{ eventType: string; id: string }> = [];

    allSubs.forEach((sub) => {
      try {
        sub.handler(data);
        if (sub.once) {
          // 记录需要移除的一次性订阅
          const targetEventType = subs.includes(sub) ? eventType : '*';
          toRemove.push({ eventType: targetEventType, id: sub.id });
        }
      } catch (error) {
        console.error(`[EventEmitter] Handler error for ${eventType}:`, error);
      }
    });

    // 移除一次性订阅
    toRemove.forEach(({ eventType: type, id }) => this.off(type, id));
  }

  /**
   * 等待事件发生
   * 
   * @param eventType - 事件类型
   * @param timeout - 超时时间（毫秒），默认30秒
   * @returns Promise，在事件发生时 resolve，超时时 reject
   * 
   * @throws {Error} 超时错误
   * 
   * @example
   * ```typescript
   * try {
   *   const data = await emitter.waitFor<{ cardId: string }>('card:saved', 5000);
   *   console.warn('卡片已保存:', data.cardId);
   * } catch (error) {
   *   console.error('等待超时');
   * }
   * ```
   */
  waitFor<T = unknown>(eventType: string, timeout = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(eventType, id);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const id = this.once<T>(eventType, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * 检查是否有订阅者
   * 
   * @param eventType - 事件类型
   * @returns 是否有订阅者
   */
  hasListeners(eventType: string): boolean {
    return (this.subscriptions.get(eventType)?.length ?? 0) > 0;
  }

  /**
   * 获取订阅者数量
   * 
   * @param eventType - 事件类型
   * @returns 订阅者数量
   */
  listenerCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.length ?? 0;
  }

  /**
   * 获取所有事件类型
   * 
   * @returns 事件类型数组
   */
  eventNames(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.subscriptions.clear();
  }

  /**
   * 移除特定事件类型的所有监听器
   * 
   * @param eventType - 事件类型（可选，不传则移除所有）
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.clear();
    }
  }
}

/**
 * 创建事件发射器
 * 
 * @returns 新的事件发射器实例
 * 
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 * ```
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}
