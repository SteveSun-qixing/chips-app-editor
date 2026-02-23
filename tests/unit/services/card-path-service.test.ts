import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireCardPath, resolveCardPath } from '@/services/card-path-service';

describe('card-path-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers explicit file path and resolves workspace alias to absolute path', () => {
    expect(
      resolveCardPath('card-001', ' TestWorkspace/real ', '/ProductFinishedProductTestingSpace/TestWorkspace')
    ).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/real');
  });

  it('returns absolute file path directly when file path is already absolute', () => {
    expect(
      resolveCardPath('card-001', '/ProductFinishedProductTestingSpace/TestWorkspace/real')
    ).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/real');
  });

  it('builds fallback path from workspace root when file path missing', () => {
    expect(resolveCardPath('card-001', undefined, '/ProductFinishedProductTestingSpace/TestWorkspace')).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
    );
  });

  it('returns empty string when only relative file path is provided without workspace root', () => {
    expect(resolveCardPath('card-001', 'relative/path')).toBe('');
  });

  it('returns empty string when only card id is provided without workspace root', () => {
    expect(resolveCardPath('card-001')).toBe('');
  });

  it('strips .card suffix from card id when building fallback path', () => {
    expect(
      resolveCardPath('card-001.card', undefined, '/ProductFinishedProductTestingSpace/TestWorkspace')
    ).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/card-001');
  });

  it('returns empty string when file path and card id are both empty', () => {
    expect(resolveCardPath('   ', '   ', '/ProductFinishedProductTestingSpace/TestWorkspace')).toBe('');
  });

  it('requireCardPath throws when card id and file path are both missing', () => {
    expect(() => requireCardPath(undefined, undefined, 'unit-test')).toThrow(
      '[CardPath] Missing card path for unit-test',
    );
  });

  it('requireCardPath throws when workspace root is missing and only card id is provided', () => {
    expect(() => requireCardPath('card-001', undefined, 'unit-test')).toThrow(
      '[CardPath] Missing card path for unit-test',
    );
  });
});
