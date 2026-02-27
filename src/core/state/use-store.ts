/**
 * React Hook 包装器
 * @module core/state/use-store
 * @description 将框架无关的 Store 包装为 React useSyncExternalStore Hook。
 * 提供带选择器（selector）的精细化订阅，避免不必要的重渲染。
 */

import { useSyncExternalStore, useRef, useCallback } from 'react';
import type { Store } from './store-core';

/**
 * React Hook：从 Store 中读取状态片段
 *
 * 使用 useSyncExternalStore 确保与 React 18+ 并发模式兼容。
 * 选择器返回值使用 Object.is 进行浅比较，只有选中的部分变化时才触发重渲染。
 *
 * @template T - Store 状态类型
 * @template U - 选择器返回类型
 * @param store - Store 实例
 * @param selector - 状态选择器函数
 * @returns 选择器返回的状态片段
 *
 * @example
 * ```tsx
 * // 选取单个字段
 * const count = useStore(myStore, s => s.count);
 *
 * // 选取多个字段（返回对象时注意引用稳定性）
 * const { name, age } = useStore(myStore, s => ({ name: s.name, age: s.age }));
 *
 * // 选取整个状态
 * const state = useStore(myStore, s => s);
 * ```
 */
export function useStore<T extends object, U>(
    store: Store<T>,
    selector: (state: Readonly<T>) => U,
): U {
    // 缓存上一次选择器结果，用于 Object.is 浅比较
    const prevRef = useRef<U | undefined>(undefined);
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    const getSnapshot = useCallback((): U => {
        const next = selectorRef.current(store.getState());

        // 如果选择器返回值与上次相同（Object.is），复用旧引用
        if (prevRef.current !== undefined && Object.is(prevRef.current, next)) {
            return prevRef.current;
        }

        prevRef.current = next;
        return next;
    }, [store]);

    const subscribe = useCallback(
        (onStoreChange: () => void) => store.subscribe(onStoreChange),
        [store],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
