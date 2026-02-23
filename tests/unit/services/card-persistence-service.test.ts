import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveCardMock, writeTextMock } = vi.hoisted(() => ({
  saveCardMock: vi.fn(),
  writeTextMock: vi.fn(),
}));

vi.mock('@/services/sdk-service', () => ({
  getEditorSdk: vi.fn(async () => ({
    card: {
      save: saveCardMock,
    },
  })),
}));

vi.mock('@/services/resource-service', () => ({
  resourceService: {
    workspaceRoot: '/ProductFinishedProductTestingSpace/TestWorkspace',
    writeText: writeTextMock,
  },
}));

import { saveCardToWorkspace } from '@/services/card-persistence-service';

describe('card-persistence-service', () => {
  beforeEach(() => {
    saveCardMock.mockReset();
    writeTextMock.mockReset();
    saveCardMock.mockResolvedValue(undefined);
    writeTextMock.mockResolvedValue(undefined);
  });

  it('saves card metadata/structure and writes all base card content files', async () => {
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

    await saveCardToWorkspace(card as any);

    expect(saveCardMock).toHaveBeenCalledTimes(1);
    const [cardPath, payload, saveOptions] = saveCardMock.mock.calls[0]!;
    expect(cardPath).toBe('TestWorkspace/card-001.card');
    expect(saveOptions).toEqual({ overwrite: true });
    expect(payload.metadata.card_id).toBe('card-001');
    expect(payload.metadata.modified_at).toBeTruthy();
    expect(payload.structure.structure).toEqual([
      { id: 'base-001', type: 'RichTextCard' },
      { id: 'base-002', type: 'ImageCard' },
    ]);

    expect(writeTextMock).toHaveBeenCalledTimes(2);
    expect(writeTextMock).toHaveBeenCalledWith(
      'TestWorkspace/card-001.card/content/base-001.yaml',
      expect.stringContaining('type: RichTextCard')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      'TestWorkspace/card-001.card/content/base-002.yaml',
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
      filePath: 'Workspace/A.card',
    };

    await saveCardToWorkspace(card as any, 'Workspace/B.card');

    expect(saveCardMock).toHaveBeenCalledTimes(1);
    expect(saveCardMock).toHaveBeenCalledWith(
      'Workspace/B.card',
      expect.any(Object),
      { overwrite: true }
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      'Workspace/B.card/content/base-001.yaml',
      expect.any(String)
    );
  });

  it('throws when sdk save fails', async () => {
    saveCardMock.mockRejectedValueOnce(new Error('save failed'));

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
    expect(writeTextMock).not.toHaveBeenCalled();
  });
});
