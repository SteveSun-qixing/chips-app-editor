import { describe, expect, it } from 'vitest';

import { requireCardPath, resolveCardPath } from '@/services/card-path-service';

const WORKSPACE_ROOT = '/ProductFinishedProductTestingSpace/TestWorkspace';

describe('card-path-service', () => {
  it('keeps absolute file path unchanged', () => {
    expect(resolveCardPath('card-001', '/absolute/path/card-001', WORKSPACE_ROOT)).toBe(
      '/absolute/path/card-001',
    );
  });

  it('resolves workspace alias path to absolute path', () => {
    expect(resolveCardPath('card-001', 'TestWorkspace/card-001', WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
    );
  });

  it('resolves plain relative path to workspace root', () => {
    expect(resolveCardPath('card-001', 'cards/card-001', WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/cards/card-001',
    );
  });

  it('normalizes windows separators in file path', () => {
    expect(resolveCardPath('card-001', 'TestWorkspace\\cards\\card-001', WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/cards/card-001',
    );
  });

  it('builds fallback path from workspace root when file path missing', () => {
    expect(resolveCardPath('card-001', undefined, WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
    );
  });

  it('strips .card suffix from card id when building fallback path', () => {
    expect(resolveCardPath('card-001.card', undefined, WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
    );
  });

  it('falls back to card id when workspace root is unavailable', () => {
    expect(resolveCardPath('card-001')).toBe('card-001');
  });

  it('requireCardPath returns explicit file path when available', () => {
    expect(requireCardPath('card-001', 'TestWorkspace/card-001', 'unit-test', WORKSPACE_ROOT)).toBe(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
    );
  });

  it('requireCardPath throws when card id and file path are both missing', () => {
    expect(() => requireCardPath(undefined, undefined, 'unit-test')).toThrow(
      '[CardPath] Missing card path for unit-test',
    );
  });
});
