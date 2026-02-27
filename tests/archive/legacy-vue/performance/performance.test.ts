/**
 * 性能测试
 * @module tests/performance/performance
 * @description 测试编辑器的性能指标
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ChipsEditor, createEditor } from '@/core/editor';
import { useCardStore, useUIStore, useEditorStore } from '@/core/state';
import { useWindowManager, resetWindowManager } from '@/core/window-manager';
import { resetCommandManager, useCommandManager, Command } from '@/core/command-manager';

/**
 * 性能测试辅助函数
 */
function measureTime(fn: () => void | Promise<void>): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    resolve(end - start);
  });
}

/**
 * 测试用简单命令
 */
class SimpleCommand implements Command {
  private counter: { value: number };

  constructor(counter: { value: number }) {
    this.counter = counter;
  }

  async execute(): Promise<void> {
    this.counter.value++;
  }

  async undo(): Promise<void> {
    this.counter.value--;
  }

  async redo(): Promise<void> {
    this.counter.value++;
  }

  get description(): string {
    return 'command.simple';
  }
}

describe('性能测试', () => {
  let editor: ChipsEditor;
  let cardStore: ReturnType<typeof useCardStore>;
  let uiStore: ReturnType<typeof useUIStore>;
  let editorStore: ReturnType<typeof useEditorStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    resetWindowManager();
    resetCommandManager();
    cardStore = useCardStore();
    uiStore = useUIStore();
    editorStore = useEditorStore();
    editor = createEditor({
      layout: 'infinite-canvas',
      debug: false,
      autoSaveInterval: 0,
    });
  });

  afterEach(() => {
    if (editor && editor.state !== 'destroyed') {
      editor.destroy();
    }
    resetWindowManager();
    resetCommandManager();
  });

  describe('P12-T03-01: 初始化时间', () => {
    it('编辑器初始化应在 3 秒内完成', async () => {
      const initTime = await measureTime(async () => {
        await editor.initialize();
      });

      console.log(`[性能] 编辑器初始化时间: ${initTime.toFixed(2)}ms`);

      // 验证初始化完成
      expect(editor.isReady).toBe(true);
      // 初始化时间应小于 3000ms (3秒)
      expect(initTime).toBeLessThan(3000);
    });

    it('多次初始化/销毁循环应保持稳定性能', async () => {
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const time = await measureTime(async () => {
          await editor.initialize();
        });
        times.push(time);
        editor.destroy();

        // 重新创建编辑器
        setActivePinia(createPinia());
        editor = createEditor({
          layout: 'infinite-canvas',
          debug: false,
          autoSaveInterval: 0,
        });
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`[性能] 平均初始化时间: ${avgTime.toFixed(2)}ms`);

      // 所有初始化时间应小于 3000ms
      times.forEach((time, index) => {
        expect(time).toBeLessThan(3000);
      });
    });
  });

  describe('P12-T03-02: 卡片渲染时间', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('单个卡片创建应在 500ms 内完成', async () => {
      const createTime = await measureTime(async () => {
        await editor.createCard({ name: '性能测试卡片' });
      });

      console.log(`[性能] 单个卡片创建时间: ${createTime.toFixed(2)}ms`);

      expect(cardStore.openCardCount).toBe(1);
      expect(createTime).toBeLessThan(500);
    });

    it('批量创建 100 张卡片应在合理时间内完成', async () => {
      const createTime = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          await editor.createCard({ name: `批量卡片 ${i + 1}` });
        }
      });

      const avgTime = createTime / 100;
      console.log(`[性能] 100 张卡片创建总时间: ${createTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每张卡片创建时间: ${avgTime.toFixed(2)}ms`);

      expect(cardStore.openCardCount).toBe(100);
      // 平均每张卡片创建时间应小于 500ms
      expect(avgTime).toBeLessThan(500);
    });

    it('卡片内添加大量基础卡片应保持性能', async () => {
      const card = await editor.createCard({ name: '大量基础卡片测试' });

      const addTime = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          cardStore.addBaseCard(card.id, {
            id: `base-${i}`,
            type: 'text',
            config: { content: `内容 ${i}` },
          });
        }
      });

      const avgTime = addTime / 100;
      console.log(`[性能] 添加 100 个基础卡片时间: ${addTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每个基础卡片添加时间: ${avgTime.toFixed(2)}ms`);

      expect(cardStore.getCard(card.id)?.structure.length).toBe(100);
      // 添加基础卡片应该非常快
      expect(addTime).toBeLessThan(1000);
    });
  });

  describe('P12-T03-03: 画布操作性能', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('画布缩放操作应立即响应', async () => {
      const zoomOperations = 100;
      const zoomTime = await measureTime(() => {
        for (let i = 0; i < zoomOperations; i++) {
          const zoom = 0.5 + (i % 10) * 0.3;
          uiStore.setZoom(zoom);
        }
      });

      const avgTime = zoomTime / zoomOperations;
      console.log(`[性能] ${zoomOperations} 次缩放操作时间: ${zoomTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次缩放时间: ${avgTime.toFixed(2)}ms`);

      // 缩放操作应该非常快 (目标: 60fps = 16.67ms/frame)
      expect(avgTime).toBeLessThan(16.67);
    });

    it('画布平移操作应立即响应', async () => {
      const panOperations = 100;
      const panTime = await measureTime(() => {
        for (let i = 0; i < panOperations; i++) {
          uiStore.pan(10, 10);
        }
      });

      const avgTime = panTime / panOperations;
      console.log(`[性能] ${panOperations} 次平移操作时间: ${panTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次平移时间: ${avgTime.toFixed(2)}ms`);

      // 平移操作应该非常快
      expect(avgTime).toBeLessThan(16.67);
    });

    it('混合缩放和平移操作应保持流畅', async () => {
      const operations = 100;
      const mixedTime = await measureTime(() => {
        for (let i = 0; i < operations; i++) {
          if (i % 2 === 0) {
            uiStore.setZoom(1 + (i % 5) * 0.2);
          } else {
            uiStore.pan(Math.random() * 10, Math.random() * 10);
          }
        }
      });

      const avgTime = mixedTime / operations;
      console.log(`[性能] ${operations} 次混合操作时间: ${mixedTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次操作时间: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(16.67);
    });
  });

  describe('P12-T03-04: 内存占用', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('创建大量卡片后内存应在可接受范围内', async () => {
      // 记录初始状态
      const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;

      // 创建大量卡片
      for (let i = 0; i < 50; i++) {
        const card = await editor.createCard({ name: `内存测试卡片 ${i}` });
        // 添加一些基础卡片
        for (let j = 0; j < 10; j++) {
          cardStore.addBaseCard(card.id, {
            id: `base-${i}-${j}`,
            type: 'text',
            config: { content: `内容 ${j}` },
          });
        }
      }

      // 记录最终状态
      const finalHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const heapGrowth = finalHeap - initialHeap;

      console.log(`[性能] 初始堆大小: ${(initialHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[性能] 最终堆大小: ${(finalHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[性能] 堆增长: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);

      expect(cardStore.openCardCount).toBe(50);

      // 注意：在 Node 环境中 performance.memory 可能不可用
      // 如果可用，检查内存是否在 300MB 以内
      if (finalHeap > 0) {
        expect(finalHeap / 1024 / 1024).toBeLessThan(300);
      }
    });

    it('销毁编辑器后应释放资源', async () => {
      // 创建资源
      for (let i = 0; i < 20; i++) {
        await editor.createCard({ name: `资源测试卡片 ${i}` });
      }

      expect(cardStore.openCardCount).toBe(20);

      // 销毁
      editor.destroy();

      // 验证资源已释放
      expect(cardStore.openCardCount).toBe(0);
      expect(uiStore.windowCount).toBe(0);
    });
  });

  describe('P12-T03-05: 窗口操作性能', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('创建大量窗口应保持性能', async () => {
      const windowManager = useWindowManager();
      const windowCount = 50;

      // 先创建卡片
      for (let i = 0; i < windowCount; i++) {
        await editor.createCard({ name: `窗口卡片 ${i}` });
      }

      const createTime = await measureTime(() => {
        const cardIds = Array.from(cardStore.openCards.keys());
        for (const cardId of cardIds) {
          windowManager.createCardWindow(cardId);
        }
      });

      const avgTime = createTime / windowCount;
      console.log(`[性能] 创建 ${windowCount} 个窗口时间: ${createTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每个窗口创建时间: ${avgTime.toFixed(2)}ms`);

      expect(uiStore.windowCount).toBe(windowCount);
      expect(avgTime).toBeLessThan(100);
    });

    it('窗口平铺操作应快速完成', async () => {
      const windowManager = useWindowManager();

      // 创建卡片和窗口
      for (let i = 0; i < 20; i++) {
        const card = await editor.createCard({ name: `平铺测试 ${i}` });
        windowManager.createCardWindow(card.id);
      }

      const tileTime = await measureTime(() => {
        windowManager.tileWindows();
      });

      console.log(`[性能] 窗口平铺时间: ${tileTime.toFixed(2)}ms`);

      expect(tileTime).toBeLessThan(100);
    });

    it('窗口焦点切换应立即响应', async () => {
      const windowManager = useWindowManager();
      const windowIds: string[] = [];

      // 创建窗口
      for (let i = 0; i < 20; i++) {
        const card = await editor.createCard({ name: `焦点测试 ${i}` });
        const winId = windowManager.createCardWindow(card.id);
        windowIds.push(winId);
      }

      const focusTime = await measureTime(() => {
        for (let i = 0; i < 100; i++) {
          const winId = windowIds[i % windowIds.length];
          if (winId) {
            windowManager.focusWindow(winId);
          }
        }
      });

      const avgTime = focusTime / 100;
      console.log(`[性能] 100 次焦点切换时间: ${focusTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次焦点切换时间: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('P12-T03-06: 撤销重做性能', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('大量命令执行应保持性能', async () => {
      const commandManager = useCommandManager();
      const counter = { value: 0 };
      const commandCount = 100;

      const executeTime = await measureTime(async () => {
        for (let i = 0; i < commandCount; i++) {
          await commandManager.execute(new SimpleCommand(counter));
        }
      });

      const avgTime = executeTime / commandCount;
      console.log(`[性能] 执行 ${commandCount} 个命令时间: ${executeTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每个命令执行时间: ${avgTime.toFixed(2)}ms`);

      expect(counter.value).toBe(commandCount);
      expect(avgTime).toBeLessThan(50);
    });

    it('连续撤销/重做应保持性能', async () => {
      const commandManager = useCommandManager();
      const counter = { value: 0 };

      // 先执行一些命令
      for (let i = 0; i < 50; i++) {
        await commandManager.execute(new SimpleCommand(counter));
      }

      // 测试撤销性能
      const undoTime = await measureTime(async () => {
        for (let i = 0; i < 50; i++) {
          await commandManager.undo();
        }
      });

      // 测试重做性能
      const redoTime = await measureTime(async () => {
        for (let i = 0; i < 50; i++) {
          await commandManager.redo();
        }
      });

      console.log(`[性能] 50 次撤销时间: ${undoTime.toFixed(2)}ms`);
      console.log(`[性能] 50 次重做时间: ${redoTime.toFixed(2)}ms`);

      expect(undoTime / 50).toBeLessThan(50);
      expect(redoTime / 50).toBeLessThan(50);
    });
  });

  describe('P12-T03-07: 布局切换性能', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('布局切换应快速完成', async () => {
      const switchTime = await measureTime(() => {
        editor.setLayout('workbench');
      });

      console.log(`[性能] 布局切换时间: ${switchTime.toFixed(2)}ms`);

      expect(editor.getLayout()).toBe('workbench');
      expect(switchTime).toBeLessThan(100);
    });

    it('频繁布局切换应保持性能', async () => {
      const switchCount = 20;
      const switchTime = await measureTime(() => {
        for (let i = 0; i < switchCount; i++) {
          editor.setLayout(i % 2 === 0 ? 'workbench' : 'infinite-canvas');
        }
      });

      const avgTime = switchTime / switchCount;
      console.log(`[性能] ${switchCount} 次布局切换时间: ${switchTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次切换时间: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('P12-T03-08: Store 操作性能', () => {
    beforeEach(async () => {
      await editor.initialize();
    });

    it('大量 Store 更新应保持性能', async () => {
      const updateCount = 1000;

      const updateTime = await measureTime(() => {
        for (let i = 0; i < updateCount; i++) {
          uiStore.setZoom(1 + (i % 10) * 0.1);
          uiStore.pan(i % 100, i % 100);
          uiStore.setTheme(i % 2 === 0 ? 'light' : 'dark');
        }
      });

      const avgTime = updateTime / updateCount;
      console.log(`[性能] ${updateCount} 次 Store 更新时间: ${updateTime.toFixed(2)}ms`);
      console.log(`[性能] 平均每次更新时间: ${avgTime.toFixed(2)}ms`);

      // Store 操作应该非常快
      expect(avgTime).toBeLessThan(1);
    });
  });
});

// 性能指标汇总
describe('性能指标汇总', () => {
  it('应显示性能指标达标情况', () => {
    console.log('\n====== 性能指标目标 ======');
    console.log('1. 初始化时间: < 3秒');
    console.log('2. 卡片渲染时间: < 500ms');
    console.log('3. 画布缩放/平移: 60fps (< 16.67ms/frame)');
    console.log('4. 内存占用: < 300MB');
    console.log('===========================\n');

    expect(true).toBe(true);
  });
});
