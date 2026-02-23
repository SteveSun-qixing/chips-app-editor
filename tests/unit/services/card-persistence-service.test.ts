import { beforeEach, describe, expect, it, vi } from 'vitest';

const { writeTextMock, ensureDirMock } = vi.hoisted(() => ({
  writeTextMock: vi.fn(),
  ensureDirMock: vi.fn(),
}));

vi.mock('@/services/resource-service', () => ({
  resourceService: {
    workspaceRoot: '/ProductFinishedProductTestingSpace/TestWorkspace',
    writeText: writeTextMock,
    ensureDir: ensureDirMock,
  },
}));

import { saveCardToWorkspace } from '@/services/card-persistence-service';

describe('card-persistence-service', () => {
  beforeEach(() => {
    writeTextMock.mockReset();
    ensureDirMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
    ensureDirMock.mockResolvedValue(undefined);
  });

  it('writes metadata/structure and all base card content files into workspace folder', async () => {
    const card = {
      id: 'card-001',
      metadata: {
        card_id: 'card-001',
        name: 'Test Card',
        created_at: '2026-01-01T00:00:00.000Z',
        modified_at: '2026-01-01T00:00:00.000Z',
      },
      structure: [
        {
          id: 'base-001',
          type: 'RichTextCard',
          config: {
            content_source: 'inline',
            content_text: '<p>Hello</p>',
          },
        },
        {
          id: 'base-002',
          type: 'ImageCard',
          config: {
            images: [],
          },
        },
      ],
      isLoading: false,
      isModified: true,
      lastModified: Date.now(),
    };

    const cardPath = await saveCardToWorkspace(card as any);

    expect(cardPath).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/card-001');
    expect(ensureDirMock).toHaveBeenCalledTimes(2);
    expect(ensureDirMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/TestWorkspace/card-001/.card');
    expect(ensureDirMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/TestWorkspace/card-001/content');

    expect(writeTextMock).toHaveBeenCalledTimes(4);
    expect(writeTextMock).toHaveBeenCalledWith(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001/.card/metadata.yaml',
      expect.stringContaining('card_id: card-001')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001/.card/structure.yaml',
      expect.stringContaining('card_count: 2')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001/content/base-001.yaml',
      expect.stringContaining('type: RichTextCard')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      '/ProductFinishedProductTestingSpace/TestWorkspace/card-001/content/base-002.yaml',
      expect.stringContaining('type: ImageCard')
    );
  });

  it('prefers explicit card path over fallback path', async () => {
    const card = {
      id: 'card-002',
      metadata: {
        card_id: 'card-002',
        name: 'Explicit Path Card',
        created_at: '2026-01-01T00:00:00.000Z',
        modified_at: '2026-01-01T00:00:00.000Z',
      },
      structure: [
        {
          id: 'base-001',
          type: 'RichTextCard',
          config: {},
        },
      ],
      isLoading: false,
      isModified: true,
      lastModified: Date.now(),
      filePath: 'TestWorkspace/A',
    };

    const resolvedPath = await saveCardToWorkspace(card as any, 'TestWorkspace/B');

    expect(resolvedPath).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/B');
    expect(writeTextMock).toHaveBeenCalledWith(
      '/ProductFinishedProductTestingSpace/TestWorkspace/B/content/base-001.yaml',
      expect.any(String)
    );
  });

  it('throws when persistence write fails', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('save failed'));

    const card = {
      id: 'card-003',
      metadata: {
        card_id: 'card-003',
        name: 'Failing Card',
        created_at: '2026-01-01T00:00:00.000Z',
        modified_at: '2026-01-01T00:00:00.000Z',
      },
      structure: [],
      isLoading: false,
      isModified: true,
      lastModified: Date.now(),
    };

    await expect(saveCardToWorkspace(card as any)).rejects.toThrow('save failed');
    expect(ensureDirMock).toHaveBeenCalledTimes(2);
  });
});
