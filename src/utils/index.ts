/**
 * 工具函数导出
 * @module utils
 */

import { generateId62 } from './id';

// 导出性能优化工具
export * from './performance';
// export * from './virtual-list'; // TODO: 等待 virtual-list 迁移
export * from './lazy-load';
export * from './id';

/**
 * 生成唯一ID
 * @param prefix - ID前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${generateId62()}`;
}

/**
 * 深度克隆对象
 * @param obj - 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 限制数值范围
 * @param value - 要限制的值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 延迟函数
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 空操作函数
 */
export function noop(): void {}

/**
 * 判断是否为对象
 * @param value - 要判断的值
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 判断是否为函数
 * @param value - 要判断的值
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * 判断是否为字符串
 * @param value - 要判断的值
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 判断是否为数字
 * @param value - 要判断的值
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 判断是否为 undefined 或 null
 * @param value - 要判断的值
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 移除数组中的指定元素
 * @param array - 数组
 * @param item - 要移除的元素
 * @returns 是否移除成功
 */
export function removeFromArray<T>(array: T[], item: T): boolean {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * 合并对象（浅合并）
 * @param target - 目标对象
 * @param source - 源对象
 */
export function mergeObjects<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  return { ...target, ...source };
}

/**
 * 类名值类型
 */
export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | { [key: string]: boolean | undefined | null };

function toClassName(value: ClassValue): string {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toClassName).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .join(' ');
  }

  return '';
}

/**
 * 组合多个类名
 */
export function classNames(...args: ClassValue[]): string {
  return args.map(toClassName).filter(Boolean).join(' ');
}

/**
 * 创建带前缀的类名生成器
 */
export function createBEM(block: string, prefix = 'chips') {
  const blockClass = `${prefix}-${block}`;

  return function bem(element?: string, modifier?: string): string {
    let result = blockClass;

    if (element) {
      result += `__${element}`;
    }

    if (modifier) {
      result += `--${modifier}`;
    }

    return result;
  };
}

/**
 * 将像素值转换为数字
 */
export function pxToNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseInt(value.replace('px', ''), 10) || 0;
}

/**
 * 获取随机数
 * @param min - 最小值
 * @param max - 最大值
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化日期
 * @param date - 日期对象或时间戳
 * @param format - 格式字符串
 */
export function formatDate(
  date: Date | number,
  format = 'YYYY-MM-DD HH:mm:ss'
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const replacements: Record<string, string> = {
    YYYY: d.getFullYear().toString(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => replacements[match] || match);
}
