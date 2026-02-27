import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeEditorRuntimeMock } = vi.hoisted(() => ({
  invokeEditorRuntimeMock: vi.fn(),
}));

vi.mock('@/services/editor-runtime-gateway', () => ({
  invokeEditorRuntime: invokeEditorRuntimeMock,
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
    invokeEditorRuntimeMock.mockResolvedValue({});
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

describe('resource-service conversion runtime adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    invokeEditorRuntimeMock.mockReset();
  });

  it('maps runtime invoke success to bridge request success response', async () => {
    const { __createRuntimeRequestBridgeClientForTests } = await loadResourceServiceModule();
    const runtimeInvoke = vi.fn().mockResolvedValue({ content: 'ok' });

    const bridge = await __createRuntimeRequestBridgeClientForTests(runtimeInvoke);
    const response = await bridge.request<{ content: string }>({
      service: 'file',
      method: 'read',
      payload: { path: '/tmp/a.card' },
    });

    expect(runtimeInvoke).toHaveBeenCalledWith('file', 'read', { path: '/tmp/a.card' });
    expect(response).toEqual({
      success: true,
      data: { content: 'ok' },
    });
  });

  it('maps runtime invoke failure to bridge request error response', async () => {
    const { __createRuntimeRequestBridgeClientForTests } = await loadResourceServiceModule();
    const runtimeInvoke = vi.fn().mockRejectedValue({
      code: 'SERVICE_FILE_READ_FAILED',
      message: 'read failed',
    });

    const bridge = await __createRuntimeRequestBridgeClientForTests(runtimeInvoke);
    const response = await bridge.request({
      service: 'file',
      method: 'read',
      payload: { path: '/tmp/a.card' },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('read failed');
  });

  it('maps runtime timeout to bridge request timeout error response', async () => {
    const { __createRuntimeRequestBridgeClientForTests } = await loadResourceServiceModule();
    const runtimeInvoke = vi.fn(() => new Promise<never>(() => undefined));

    const bridge = await __createRuntimeRequestBridgeClientForTests(runtimeInvoke);
    const response = await bridge.request({
      service: 'file',
      method: 'read',
      payload: { path: '/tmp/a.card' },
      timeout: 5,
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('Bridge request timeout: file.read');
  });
});
