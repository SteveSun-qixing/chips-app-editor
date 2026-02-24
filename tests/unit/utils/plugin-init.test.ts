import { describe, expect, it } from 'vitest';

import {
  extractWorkspaceRoot,
  extractWorkspaceRootFromLaunchFile,
  parsePluginInitPayload,
} from '@/utils/plugin-init';

describe('plugin-init utils', () => {
  it('extracts workspace root from launch params', () => {
    const payload = parsePluginInitPayload({
      pluginId: 'chips-official.editor',
      launchParams: {
        workspaceRoot: '/workspace/cards',
      },
      timestamp: Date.now(),
    });

    expect(payload).not.toBeNull();
    expect(extractWorkspaceRoot(payload!)).toBe('/workspace/cards');
  });

  it('supports top-level workspace root fallback payload', () => {
    const payload = parsePluginInitPayload({
      pluginId: 'chips-official.editor',
      workspaceRoot: '/workspace/top-level',
      timestamp: Date.now(),
    });

    expect(payload).not.toBeNull();
    expect(extractWorkspaceRoot(payload!)).toBe('/workspace/top-level');
  });

  it('infers workspace root from launch file path', () => {
    const payload = parsePluginInitPayload({
      launchParams: {
        file: {
          path: '/workspace/cards/card-001.card',
        },
      },
    });

    expect(payload).not.toBeNull();
    expect(extractWorkspaceRootFromLaunchFile(payload!)).toBe('/workspace/cards');
  });

  it('returns null when launch file path is missing', () => {
    const payload = parsePluginInitPayload({
      launchParams: {
        reason: 'manual-open',
      },
    });

    expect(payload).not.toBeNull();
    expect(extractWorkspaceRootFromLaunchFile(payload!)).toBeNull();
  });
});
