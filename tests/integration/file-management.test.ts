/**
 * 文件管理操作集成测试
 * @module tests/integration/file-management
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
  isValidFileName,
  getFileType,
} from '@/core/file-service';
import { resetWorkspaceService } from '@/core/workspace-service';

describe('文件管理操作', () => {
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

  describe('文件名验证', () => {
    it('应验证有效文件名', () => {
      expect(isValidFileName('test.card')).toBe(true);
      expect(isValidFileName('我的文档.card')).toBe(true);
      expect(isValidFileName('file-name_123.box')).toBe(true);
    });

    it('应拒绝无效文件名', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName('   ')).toBe(false);
      expect(isValidFileName('file/name')).toBe(false);
      expect(isValidFileName('file\\name')).toBe(false);
      expect(isValidFileName('file:name')).toBe(false);
      expect(isValidFileName('file*name')).toBe(false);
      expect(isValidFileName('file?name')).toBe(false);
      expect(isValidFileName('file"name')).toBe(false);
      expect(isValidFileName('file<name')).toBe(false);
      expect(isValidFileName('file>name')).toBe(false);
      expect(isValidFileName('file|name')).toBe(false);
    });
  });

  describe('文件类型检测', () => {
    it('应正确识别卡片文件', () => {
      expect(getFileType('test.card')).toBe('card');
    });

    it('应正确识别箱子文件', () => {
      expect(getFileType('test.box')).toBe('box');
    });

    it('应对未知类型返回 unknown', () => {
      expect(getFileType('test.txt')).toBe('unknown');
      expect(getFileType('test.pdf')).toBe('unknown');
    });
  });

  describe('工作目录操作', () => {
    it('应获取开发阶段默认工作目录', () => {
      // 设计说明：开发阶段使用固定的测试工作空间路径
      expect(fileService.getWorkingDirectory()).toBe('/ProductFinishedProductTestingSpace/TestWorkspace');
    });

    it('应设置工作目录', () => {
      const eventHandler = vi.fn();
      eventEmitter.on('file:working-directory-changed', eventHandler);

      fileService.setWorkingDirectory('/new/workspace');

      expect(fileService.getWorkingDirectory()).toBe('/new/workspace');
      expect(eventHandler).toHaveBeenCalledWith({ path: '/new/workspace' });
    });
  });

  describe('文件列表操作', () => {
    it('应获取初始空文件列表', async () => {
      const files = await fileService.getFileList();

      expect(Array.isArray(files)).toBe(true);
      // 初始状态为空
    });

    it('应获取初始空文件树', async () => {
      const tree = await fileService.getFileTree();

      expect(Array.isArray(tree)).toBe(true);
      // 初始状态为空
    });

    it('应对不存在的文件返回 null', async () => {
      const file = await fileService.getFileInfo('/nonexistent/path');

      expect(file).toBeNull();
    });

    it('应对任意不存在路径返回 null', async () => {
      const file = await fileService.getFileInfo('/workspace/不存在.card');

      expect(file).toBeNull();
    });
  });

  describe('卡片文件创建', () => {
    it('应创建新卡片文件', async () => {
      const eventHandler = vi.fn();
      eventEmitter.on('file:created', eventHandler);

      const result = await fileService.createCard({
        name: '新建卡片',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.name).toBe('新建卡片.card');
      expect(result.file?.type).toBe('card');
      expect(eventHandler).toHaveBeenCalled();
    });

    it('应自动添加 .card 扩展名', async () => {
      const result = await fileService.createCard({
        name: '测试卡片',
        parentPath: '/workspace',
      });

      expect(result.file?.name).toBe('测试卡片.card');
    });

    it('应拒绝无效文件名', async () => {
      const result = await fileService.createCard({
        name: 'invalid/name',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.invalid_filename');
    });
  });

  describe('箱子文件创建', () => {
    it('应创建新箱子文件', async () => {
      const result = await fileService.createBox({
        name: '新建箱子',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file?.name).toBe('新建箱子.box');
      expect(result.file?.type).toBe('box');
    });
  });

  describe('文件夹创建', () => {
    it('应创建新文件夹', async () => {
      const result = await fileService.createFolder({
        name: '新文件夹',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file?.name).toBe('新文件夹');
      expect(result.file?.isDirectory).toBe(true);
    });
  });

  describe('文件删除', () => {
    it('应在删除不存在的文件时返回错误', async () => {
      const result = await fileService.deleteFile('/nonexistent/file.card');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.file_not_found');
    });

    it('应返回正确错误码', async () => {
      const result = await fileService.deleteFile('/workspace/不存在.card');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });
  });

  describe('文件重命名', () => {
    it('应拒绝无效文件名', async () => {
      const result = await fileService.renameFile(
        '/workspace/任意.card',
        'invalid*name'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.invalid_filename');
    });

    it('应对不存在的文件返回错误', async () => {
      const result = await fileService.renameFile(
        '/workspace/不存在.card',
        '新名称'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });

    it('应拒绝包含特殊字符的文件名', async () => {
      const result = await fileService.renameFile(
        '/workspace/test.card',
        'name:with:colons'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAL-1001');
    });
  });

  describe('文件复制', () => {
    it('应对不存在的源文件返回错误', async () => {
      const result = await fileService.copyFile(
        '/workspace/不存在.card',
        '/workspace/dest'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });
  });

  describe('文件移动', () => {
    it('应对不存在的源文件返回错误', async () => {
      const result = await fileService.moveFile(
        '/workspace/不存在.card',
        '/workspace/dest'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });
  });

  describe('文件夹展开/折叠', () => {
    it('应对不存在的文件夹不触发事件', async () => {
      const eventHandler = vi.fn();
      eventEmitter.on('file:folder-toggled', eventHandler);

      await fileService.toggleFolderExpanded('/workspace/不存在的文件夹');

      // 文件夹不存在，不应触发事件
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('应对不存在的路径静默处理', async () => {
      // 不应抛出异常
      await fileService.setFolderExpanded('/workspace/不存在', true);

      const folder = await fileService.getFileInfo('/workspace/不存在');
      expect(folder).toBeNull();
    });
  });

  describe('剪贴板操作', () => {
    it('应复制文件到剪贴板', () => {
      const eventHandler = vi.fn();
      eventEmitter.on('file:clipboard-changed', eventHandler);

      fileService.copyToClipboard(['/workspace/test.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('copy');
      expect(clipboard?.files).toContain('/workspace/test.card');
      expect(eventHandler).toHaveBeenCalled();
    });

    it('应剪切文件到剪贴板', () => {
      fileService.cutToClipboard(['/workspace/test.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('cut');
    });

    it('应粘贴不存在的文件返回失败', async () => {
      fileService.copyToClipboard(['/workspace/不存在.card']);

      const results = await fileService.paste('/workspace/dest');

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(false);
    });

    it('应在粘贴空剪贴板时返回错误', async () => {
      const results = await fileService.paste('/workspace');

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(false);
    });

    it('应清空剪贴板', () => {
      fileService.copyToClipboard(['/workspace/test.card']);
      fileService.clearClipboard();

      expect(fileService.getClipboard()).toBeNull();
    });
  });

  describe('文件搜索', () => {
    it('应对空搜索词返回空数组', async () => {
      const results = await fileService.searchFiles('');

      expect(results).toEqual([]);
    });

    it('应在空文件系统中返回空结果', async () => {
      const results = await fileService.searchFiles('任意关键词');

      expect(Array.isArray(results)).toBe(true);
      // 初始状态文件系统为空
    });

    it('应支持类型过滤参数', async () => {
      const results = await fileService.searchFiles('test', { type: 'card' });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('刷新操作', () => {
    it('应刷新文件列表', async () => {
      const eventHandler = vi.fn();
      eventEmitter.on('file:refreshed', eventHandler);

      await fileService.refresh();

      expect(eventHandler).toHaveBeenCalled();
    });
  });
});
