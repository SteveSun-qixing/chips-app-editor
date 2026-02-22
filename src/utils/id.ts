/**
 * 62 进制 ID 工具
 * @module utils/id
 */

const ID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getRandomBytes(length: number): Uint8Array | null {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  return null;
}

function buildIdFromRandom(length: number): string {
  const bytes = getRandomBytes(length);
  if (bytes) {
    let id = '';
    for (let i = 0; i < length; i += 1) {
      const value = bytes[i] ?? 0;
      id += ID_CHARS[value % ID_CHARS.length];
    }
    return id;
  }

  let fallbackId = '';
  for (let i = 0; i < length; i += 1) {
    fallbackId += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }
  return fallbackId;
}

/**
 * 生成 62 进制 ID
 * @param length - 长度，默认 10
 */
export function generateId62(length = 10): string {
  if (length <= 0) {
    throw new Error('ID length must be greater than 0');
  }

  const zeroId = '0'.repeat(length);
  let id = buildIdFromRandom(length);
  while (id === zeroId) {
    id = buildIdFromRandom(length);
  }
  return id;
}

/**
 * 校验 62 进制 ID
 * @param id - 待校验 ID
 * @param length - 长度，默认 10
 */
export function isValidId62(id: string, length = 10): boolean {
  if (typeof id !== 'string') return false;
  const pattern = new RegExp(`^[0-9a-zA-Z]{${length}}$`);
  if (!pattern.test(id)) return false;
  return id !== '0'.repeat(length);
}

/**
 * 生成带前缀的 ID
 * @param prefix - 前缀
 * @param length - ID 长度
 */
export function generateScopedId(prefix: string, length = 10): string {
  return `${prefix}_${generateId62(length)}`;
}
