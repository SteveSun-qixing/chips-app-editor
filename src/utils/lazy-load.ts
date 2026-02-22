/**
 * 组件懒加载工具
 * @module utils/lazy-load
 * @description 提供组件懒加载支持
 */

import { defineAsyncComponent, h, type Component, type AsyncComponentOptions } from 'vue';
import { Button } from '@chips/components';
import { t } from '@/services/i18n-service';

/**
 * 懒加载选项
 */
export interface LazyLoadOptions {
  /** 加载超时时间（毫秒） */
  timeout?: number;
  /** 延迟显示加载状态的时间（毫秒） */
  delay?: number;
  /** 是否挂起渲染直到组件加载完成 */
  suspensible?: boolean;
}

/**
 * 加载状态组件 Props
 */
interface LoadingComponentProps {
  text?: string;
}

/**
 * 错误状态组件 Props
 */
interface ErrorComponentProps {
  error?: Error;
  retry?: () => void;
}

/**
 * 创建加载状态组件
 * @param text - 加载文本
 */
function createLoadingComponent(text = t('lazy_load.loading')): Component<LoadingComponentProps> {
  return {
    name: 'LazyLoadingPlaceholder',
    props: {
      text: { type: String, default: text },
    },
    setup(props) {
      return () =>
        h(
          'div',
          {
            class: 'lazy-loading-placeholder',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              color: 'var(--chips-color-text-secondary, #666666)',
              fontSize: 'var(--chips-font-size-sm, 14px)',
            },
          },
          [
            h('span', { class: 'loading-spinner', style: { marginRight: '8px' } }, '⏳'),
            h('span', {}, props.text),
          ]
        );
    },
  };
}

/**
 * 创建错误状态组件
 */
function createErrorComponent(): Component<ErrorComponentProps> {
  return {
    name: 'LazyLoadError',
    props: {
      error: { type: Error, default: null },
      retry: { type: Function, default: null },
    },
    setup(props) {
      return () =>
        h(
          'div',
          {
            class: 'lazy-load-error',
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              color: 'var(--chips-color-error, #ef4444)',
              fontSize: 'var(--chips-font-size-sm, 14px)',
            },
          },
          [
            h('span', { style: { marginBottom: '8px' } }, `❌ ${t('lazy_load.error')}`),
            h(
              'span',
              {
                style: {
                  fontSize: 'var(--chips-font-size-xs, 12px)',
                  color: 'var(--chips-color-text-secondary, #666666)',
                },
              },
              props.error?.message || ''
            ),
            props.retry &&
              h(
                Button,
                {
                  onClick: props.retry,
                  style: {
                    marginTop: '12px',
                  },
                  type: 'primary',
                  htmlType: 'button',
                },
                {
                  default: () => t('lazy_load.retry'),
                }
              ),
          ]
        );
    },
  };
}

/**
 * 创建懒加载组件
 * @description 包装动态导入为异步组件，支持加载状态和错误处理
 *
 * @param loader - 组件加载函数
 * @param options - 懒加载选项
 * @returns 异步组件
 *
 * @example
 * ```typescript
 * // 基本用法
 * const LazyComponent = lazyLoad(() => import('./HeavyComponent.vue'));
 *
 * // 带选项
 * const LazyComponent = lazyLoad(
 *   () => import('./HeavyComponent.vue'),
 *   {
 *     timeout: 5000,
 *     delay: 200,
 *   }
 * );
 * ```
 */
export function lazyLoad<T extends Component>(
  loader: () => Promise<T | { default: T }>,
  options: LazyLoadOptions = {}
): ReturnType<typeof defineAsyncComponent> {
  const { timeout = 30000, delay = 200, suspensible = false } = options;

  const asyncOptions: AsyncComponentOptions<T> = {
    loader: loader as () => Promise<T>,
    loadingComponent: createLoadingComponent(),
    errorComponent: createErrorComponent(),
    delay,
    timeout,
    suspensible,
    onError(error, retry, fail) {
      console.error('[LazyLoad] Component loading failed:', error);
      // 网络错误可以重试
      if (error.message.includes('fetch') || error.message.includes('network')) {
        retry();
      } else {
        fail();
      }
    },
  };

  return defineAsyncComponent(asyncOptions);
}

/**
 * 预加载组件
 * @description 在空闲时预加载组件，提升后续加载速度
 *
 * @param loaders - 组件加载函数数组
 *
 * @example
 * ```typescript
 * // 在应用启动后预加载
 * preloadComponents([
 *   () => import('./FileManager.vue'),
 *   () => import('./EditPanel.vue'),
 *   () => import('./CardBoxLibrary.vue'),
 * ]);
 * ```
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
      { timeout: 5000 }
    );
  } else {
    // 降级处理：使用 setTimeout
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
 * 条件懒加载
 * @description 仅在条件满足时加载组件
 *
 * @param condition - 条件函数
 * @param loader - 组件加载函数
 * @param fallback - 条件不满足时的回退组件
 *
 * @example
 * ```typescript
 * const ConditionalComponent = conditionalLazyLoad(
 *   () => featureEnabled,
 *   () => import('./NewFeature.vue'),
 *   () => import('./LegacyFeature.vue')
 * );
 * ```
 */
export function conditionalLazyLoad<T extends Component>(
  condition: () => boolean,
  loader: () => Promise<T | { default: T }>,
  fallback?: () => Promise<T | { default: T }>
): ReturnType<typeof defineAsyncComponent> {
  return defineAsyncComponent({
    loader: async () => {
      if (condition()) {
        return loader();
      }
      if (fallback) {
        return fallback();
      }
      // 返回空组件
      return { default: { name: 'EmptyFallback', render: () => null } as unknown as T };
    },
    loadingComponent: createLoadingComponent(),
    errorComponent: createErrorComponent(),
  });
}

/**
 * 路由懒加载辅助函数
 * @description 为路由定义创建懒加载函数
 *
 * @param path - 组件路径
 * @returns 懒加载函数
 *
 * @example
 * ```typescript
 * const routes = [
 *   {
 *     path: '/editor',
 *     component: routeLazyLoad('views/Editor.vue'),
 *   },
 * ];
 * ```
 */
export function routeLazyLoad(
  path: string
): () => Promise<Component | { default: Component }> {
  // 注意：这需要配合 Vite 的 glob 导入使用
  // 实际使用时可能需要调整
  return () => import(/* @vite-ignore */ `../views/${path}`);
}

/**
 * 组件缓存管理器
 * @description 管理已加载组件的缓存
 */
export class ComponentCache {
  private cache = new Map<string, Component>();
  private loadPromises = new Map<string, Promise<Component>>();

  /**
   * 获取或加载组件
   * @param key - 组件标识
   * @param loader - 加载函数
   */
  async getOrLoad<T extends Component>(
    key: string,
    loader: () => Promise<T | { default: T }>
  ): Promise<T> {
    // 已缓存
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // 正在加载
    if (this.loadPromises.has(key)) {
      return this.loadPromises.get(key) as Promise<T>;
    }

    // 开始加载
    const loadPromise = loader().then((module) => {
      const component = 'default' in module ? module.default : module;
      this.cache.set(key, component);
      this.loadPromises.delete(key);
      return component;
    });

    this.loadPromises.set(key, loadPromise as Promise<Component>);
    return loadPromise;
  }

  /**
   * 预加载组件
   * @param key - 组件标识
   * @param loader - 加载函数
   */
  preload<T extends Component>(
    key: string,
    loader: () => Promise<T | { default: T }>
  ): void {
    if (!this.cache.has(key) && !this.loadPromises.has(key)) {
      this.getOrLoad(key, loader).catch((err) => {
        console.warn(`[ComponentCache] Preload failed for ${key}:`, err);
      });
    }
  }

  /**
   * 检查是否已缓存
   * @param key - 组件标识
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 清除缓存
   * @param key - 组件标识（可选，不传则清除所有）
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// 全局组件缓存实例
export const componentCache = new ComponentCache();
