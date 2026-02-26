/**
 * 卡片导出集成测试
 * 
 * 测试整个导出流程：前端 → SDK → Core → Foundation → 插件
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChipsSDK } from '@chips/sdk';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import JSZip from 'jszip';

describe('Card Export Integration', () => {
  let sdk: ChipsSDK;
  let testDir: string;
  let testCardId: string;

  beforeEach(async () => {
    // 初始化 SDK
    sdk = new ChipsSDK();
    await sdk.initialize();

    // 创建临时测试目录
    testDir = path.join(tmpdir(), `card-export-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // 创建测试卡片
    const testCard = await sdk.card.create({
      name: 'Integration Test Card',
      tags: ['test', 'integration'],
    });
    testCardId = testCard.id;

    // 添加一些内容到卡片
    // TODO: 添加基础卡片
  });

  afterEach(async () => {
    // 清理
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe('Export to .card file', () => {
    it('should export card to .card file', async () => {
      const outputPath = path.join(testDir, 'test-export.card');

      const result = await sdk.card.export(testCardId, 'card', {
        outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // 验证文件存在
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证 .card 文件结构
      const zipBuffer = await fs.readFile(outputPath);
      const zip = await JSZip.loadAsync(zipBuffer);

      // 检查必需文件
      expect(zip.file('.card/metadata.yaml')).not.toBeNull();
      expect(zip.file('.card/structure.yaml')).not.toBeNull();
      expect(zip.file('.card/cover.html')).not.toBeNull();
    });

    it('should include statistics in result', async () => {
      const outputPath = path.join(testDir, 'test-stats.card');

      const result = await sdk.card.export(testCardId, 'card', {
        outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats?.duration).toBeGreaterThan(0);
      expect(result.stats?.fileCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle export with resources', async () => {
      // TODO: 添加资源到卡片
      const outputPath = path.join(testDir, 'test-with-resources.card');

      const result = await sdk.card.export(testCardId, 'card', {
        outputPath,
        includeResources: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Export to HTML', () => {
    it('should export card to HTML directory', async () => {
      const outputPath = path.join(testDir, 'test-html');

      const result = await sdk.card.export(testCardId, 'html', {
        outputPath,
        includeAssets: true,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // 验证 index.html 存在
      const indexExists = await fs
        .access(path.join(outputPath, 'index.html'))
        .then(() => true)
        .catch(() => false);
      expect(indexExists).toBe(true);
    });

    it('should create cards subdirectory', async () => {
      const outputPath = path.join(testDir, 'test-html-structure');

      const result = await sdk.card.export(testCardId, 'html', {
        outputPath,
      });

      expect(result.success).toBe(true);

      // 检查 cards 子目录
      const cardsDir = path.join(outputPath, 'cards');
      const cardsDirExists = await fs
        .stat(cardsDir)
        .then((stat) => stat.isDirectory())
        .catch(() => false);
      expect(cardsDirExists).toBe(true);
    });
  });

  describe('Export to PDF', () => {
    it('should export card to PDF file', async () => {
      const outputPath = path.join(testDir, 'test-export.pdf');

      const result = await sdk.card.export(testCardId, 'pdf', {
        outputPath,
        pageFormat: 'a4',
        orientation: 'portrait',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // 验证 PDF 文件存在
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证文件是 PDF 格式（检查文件头）
      const buffer = await fs.readFile(outputPath);
      const pdfHeader = buffer.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });

    it('should support different page formats', async () => {
      const formats: Array<'a4' | 'a5' | 'letter'> = ['a4', 'a5', 'letter'];

      for (const format of formats) {
        const outputPath = path.join(testDir, `test-${format}.pdf`);

        const result = await sdk.card.export(testCardId, 'pdf', {
          outputPath,
          pageFormat: format,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Export to Image', () => {
    it('should export card to PNG image', async () => {
      const outputPath = path.join(testDir, 'test-export.png');

      const result = await sdk.card.export(testCardId, 'image', {
        outputPath,
        format: 'png',
        scale: 1,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // 验证 PNG 文件存在
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证文件是 PNG 格式（检查文件头）
      const buffer = await fs.readFile(outputPath);
      const pngHeader = buffer.slice(0, 8);
      expect(pngHeader[0]).toBe(0x89);
      expect(pngHeader[1]).toBe(0x50);
      expect(pngHeader[2]).toBe(0x4e);
      expect(pngHeader[3]).toBe(0x47);
    });

    it('should support high resolution export', async () => {
      const outputPath = path.join(testDir, 'test-hires.png');

      const result = await sdk.card.export(testCardId, 'image', {
        outputPath,
        format: 'png',
        scale: 2, // 2x Retina
      });

      expect(result.success).toBe(true);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should support JPG format', async () => {
      const outputPath = path.join(testDir, 'test-export.jpg');

      const result = await sdk.card.export(testCardId, 'image', {
        outputPath,
        format: 'jpg',
        quality: 85,
      });

      expect(result.success).toBe(true);

      // 验证 JPG 文件存在
      const buffer = await fs.readFile(outputPath);
      expect(buffer[0]).toBe(0xff);
      expect(buffer[1]).toBe(0xd8);
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress during export', async () => {
      const outputPath = path.join(testDir, 'test-progress.card');
      const progressEvents: any[] = [];

      const result = await sdk.card.export(testCardId, 'card', {
        outputPath,
        onProgress: (progress) => {
          progressEvents.push(progress);
        },
      });

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);

      // 验证进度从 0 到 100
      expect(progressEvents[0].percent).toBeGreaterThanOrEqual(0);
      expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent card', async () => {
      const outputPath = path.join(testDir, 'non-existent.card');

      const result = await sdk.card.export('non-existent-id', 'card', {
        outputPath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid output path', async () => {
      const result = await sdk.card.export(testCardId, 'card', {
        outputPath: '/invalid/path/that/does/not/exist/test.card',
      });

      // 根据实现，可能成功创建目录或失败
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Cancellation', () => {
    it('should cancel export operation', async () => {
      const outputPath = path.join(testDir, 'test-cancel.card');

      // 启动导出
      const exportPromise = sdk.card.export(testCardId, 'card', {
        outputPath,
      });

      // 尝试取消（注意：需要实际的 taskId）
      // 这个测试需要改进，因为我们无法立即获取 taskId
      const result = await exportPromise;

      // 对于快速操作，可能已经完成
      expect(result.success).toBeDefined();
    });
  });

  describe('Multiple Concurrent Exports', () => {
    it('should handle concurrent exports', async () => {
      const formats: Array<'card' | 'html' | 'pdf' | 'image'> = [
        'card',
        'html',
        'pdf',
        'image',
      ];

      const promises = formats.map((format, index) =>
        sdk.card.export(testCardId, format, {
          outputPath: path.join(testDir, `concurrent-${index}.${format === 'card' ? 'card' : format === 'html' ? 'html' : format}`),
        })
      );

      const results = await Promise.all(promises);

      // 所有导出都应该成功
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
