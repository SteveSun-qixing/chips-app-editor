/**
 * 文件操作端到端测试
 * @module tests/e2e/file-operations
 * @description 测试文件导入导出的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resourceServiceMock, resetResourceServiceMock } from '../helpers/resource-service-mock';

vi.mock('@/services/resource-service', () => ({ resourceService: resourceServiceMock }));
import { setActivePinia, createPinia } from 'pinia';
import { createEventEmitter, EventEmitter } from '@/core/event-manager';
import {
  FileService,
  getFileService,
  resetFileService,
} from '@/core/file-service';
import { resetWorkspaceService } from '@/core/workspace-service';

describe('E2E: 文件导入导出流程', () => {
  let fileService: FileService;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    resetResourceServiceMock();
    setActivePinia(createPinia());
    resetWorkspaceService();
    resetFileService();
    eventEmitter = createEventEmitter();
    fileService = getFileService(eventEmitter);
  });

  afterEach(() => {
    resetFileService();
  });

  describe('场景1: 完整的文件创建和组织流程', () => {
    it('应触发文件创建事件', async () => {
      const events: Array<{ type: string; data: unknown }> = [];
      eventEmitter.on('file:created', (data) => events.push({ type: 'created', data }));

      // 创建卡片文件
      const card = await fileService.createCard({
        name: 'TestCard',
        parentPath: '/workspace',
      });
      expect(card.success).toBe(true);
      expect(card.file?.name).toBe('TestCard.card');

      // 创建箱子文件
      const box = await fileService.createBox({
        name: 'TestBox',
        parentPath: '/workspace',
      });
      expect(box.success).toBe(true);
      expect(box.file?.type).toBe('box');

      // 创建文件夹
      const folder = await fileService.createFolder({
        name: 'TestFolder',
        parentPath: '/workspace',
      });
      expect(folder.success).toBe(true);
      expect(folder.file?.isDirectory).toBe(true);

      // 验证创建事件
      expect(events.filter((e) => e.type === 'created').length).toBe(3);
    });

    it('应正确处理文件名自动扩展', async () => {
      const cardWithExt = await fileService.createCard({
        name: 'Test.card',
        parentPath: '/workspace',
      });
      expect(cardWithExt.file?.name).toBe('Test.card');

      const cardWithoutExt = await fileService.createCard({
        name: 'Test2',
        parentPath: '/workspace',
      });
      expect(cardWithoutExt.file?.name).toBe('Test2.card');
    });
  });

  describe('场景2: 文件搜索和过滤', () => {
    it('应对空查询返回空结果', async () => {
      const results = await fileService.searchFiles('');
      expect(results).toEqual([]);
    });

    it('应对空白查询返回空结果', async () => {
      const results = await fileService.searchFiles('   ');
      expect(results).toEqual([]);
    });

    it('应支持类型过滤参数', async () => {
      // 即使文件系统为空，搜索函数也应正常工作
      const cardResults = await fileService.searchFiles('任意', { type: 'card' });
      expect(Array.isArray(cardResults)).toBe(true);

      const boxResults = await fileService.searchFiles('任意', { type: 'box' });
      expect(Array.isArray(boxResults)).toBe(true);
    });

    it('应支持路径过滤参数', async () => {
      const results = await fileService.searchFiles('文件', {
        path: '/workspace/某路径',
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('场景3: 剪贴板操作流程', () => {
    it('应正确设置复制操作', () => {
      fileService.copyToClipboard(['/workspace/test.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('copy');
      expect(clipboard?.files).toContain('/workspace/test.card');
    });

    it('应正确设置剪切操作', () => {
      fileService.cutToClipboard(['/workspace/test.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('cut');
    });

    it('应在空剪贴板粘贴时返回错误', async () => {
      fileService.clearClipboard();
      const results = await fileService.paste('/workspace/dest');

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toBe('error.clipboard_empty');
    });

    it('应在剪切操作后清空剪贴板', async () => {
      fileService.cutToClipboard(['/workspace/不存在.card']);
      await fileService.paste('/workspace/dest');

      // 剪切后剪贴板应清空（即使操作失败）
      expect(fileService.getClipboard()).toBeNull();
    });

    it('应支持清空剪贴板', () => {
      fileService.copyToClipboard(['/workspace/test.card']);
      expect(fileService.getClipboard()).not.toBeNull();

      fileService.clearClipboard();
      expect(fileService.getClipboard()).toBeNull();
    });
  });

  describe('场景4: 文件夹操作', () => {
    it('应对不存在的文件夹不触发展开事件', async () => {
      const toggleHandler = vi.fn();
      eventEmitter.on('file:folder-toggled', toggleHandler);

      await fileService.toggleFolderExpanded('/workspace/不存在的文件夹');

      // 文件夹不存在，不触发事件
      expect(toggleHandler).not.toHaveBeenCalled();
    });

    it('应对不存在的路径静默处理', async () => {
      // setFolderExpanded 对不存在的路径不应抛出异常
      await fileService.setFolderExpanded('/workspace/不存在', true);

      const folder = await fileService.getFileInfo('/workspace/不存在');
      expect(folder).toBeNull();
    });

    it('应对不存在的文件夹删除返回错误', async () => {
      const result = await fileService.deleteFile('/workspace/不存在的文件夹');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });

    it('应正确创建文件夹', async () => {
      const result = await fileService.createFolder({
        name: 'NewFolder',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file?.isDirectory).toBe(true);
      expect(result.file?.children).toEqual([]);
    });
  });

  describe('场景5: 文件系统刷新', () => {
    it('应支持刷新文件系统', async () => {
      const refreshHandler = vi.fn();
      eventEmitter.on('file:refreshed', refreshHandler);

      await fileService.refresh();

      expect(refreshHandler).toHaveBeenCalled();
    });
  });

  describe('场景6: 错误处理', () => {
    it('应处理无效文件名', async () => {
      const result = await fileService.createCard({
        name: 'invalid/name',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.invalid_filename');
      expect(result.errorCode).toBe('VAL-1001');
    });

    it('应处理文件不存在', async () => {
      const result = await fileService.deleteFile('/nonexistent/path/file.card');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.file_not_found');
    });

    it('应处理空剪贴板粘贴', async () => {
      fileService.clearClipboard();

      const results = await fileService.paste('/workspace');

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toBe('error.clipboard_empty');
    });
  });

  describe('场景7: 工作目录管理', () => {
    it('应初始为开发阶段默认工作目录', () => {
      // 设计说明：开发阶段使用固定的测试工作空间路径
      expect(fileService.getWorkingDirectory()).toBe('/ProductFinishedProductTestingSpace/TestWorkspace');
    });

    it('应支持设置工作目录', () => {
      const dirChangeHandler = vi.fn();
      eventEmitter.on('file:working-directory-changed', dirChangeHandler);

      fileService.setWorkingDirectory('/workspace/新目录');

      expect(fileService.getWorkingDirectory()).toBe('/workspace/新目录');
      expect(dirChangeHandler).toHaveBeenCalledWith({ path: '/workspace/新目录' });
    });

    it('应在设置目录后返回正确路径', () => {
      fileService.setWorkingDirectory('/custom/path');
      expect(fileService.getWorkingDirectory()).toBe('/custom/path');

      fileService.setWorkingDirectory('/another/path');
      expect(fileService.getWorkingDirectory()).toBe('/another/path');
    });
  });
});
