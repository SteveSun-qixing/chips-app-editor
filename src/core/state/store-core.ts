/**
 * 框架无关的 Store 核心
 * @module core/state/store-core
 * @description 提供发布-订阅 + 不可变更新模式的状态管理基底。
 * 不依赖 Vue/React 框架，可以被任何框架的 Hook 包装使用。
 *
 * 设计参考：Zustand 的 vanilla store 模式
 *
 * @example
 * ```typescript
 * const store = createStore<MyState>({
 *   count: 0,
 *   name: 'hello',
 * });
 *
 * // 非组件调用
 * store.getState().count; // 0
 * store.setState({ count: 1 });
 *
 * // React 组件调用
 * function MyComponent() {
 *   const count = useStore(store, s => s.count);
 *   return <div>{count}</div>;
 * }
 * ```
 */

/**
 * 订阅者回调类型
 */
export type StoreListener<T> = (state: T, prevState: T) => void;

/**
 * Store 实例接口
 */
export interface Store<T extends object> {
    /** 获取当前状态快照（只读） */
    getState: () => Readonly<T>;

    /** 更新状态（部分更新，自动合并） */
    setState: (partial: Partial<T> | ((prev: Readonly<T>) => Partial<T>)) => void;

    /** 替换状态（完整替换） */
    replaceState: (next: T) => void;

    /** 订阅状态变更 */
    subscribe: (listener: StoreListener<T>) => () => void;

    /** 销毁 Store（清理所有订阅者） */
    destroy: () => void;
}

/**
 * 创建框架无关的 Store
 *
 * @template T - 状态类型
 * @param initialState - 初始状态
 * @returns Store 实例
 */
export function createStore<T extends object>(initialState: T): Store<T> {
    let state: T = { ...initialState };
    const listeners = new Set<StoreListener<T>>();

    function getState(): Readonly<T> {
        return state;
    }

    function setState(partial: Partial<T> | ((prev: Readonly<T>) => Partial<T>)): void {
        const prevState = state;
        const nextPartial = typeof partial === 'function' ? partial(prevState) : partial;

        // 浅合并（不可变更新）
        const nextState = { ...prevState, ...nextPartial };

        // 浅比较：如果没有变化则跳过通知
        if (Object.is(prevState, nextState)) return;
        let hasChanged = false;
        for (const key of Object.keys(nextPartial) as (keyof T)[]) {
            if (!Object.is(prevState[key], nextState[key])) {
                hasChanged = true;
                break;
            }
        }
        if (!hasChanged) return;

        state = nextState;

        for (const listener of listeners) {
            listener(state, prevState);
        }
    }

    function replaceState(next: T): void {
        const prevState = state;
        state = { ...next };

        for (const listener of listeners) {
            listener(state, prevState);
        }
    }

    function subscribe(listener: StoreListener<T>): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }

    function destroy(): void {
        listeners.clear();
    }

    return {
        getState,
        setState,
        replaceState,
        subscribe,
        destroy,
    };
}
