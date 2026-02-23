import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDirMock,
  listMock,
  metadataMock,
  existsMock,
  readTextMock,
  writeTextMock,
  moveMock,
  deleteMock,
  createCardInitializerMock,
  createCardMock,
} = vi.hoisted(() => ({
  ensureDirMock: vi.fn(),
  listMock: vi.fn(),
  metadataMock: vi.fn(),
  existsMock: vi.fn(),
  readTextMock: vi.fn(),
  writeTextMock: vi.fn(),
  moveMock: vi.fn(),
  deleteMock: vi.fn(),
  createCardInitializerMock: vi.fn(),
  createCardMock: vi.fn(),
}));

let workspaceRoot = '/ProductFinishedProductTestingSpace/TestWorkspace';

vi.mock('@/services/resource-service', () => ({
  resourceService: {
    get workspaceRoot() {
      return workspaceRoot;
    },
    get externalRoot() {
      return '/ProductFinishedProductTestingSpace/ExternalEnvironment';
    },
    ensureDir: ensureDirMock,
    list: listMock,
    metadata: metadataMock,
    exists: existsMock,
    readText: readTextMock,
    writeText: writeTextMock,
    move: moveMock,
    delete: deleteMock,
  },
}));

vi.mock('@/core/card-initializer', () => ({
  createCardInitializer: createCardInitializerMock,
}));

import { createWorkspaceService } from '@/core/workspace-service';

function setupEmptyWorkspaceMocks(): void {
  listMock.mockImplementation(async () => []);
  metadataMock.mockImplementation(async () => ({
    exists: false,
    isDirectory: false,
    isFile: false,
    modified: '2026-01-01T00:00:00.000Z',
  }));
  existsMock.mockResolvedValue(false);
  readTextMock.mockResolvedValue('');
}

describe('workspace-service', () => {
  beforeEach(() => {
    workspaceRoot = '/ProductFinishedProductTestingSpace/TestWorkspace';

    ensureDirMock.mockReset();
    listMock.mockReset();
    metadataMock.mockReset();
    existsMock.mockReset();
    readTextMock.mockReset();
    writeTextMock.mockReset();
    moveMock.mockReset();
    deleteMock.mockReset();
    createCardInitializerMock.mockReset();
    createCardMock.mockReset();

    ensureDirMock.mockResolvedValue(undefined);
    writeTextMock.mockResolvedValue(undefined);
    moveMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);

    setupEmptyWorkspaceMocks();

    createCardMock.mockResolvedValue({
      success: true,
      cardPath: '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
      createdFiles: [],
    });
    createCardInitializerMock.mockImplementation(() => ({
      createCard: createCardMock,
    }));
  });

  it('initializes with absolute workspace root and scans files', async () => {
    const service = createWorkspaceService();

    await service.initialize();

    expect(service.state.value.rootPath).toBe('/ProductFinishedProductTestingSpace/TestWorkspace');
    expect(ensureDirMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/TestWorkspace');
    expect(listMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/TestWorkspace');
  });

  it('rejects non-absolute workspace root during initialize', async () => {
    workspaceRoot = 'relative/workspace';
    const service = createWorkspaceService();

    await expect(service.initialize()).rejects.toThrow(
      '[WorkspaceService] Workspace root must be an absolute path'
    );
  });

  it('creates card using absolute parent path resolved from workspace alias', async () => {
    const service = createWorkspaceService();
    await service.initialize();

    await service.createCard('Test Card', undefined, 'card-001', 'TestWorkspace/sub-folder');

    expect(createCardInitializerMock).toHaveBeenCalledWith({
      workspaceRoot: '/ProductFinishedProductTestingSpace/TestWorkspace/sub-folder',
    });
  });

  it('blocks createCard when workspace root is unavailable', async () => {
    workspaceRoot = '';
    const service = createWorkspaceService();
    await service.initialize();

    await expect(service.createCard('Test Card')).rejects.toThrow(
      '[WorkspaceService] Workspace root is not configured'
    );
  });

  it('refreshes to empty file list when workspace root is empty', async () => {
    workspaceRoot = '';
    const service = createWorkspaceService();

    await service.initialize();

    expect(service.files.value).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('keeps folder creation inside workspace boundary', async () => {
    const service = createWorkspaceService();
    await service.initialize();

    await service.createFolder('safe-folder', '/tmp/escape-attempt');

    expect(ensureDirMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/TestWorkspace/safe-folder');
  });

  it('opens file by resolving workspace alias to absolute path', async () => {
    listMock.mockImplementation(async (path: string) => {
      if (path === '/ProductFinishedProductTestingSpace/TestWorkspace') {
        return ['card-001'];
      }
      return [];
    });

    metadataMock.mockImplementation(async (path: string) => {
      if (path === '/ProductFinishedProductTestingSpace/TestWorkspace/card-001') {
        return {
          exists: true,
          isDirectory: true,
          isFile: false,
          modified: '2026-01-01T00:00:00.000Z',
        };
      }
      return {
        exists: false,
        isDirectory: false,
        isFile: false,
        modified: '2026-01-01T00:00:00.000Z',
      };
    });

    existsMock.mockImplementation(async (path: string) => {
      return path === '/ProductFinishedProductTestingSpace/TestWorkspace/card-001/.card/metadata.yaml';
    });

    readTextMock.mockImplementation(async (path: string) => {
      if (path.endsWith('.card/metadata.yaml')) {
        return ['card_id: card-001', 'name: Card 001', 'created_at: 2026-01-01T00:00:00.000Z'].join('\n');
      }
      return '';
    });

    const service = createWorkspaceService();
    await service.initialize();

    await service.openFileByPath('TestWorkspace/card-001');

    expect(service.state.value.openedFiles).toEqual(['card-001']);
  });

  it('reinitializes when workspace root changes', async () => {
    const service = createWorkspaceService();
    await service.initialize();

    workspaceRoot = '/ProductFinishedProductTestingSpace/AnotherWorkspace';
    await service.initialize();

    expect(service.state.value.rootPath).toBe('/ProductFinishedProductTestingSpace/AnotherWorkspace');
    expect(ensureDirMock).toHaveBeenCalledWith('/ProductFinishedProductTestingSpace/AnotherWorkspace');
  });
});
