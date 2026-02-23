interface IframeMessageChannelOptions {
  getIframeWindow: () => Window | null;
  getTargetOrigin: () => string;
}

export interface IframeMessageChannel {
  post(message: Record<string, unknown>): boolean;
}

function normalizePostMessageValue(
  value: unknown,
  seen: WeakMap<object, unknown> = new WeakMap()
): unknown {
  if (
    value === null
    || value === undefined
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || typeof value === 'bigint'
  ) {
    return value;
  }

  if (typeof value === 'symbol' || typeof value === 'function') {
    return undefined;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (
    value instanceof Date
    || value instanceof RegExp
    || value instanceof Blob
    || (typeof File !== 'undefined' && value instanceof File)
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
  ) {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const normalizedArray: unknown[] = [];
    seen.set(value, normalizedArray);
    for (const item of value) {
      normalizedArray.push(normalizePostMessageValue(item, seen));
    }
    return normalizedArray;
  }

  if (value instanceof Map) {
    const normalizedMap = new Map<unknown, unknown>();
    seen.set(value, normalizedMap);
    for (const [key, item] of value.entries()) {
      const normalizedItem = normalizePostMessageValue(item, seen);
      if (normalizedItem !== undefined) {
        normalizedMap.set(key, normalizedItem);
      }
    }
    return normalizedMap;
  }

  if (value instanceof Set) {
    const normalizedSet = new Set<unknown>();
    seen.set(value, normalizedSet);
    for (const item of value.values()) {
      const normalizedItem = normalizePostMessageValue(item, seen);
      if (normalizedItem !== undefined) {
        normalizedSet.add(normalizedItem);
      }
    }
    return normalizedSet;
  }

  const normalizedObject: Record<string, unknown> = {};
  seen.set(value, normalizedObject);
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalizedItem = normalizePostMessageValue(item, seen);
    if (normalizedItem !== undefined) {
      normalizedObject[key] = normalizedItem;
    }
  }

  return normalizedObject;
}

function createCloneablePayload(message: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizePostMessageValue(message);
  if (typeof structuredClone === 'function') {
    return structuredClone(normalized) as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(normalized)) as Record<string, unknown>;
}

export function createIframeMessageChannel(
  options: IframeMessageChannelOptions
): IframeMessageChannel {
  return {
    post(message: Record<string, unknown>): boolean {
      const iframeWindow = options.getIframeWindow();
      if (!iframeWindow) {
        return false;
      }

      try {
        const payload = createCloneablePayload(message);
        iframeWindow.postMessage(payload, options.getTargetOrigin());
        return true;
      } catch {
        return false;
      }
    },
  };
}
