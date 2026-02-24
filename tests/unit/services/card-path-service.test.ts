import { describe, expect, it } from 'vitest';
import { requireCardPath, resolveCardPath } from '@/services/card-path-service';

describe('card-path-service', () => {
  const workspaceRoot = '/Users/sevenstars/Documents/ChipsCard/Develop/Project-12/ProductFinishedProductTestingSpace/TestWorkspace';

  it('keeps absolute file path unchanged', () => {
    const absolutePath = '/tmp/cards/demo-card';
    expect(resolveCardPath('demo-card', absolutePath, workspaceRoot)).toBe(absolutePath);
  });

  it('resolves workspace-relative file path to absolute path', () => {
    const relativePath = 'TestWorkspace/demo-card';
    expect(resolveCardPath('demo-card', relativePath, workspaceRoot)).toBe(
      '/Users/sevenstars/Documents/ChipsCard/Develop/Project-12/ProductFinishedProductTestingSpace/TestWorkspace/demo-card'
    );
  });

  it('falls back to workspace card path when filePath is missing', () => {
    expect(resolveCardPath('demo-card', undefined, workspaceRoot)).toBe(
      '/Users/sevenstars/Documents/ChipsCard/Develop/Project-12/ProductFinishedProductTestingSpace/TestWorkspace/demo-card.card'
    );
  });

  it('throws when card id and filePath are both missing', () => {
    expect(() => requireCardPath(undefined, undefined, 'unit test')).toThrow(
      '[CardPath] Missing card path for unit test'
    );
  });
});
