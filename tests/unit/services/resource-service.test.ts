import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock, getEditorConnectorMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  getEditorConnectorMock: vi.fn(),
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
    requestMock.mockReset();
    getEditorConnectorMock.mockReset();
    requestMock.mockResolvedValue({ success: true });
    getEditorConnectorMock.mockResolvedValue({ request: requestMock });
  });

  it('copy sends source/target fields for absolute paths', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy('/ProductFinishedProductTestingSpace/TestWorkspace/a.card', '/ProductFinishedProductTestingSpace/TestWorkspace/b.card');

    expect(requestMock).toHaveBeenCalledWith({
      service: 'file',
      method: 'copy',
      payload: {
        source: '/ProductFinishedProductTestingSpace/TestWorkspace/a.card',
        target: '/ProductFinishedProductTestingSpace/TestWorkspace/b.card',
      },
    });
    const payload = requestMock.mock.calls[0]?.[0]?.payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('sourcePath');
    expect(payload).not.toHaveProperty('destPath');
  });

  it('copy resolves workspace alias paths before invoking file.copy', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy('TestWorkspace/source.txt', 'TestWorkspace/target.txt');

    expect(requestMock).toHaveBeenCalledWith({
      service: 'file',
      method: 'copy',
      payload: {
        source: '/ProductFinishedProductTestingSpace/TestWorkspace/source.txt',
        target: '/ProductFinishedProductTestingSpace/TestWorkspace/target.txt',
      },
    });
  });

  it('copy resolves external alias paths before invoking file.copy', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.copy('ExternalEnvironment/source.txt', 'ExternalEnvironment/target.txt');

    expect(requestMock).toHaveBeenCalledWith({
      service: 'file',
      method: 'copy',
      payload: {
        source: '/ProductFinishedProductTestingSpace/ExternalEnvironment/source.txt',
        target: '/ProductFinishedProductTestingSpace/ExternalEnvironment/target.txt',
      },
    });
  });

  it('copy fails fast when source path cannot resolve to absolute path', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths('', '');

    await expect(resourceService.copy('relative-source.txt', '/tmp/target.txt')).rejects.toThrow(
      '[ResourceService] Path must resolve to an absolute path: relative-source.txt'
    );
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('copy throws backend error when file.copy fails', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    requestMock.mockResolvedValueOnce({ success: false, error: 'copy denied' });

    await expect(resourceService.copy('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toThrow(
      'copy denied'
    );
  });

  it('copy falls back to default error message when backend error is empty', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    requestMock.mockResolvedValueOnce({ success: false });

    await expect(resourceService.copy('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toThrow(
      'Copy failed'
    );
  });

  it('move sends source/target fields for file.move requests', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);

    await resourceService.move('TestWorkspace/from-folder/a.txt', 'TestWorkspace/to-folder/a.txt');

    expect(requestMock).toHaveBeenCalledWith({
      service: 'file',
      method: 'move',
      payload: {
        source: '/ProductFinishedProductTestingSpace/TestWorkspace/from-folder/a.txt',
        target: '/ProductFinishedProductTestingSpace/TestWorkspace/to-folder/a.txt',
      },
    });
    const payload = requestMock.mock.calls[0]?.[0]?.payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('sourcePath');
    expect(payload).not.toHaveProperty('destPath');
  });

  it('move throws backend error when file.move fails', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    requestMock.mockResolvedValueOnce({ success: false, error: 'move denied' });

    await expect(resourceService.move('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toThrow(
      'move denied'
    );
  });

  it('move falls back to default error message when backend error is empty', async () => {
    const { resourceService, setWorkspacePaths } = await loadResourceServiceModule();
    setWorkspacePaths(defaultWorkspaceRoot, defaultExternalRoot);
    requestMock.mockResolvedValueOnce({ success: false });

    await expect(resourceService.move('TestWorkspace/source.txt', 'TestWorkspace/target.txt')).rejects.toThrow(
      'Move failed'
    );
  });
});
