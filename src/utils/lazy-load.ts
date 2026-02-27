/**
 * 组件懒加载工具
 * @module utils/lazy-load
 * @description 提供 React 组件懒加载支持
 */

import React, { Suspense, type ComponentType, type ReactNode } from 'react';
import { t } from '@/services/i18n-service';

/**
 * 懒加载选项
 */
export interface LazyLoadOptions {
  /** 加载超时时间（毫秒） — 预留，React.lazy 原生不支持超时 */
  timeout?: number;
  /** 延迟显示加载状态的时间（毫秒） — 预留 */
  delay?: number;
}

/**
 * 默认加载状态 fallback
 */
function DefaultLoadingFallback() {
  return React.createElement(
    'div',
    {
      className: 'lazy-loading-placeholder',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: 'var(--chips-color-text-secondary, #666666)',
        fontSize: 'var(--chips-font-size-sm, 14px)',
      },
    },
    React.createElement('span', { style: { marginRight: '8px' } }, '⏳'),
    React.createElement('span', null, t('lazy_load.loading')),
  );
}

/**
 * 创建懒加载组件
 *
 * @param loader - 组件加载函数（dynamic import）
 * @param _options - 懒加载选项（预留）
 * @returns React.lazy 包装的组件
 *
 * @example
 * ```typescript
 * const LazyComponent = lazyLoad(() => import('./HeavyComponent'));
 * // 在 Suspense 中使用
 * <Suspense fallback={<Loading />}>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
export function lazyLoad<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  _options: LazyLoadOptions = {},
): React.LazyExoticComponent<T> {
  return React.lazy(loader);
}

/**
 * 带 Suspense 包裹的懒加载组件工厂
 *
 * 对于不想手动写 Suspense 的场景，可以使用此函数
 * 自动包裹 Suspense + fallback。
 */
export function lazyLoadWithFallback<P extends Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode,
): ComponentType<P> {
  const LazyComponent = React.lazy(loader);
  const WrappedComponent = (props: P) =>
    React.createElement(
      Suspense,
      { fallback: fallback ?? React.createElement(DefaultLoadingFallback) },
      React.createElement(LazyComponent, props as any),
    );
  WrappedComponent.displayName = 'LazyLoadWithFallback';
  return WrappedComponent;
}

/**
 * 预加载组件
 *
 * @param loaders - 组件加载函数数组
 */
export function preloadComponents(loaders: Array<() => Promise<unknown>>): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        loaders.forEach((loader) => {
          loader().catch((err) => {
            console.warn('[LazyLoad] Preload failed:', err);
          });
        });
      },
      { timeout: 5000 },
    );
  } else {
    setTimeout(() => {
      loaders.forEach((loader) => {
        loader().catch((err) => {
          console.warn('[LazyLoad] Preload failed:', err);
        });
      });
    }, 1000);
  }
}

/**
 * 组件缓存管理器
 */
export class ComponentCache {
  private cache = new Map<string, ComponentType>();
  private loadPromises = new Map<string, Promise<ComponentType>>();

  async getOrLoad<T extends ComponentType>(
    key: string,
    loader: () => Promise<T | { default: T }>,
  ): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    if (this.loadPromises.has(key)) {
      return this.loadPromises.get(key) as Promise<T>;
    }
    const loadPromise = loader().then((module) => {
      const component = 'default' in module ? module.default : module;
      this.cache.set(key, component);
      this.loadPromises.delete(key);
      return component;
    });
    this.loadPromises.set(key, loadPromise as Promise<ComponentType>);
    return loadPromise;
  }

  preload<T extends ComponentType>(
    key: string,
    loader: () => Promise<T | { default: T }>,
  ): void {
    if (!this.cache.has(key) && !this.loadPromises.has(key)) {
      this.getOrLoad(key, loader).catch((err) => {
        console.warn(`[ComponentCache] Preload failed for ${key}:`, err);
      });
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

export const componentCache = new ComponentCache();
