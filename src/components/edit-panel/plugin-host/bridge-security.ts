interface BridgeEnvelope extends Record<string, unknown> {
  pluginId: string;
  sessionNonce: string;
}

export interface RequestNonceTracker {
  track(nonce: string): boolean;
  reset(): void;
}

export function createRequestNonceTracker(maxTracked: number): RequestNonceTracker {
  const consumed = new Set<string>();
  const queue: string[] = [];

  return {
    track(nonce: string): boolean {
      if (consumed.has(nonce)) {
        return false;
      }

      consumed.add(nonce);
      queue.push(nonce);

      if (queue.length > maxTracked) {
        const stale = queue.shift();
        if (stale) {
          consumed.delete(stale);
        }
      }

      return true;
    },

    reset(): void {
      consumed.clear();
      queue.length = 0;
    },
  };
}

export function generateBridgeNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveIframeOrigin(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return null;
  }
}

export function getIframeTargetOrigin(trustedOrigin: string | null): string {
  if (trustedOrigin && trustedOrigin !== 'null') {
    return trustedOrigin;
  }

  return '*';
}

export function normalizePermissionToken(value: string): string {
  return value.trim().toLowerCase();
}

export function hasRoutePermission(
  permissions: ReadonlySet<string>,
  namespace: string,
  action: string
): boolean {
  const normalizedNamespace = namespace.trim().toLowerCase();
  const normalizedAction = action.trim().toLowerCase();
  const exact = `${normalizedNamespace}.${normalizedAction}`;
  const wildcard = `${normalizedNamespace}.*`;

  return permissions.has(exact) || permissions.has(wildcard) || permissions.has('*');
}

export function isTrustedIframeOrigin(origin: string, trustedOrigin: string | null): boolean {
  if (!trustedOrigin) {
    return false;
  }

  if (trustedOrigin === 'null') {
    return origin === 'null' || origin.startsWith('chips://') || origin === 'file://';
  }

  if (trustedOrigin.startsWith('chips://') && origin === 'null') {
    return true;
  }

  if (trustedOrigin.startsWith('file://') && origin === 'null') {
    return true;
  }

  return origin === trustedOrigin;
}

export function isTrustedBridgeEnvelope(
  message: Record<string, unknown>,
  expectedPluginId: string,
  expectedSessionNonce: string
): message is BridgeEnvelope {
  return (
    typeof message.pluginId === 'string'
    && typeof message.sessionNonce === 'string'
    && message.pluginId === expectedPluginId
    && message.sessionNonce === expectedSessionNonce
  );
}
