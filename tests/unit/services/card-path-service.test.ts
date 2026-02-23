import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireCardPath, resolveCardPath } from '@/services/card-path-service';

describe('card-path-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers explicit file path', () => {
    expect(resolveCardPath('card-001', ' Workspace/real.card ')).toBe('Workspace/real.card');
  });

  it('builds fallback path from workspace root when file path missing', () => {
    expect(resolveCardPath('card-001', undefined, '/ProductFinishedProductTestingSpace/TestWorkspace')).toBe(
      'TestWorkspace/card-001.card',
    );
  });

  it('falls back to card id when workspace root is unavailable', () => {
    expect(resolveCardPath('card-001')).toBe('card-001.card');
  });

  it('requireCardPath throws when card id and file path are both missing', () => {
    expect(() => requireCardPath(undefined, undefined, 'unit-test')).toThrow(
      '[CardPath] Missing card path for unit-test',
    );
  });
});
