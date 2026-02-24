import { describe, expect, it, vi } from 'vitest';

import {
  extractWorkspaceRootFromResponse,
  normalizeBridgePath,
  resolveWorkspaceRootFromBridge,
} from '@/services/workspace-bootstrap-service';

describe('workspace-bootstrap-service', () => {
  it('normalizes path strings from bridge payload', () => {
    expect(normalizeBridgePath('  C:\\work\\TestWorkspace  ')).toBe('C:/work/TestWorkspace');
  });

  it('extracts workspace root from object response', () => {
    expect(extractWorkspaceRootFromResponse({ path: ' /tmp/workspace ' })).toBe('/tmp/workspace');
  });

  it('supports direct string response', () => {
    expect(extractWorkspaceRootFromResponse('/var/data/workspace')).toBe('/var/data/workspace');
  });

  it('returns empty string for unsupported payload', () => {
    expect(extractWorkspaceRootFromResponse({ value: '/tmp/workspace' })).toBe('');
  });

  it('resolves workspace root from bridge invoke', async () => {
    const bridge = {
      invoke: vi.fn().mockResolvedValue({ path: '/workspace/root' }),
    };

    await expect(resolveWorkspaceRootFromBridge(bridge)).resolves.toBe('/workspace/root');
    expect(bridge.invoke).toHaveBeenCalledWith('workspace', 'get', {});
  });

  it('returns empty when bridge invoke fails', async () => {
    const bridge = {
      invoke: vi.fn().mockRejectedValue(new Error('boom')),
    };

    await expect(resolveWorkspaceRootFromBridge(bridge)).resolves.toBe('');
  });
});
