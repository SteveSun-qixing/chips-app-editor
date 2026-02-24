import { describe, expect, it } from 'vitest';
import {
  createRequestNonceTracker,
  generateBridgeNonce,
  getIframeTargetOrigin,
  hasRoutePermission,
  isTrustedBridgeEnvelope,
  isTrustedIframeOrigin,
  normalizePermissionToken,
} from '@/components/edit-panel/plugin-host/bridge-security';

describe('bridge-security helpers', () => {
  it('tracks nonce and blocks replay', () => {
    const tracker = createRequestNonceTracker(4);

    expect(tracker.track('nonce-1')).toBe(true);
    expect(tracker.track('nonce-1')).toBe(false);
  });

  it('evicts stale nonces when capacity exceeded', () => {
    const tracker = createRequestNonceTracker(2);

    expect(tracker.track('nonce-1')).toBe(true);
    expect(tracker.track('nonce-2')).toBe(true);
    expect(tracker.track('nonce-3')).toBe(true);

    expect(tracker.track('nonce-1')).toBe(true);
  });

  it('resets nonce tracker state', () => {
    const tracker = createRequestNonceTracker(2);
    tracker.track('nonce-1');
    tracker.reset();

    expect(tracker.track('nonce-1')).toBe(true);
  });

  it('normalizes permission token', () => {
    expect(normalizePermissionToken('  Resource.Fetch  ')).toBe('resource.fetch');
  });

  it('matches route permission with exact, wildcard and global tokens', () => {
    expect(hasRoutePermission(new Set(['resource.fetch']), 'resource', 'fetch')).toBe(true);
    expect(hasRoutePermission(new Set(['resource.*']), 'resource', 'fetch')).toBe(true);
    expect(hasRoutePermission(new Set(['*']), 'resource', 'fetch')).toBe(true);
    expect(hasRoutePermission(new Set(['file.read']), 'resource', 'fetch')).toBe(false);
  });

  it('resolves target origin fallback', () => {
    expect(getIframeTargetOrigin('https://example.com')).toBe('https://example.com');
    expect(getIframeTargetOrigin(null)).toBe('*');
    expect(getIframeTargetOrigin('null')).toBe('*');
  });

  it('validates trusted iframe origin', () => {
    expect(isTrustedIframeOrigin('https://example.com', 'https://example.com')).toBe(true);
    expect(isTrustedIframeOrigin('null', 'chips://plugin')).toBe(true);
    expect(isTrustedIframeOrigin('https://attacker.com', 'https://example.com')).toBe(false);
  });

  it('validates bridge envelope', () => {
    expect(
      isTrustedBridgeEnvelope(
        {
          pluginId: 'chips-official.rich-text-card',
          sessionNonce: 'nonce-1',
        },
        'chips-official.rich-text-card',
        'nonce-1'
      )
    ).toBe(true);

    expect(
      isTrustedBridgeEnvelope(
        {
          pluginId: 'chips-official.rich-text-card',
          sessionNonce: 'nonce-1',
        },
        'chips-official.image-card',
        'nonce-1'
      )
    ).toBe(false);
  });

  it('generates non-empty nonce', () => {
    expect(generateBridgeNonce().length).toBeGreaterThan(0);
  });
});
