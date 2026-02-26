import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeEditorRuntimeMock, getEditorConnectorMock } = vi.hoisted(() => ({
  invokeEditorRuntimeMock: vi.fn(),
  getEditorConnectorMock: vi.fn(),
}));

vi.mock('@/services/editor-runtime-gateway', () => ({
  invokeEditorRuntime: invokeEditorRuntimeMock,
}));

vi.mock('@/services/sdk-service', () => ({
  getEditorConnector: getEditorConnectorMock,
}));

const defaultWorkspaceRoot = '/ProductFinishedProductTestingSpace/TestWorkspace';
const defaultExternalRoot = '/ProductFinishedProductTestingSpace/ExternalEnvironment';

async function loadResourceServiceModule() {
  const module = await import('@/services/resource-service');
  return module;
}

describe('resource-service copy/move protocol contract', () => {
  beforeEach(() => {
    vi.resetModules();
    invokeEditorRuntimeMock.mockReset();
    getEditorConnectorMock.mockReset();
    invokeEditorRuntimeMock.mockResolvedValue({});
    getEditorConnectorMock.mockResolvedValue({});
  });

  it('copy sends source/target fields for absolute paths', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy(
      '/ProductFinishedProductTestingSpace/TestWorkspace/a.card',
      '/ProductFinishedProductTestingSpace/TestWorkspace/b.card'
    );

    expect(invokeEditorRuntimeMock).toHaveBeenCalledWith('file', 'copy', {
      source: '/ProductFinishedProductTestingSpace/TestWorkspace/a.card',
      target: '/ProductFinishedProductTestingSpace/TestWorkspace/b.card',
    });
    const payload = invokeEditorRuntimeMock.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('sourcePath');
    expect(payload).not.toHaveProperty('destPath');
  });

  it('copy resolves workspace alias paths before invoking file.copy', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy('TestWorkspace/source.txt', 'TestWorkspace/target.txt');

    expect(invokeEditorRuntimeMock).toHaveBeenCalledWith('file', 'copy', {
      source: '/ProductFinishedProductTestingSpace/TestWorkspace/source.txt',
      target: '/ProductFinishedProductTestingSpace/TestWorkspace/target.txt',
    });
  });

  it('copy resolves external alias paths before invoking file.copy', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy('ExternalEnvironment/source.txt', 'ExternalEnvironment/target.txt');

    expect(invokeEditorRuntimeMock).toHaveBeenCalledWith('file', 'copy', {
      source: '/ProductFinishedProductTestingSpace/ExternalEnvironment/source.txt',
      target: '/ProductFinishedProductTestingSpace/ExternalEnvironment/target.txt',
    });
  });

  it('copy fails fast when source path cannot resolve to absolute path', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths('', '');

    await expect(resourceService.copy('relative-source.txt', '/tmp/target.txt')).rejects.toThrow(
      '[ResourceService] Path must resolve to an absolute path: relative-source.txt'
    );
    expect(invokeEditorRuntimeMock).not.toHaveBeenCalled();
  });

  it('copy throws runtime error when file.copy fails', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    invokeEditorRuntimeMock.mockRejectedValueOnce({
      code: 'SERVICE_COPY_DENIED',
      message: 'copy denied',
      retryable: false,
    });

    await expect(resourceService.copy('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toMatchObject({
      code: 'SERVICE_COPY_DENIED',
      message: 'copy denied',
    });
  });

  it('move sends source/target fields for file.move requests', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.move('TestWorkspace/from-folder/a.txt', 'TestWorkspace/to-folder/a.txt');

    expect(invokeEditorRuntimeMock).toHaveBeenCalledWith('file', 'move', {
      source: '/ProductFinishedProductTestingSpace/TestWorkspace/from-folder/a.txt',
      target: '/ProductFinishedProductTestingSpace/TestWorkspace/to-folder/a.txt',
    });
    const payload = invokeEditorRuntimeMock.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('sourcePath');
    expect(payload).not.toHaveProperty('destPath');
  });

  it('move throws runtime error when file.move fails', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    invokeEditorRuntimeMock.mockRejectedValueOnce({
      code: 'SERVICE_MOVE_DENIED',
      message: 'move denied',
      retryable: false,
    });

    await expect(resourceService.move('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toMatchObject({
      code: 'SERVICE_MOVE_DENIED',
      message: 'move denied',
    });
  });
});
