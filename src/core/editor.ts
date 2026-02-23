/**
 * 编辑器主类
 * @module core/editor
 * @description Chips 编辑器的核心类，整合所有模块
 */

import type { ChipsSDK, Card as SDKCard, Tag } from '@chips/sdk';
import type { SDKConnectorOptions } from './connector';
import { SDKConnector, createConnector } from './connector';
import { EventEmitter, createEventEmitter } from './event-manager';
import { useEditorStore, useCardStore, useUIStore } from './state';
import { resourceService } from '@/services/resource-service';
import { requireCardPath } from '@/services/card-path-service';
import {
  loadBaseCardConfigsFromContent,
  stringifyBaseCardContentYaml,
} from './base-card-content-loader';
import type { EditorConfig, EditorState, LayoutType, WindowConfig } from '@/types';
import yaml from 'yaml';

type RuntimeEditorConfig = Omit<Required<EditorConfig>, 'sdk'> & Pick<EditorConfig, 'sdk'>;

/** 创建卡片选项 */
export interface CreateCardOptions {
  /** 卡片名称 */
  name: string;
  /** 卡片类型 */
  type?: string;
  /** 标签 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 主题 */
  theme?: string;
}

/** 打开卡片选项 */
export interface OpenCardOptions {
  /** 是否立即激活 */
  activate?: boolean;
  /** 是否在新窗口打开 */
  newWindow?: boolean;
  /** 窗口位置 */
  position?: { x: number; y: number };
}

/** 保存卡片选项 */
export interface SaveCardOptions {
  /** 保存路径（可选，不传则使用原路径） */
  path?: string;
  /** 是否强制保存 */
  force?: boolean;
}

/**
 * Chips 编辑器主类
 * 
 * 负责协调各模块，提供统一的编辑器 API：
 * - 连接管理：通过 SDKConnector 与 Chips-SDK 通信
 * - 状态管理：通过 Pinia Store 管理编辑器状态
 * - 事件系统：通过 EventEmitter 处理内部事件
 * 
 * @example
 * ```typescript
 * // 创建编辑器
 * const editor = createEditor({
 *   layout: 'infinite-canvas',
 *   debug: true,
 * });
 * 
 * // 初始化
 * await editor.initialize();
 * 
 * // 创建卡片
 * const card = await editor.createCard({ name: '新卡片' });
 * 
 * // 打开卡片
 * await editor.openCard('/path/to/card.card');
 * 
 * // 保存卡片
 * await editor.saveCard(card.id);
 * 
 * // 销毁
 * editor.destroy();
 * ```
 */
export class ChipsEditor {
  /** 编辑器配置 */
  private config: RuntimeEditorConfig;
  /** 事件发射器 */
  private events: EventEmitter;
  /** SDK 连接器 */
  private connector: SDKConnector;
  /** 编辑器状态 Store */
  private editorStore: ReturnType<typeof useEditorStore>;
  /** 卡片状态 Store */
  private cardStore: ReturnType<typeof useCardStore>;
  /** UI 状态 Store */
  private uiStore: ReturnType<typeof useUIStore>;
  /** 自动保存定时器 */
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 创建编辑器实例
   * 
   * @param config - 编辑器配置
   */
  constructor(config: Partial<EditorConfig> = {}) {
    this.config = {
      sdk: config.sdk,
      layout: config.layout ?? 'infinite-canvas',
      debug: config.debug ?? false,
      autoSaveInterval: config.autoSaveInterval ?? 30000,
      locale: config.locale ?? 'zh-CN',
    };

    // 创建事件发射器
    this.events = createEventEmitter();

    // 创建 SDK 连接器
    const connectorOptions: SDKConnectorOptions = {
      debug: this.config.debug,
    };
    this.connector = createConnector(this.events, connectorOptions);

    // 获取 Pinia stores（需要在 Vue 应用中使用）
    this.editorStore = useEditorStore();
    this.cardStore = useCardStore();
    this.uiStore = useUIStore();

    // 设置事件处理器
    this.setupEventHandlers();
  }

  // ==================== 生命周期方法 ====================

  /**
   * 初始化编辑器
   * 
   * @throws {Error} 如果编辑器已初始化或正在初始化
   */
  async initialize(): Promise<void> {
    if (this.editorStore.state !== 'idle') {
      throw new Error('Editor already initialized or initializing');
    }

    this.editorStore.initialize({
      debug: this.config.debug,
      currentLayout: this.config.layout,
      autoSaveInterval: this.config.autoSaveInterval,
      locale: this.config.locale,
    });

    try {
      this.log('Initializing editor...');

      // 连接 SDK
      await this.connector.connect();
      this.editorStore.setConnected(true);

      // 设置布局
      this.editorStore.setLayout(this.config.layout);

      // 启动自动保存
      if (this.config.autoSaveInterval > 0) {
        this.startAutoSave();
      }

      this.editorStore.setState('ready');
      this.events.emit('editor:ready', {});

      this.log('Editor initialized successfully');
    } catch (error) {
      this.editorStore.setError(error as Error);
      this.events.emit('editor:error', { error });
      throw error;
    }
  }

  /**
   * 销毁编辑器
   */
  destroy(): void {
    this.log('Destroying editor...');

    // 停止自动保存
    this.stopAutoSave();

    // 断开 SDK 连接
    this.connector.disconnect();

    // 清理状态
    this.cardStore.clearAll();
    this.uiStore.clearWindows();
    this.editorStore.reset();

    this.editorStore.setState('destroyed');
    
    // 先发出事件，再清理事件系统
    this.events.emit('editor:destroyed', {});
    this.events.clear();

    this.log('Editor destroyed');
  }

  // ==================== 卡片操作 ====================

  /**
   * 创建新卡片
   * 
   * @param options - 创建选项
   * @returns 创建的卡片
   */
  async createCard(options: CreateCardOptions): Promise<SDKCard> {
    this.ensureReady();

    const sdk = this.connector.getSDK();
    const card = await sdk.card.create({
      name: options.name,
      type: options.type,
      tags: options.tags,
      theme: options.theme,
      description: options.description,
    });

    // 添加到 store
    this.cardStore.addCard(card);
    this.cardStore.setActiveCard(card.id);

    // 标记编辑器有未保存的更改
    this.editorStore.markUnsaved();

    this.events.emit('card:created', { cardId: card.id });
    this.log(`Card created: ${card.id}`);

    return card;
  }

  /**
   * 打开卡片
   * 
   * @param pathOrId - 卡片路径或 ID
   * @param options - 打开选项
   * @returns 打开的卡片
   */
  async openCard(pathOrId: string, options: OpenCardOptions = {}): Promise<SDKCard> {
    this.ensureReady();

    // 检查是否已打开
    if (this.cardStore.isCardOpen(pathOrId)) {
      if (options.activate !== false) {
        this.cardStore.setActiveCard(pathOrId);
      }
      const existing = this.cardStore.getCard(pathOrId);
      if (existing) {
        this.log(`Card already open: ${pathOrId}`);
        return {
          id: existing.id,
          metadata: existing.metadata,
          structure: {
            structure: existing.structure,
            manifest: {
              card_count: existing.structure.length,
              resource_count: 0,
              resources: [],
            },
          },
          resources: new Map(),
        };
      }
    }

    this.cardStore.setCardLoading(pathOrId, true);

    try {
      const sdk = this.connector.getSDK();
      const card = await sdk.card.get(pathOrId);

      // 读取每个基础卡片的内容配置文件 content/{id}.yaml
      // SDK 的 _parseCard 只解析 metadata.yaml 和 structure.yaml，
      // 不会读取 content 目录下的基础卡片配置文件。
      // 需要在此处补充读取，将配置注入到 structure 中。
      const cardPath = pathOrId;
      await this.loadBaseCardConfigs(card, cardPath);

      // 添加到 store
      this.cardStore.addCard(card, pathOrId);

      if (options.activate !== false) {
        this.cardStore.setActiveCard(card.id);
      }

      this.events.emit('card:opened', { cardId: card.id });
      this.log(`Card opened: ${card.id}`);

      return card;
    } finally {
      this.cardStore.setCardLoading(pathOrId, false);
    }
  }

  /**
   * 保存卡片
   * 
   * @param cardId - 卡片 ID
   * @param options - 保存选项
   */
  async saveCard(cardId: string, options: SaveCardOptions = {}): Promise<void> {
    this.ensureReady();

    const cardInfo = this.cardStore.getCard(cardId);
    if (!cardInfo) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const path = requireCardPath(
      cardId,
      options.path ?? cardInfo.filePath,
      'ChipsEditor.saveCard',
      resourceService.workspaceRoot,
    );

    // 收集所有基础卡片引用的资源文件路径
    const resourcePaths: string[] = [];
    for (const baseCard of cardInfo.structure) {
      const config = baseCard.config as Record<string, unknown> | undefined;
      if (!config) continue;

      // ImageCard: 收集 images[].file_path
      if (baseCard.type === 'ImageCard' && Array.isArray(config.images)) {
        for (const img of config.images as Array<Record<string, unknown>>) {
          if (img.source === 'file' && typeof img.file_path === 'string' && img.file_path) {
            // 只收集相对路径（非 URL、非 blob）
            const fp = img.file_path as string;
            if (!fp.startsWith('http://') && !fp.startsWith('https://') && !fp.startsWith('blob:')) {
              resourcePaths.push(fp);
            }
          }
        }
      }

      // VideoCard: 收集 video_file
      if (baseCard.type === 'VideoCard' && typeof config.video_file === 'string') {
        const vf = config.video_file as string;
        if (!vf.startsWith('http://') && !vf.startsWith('https://')) {
          resourcePaths.push(vf);
        }
      }
    }

    const modifiedAt = new Date().toISOString();
    const metadataPayload = {
      ...cardInfo.metadata,
      card_id: cardInfo.id,
      modified_at: modifiedAt,
    };
    const structurePayload = {
      structure: cardInfo.structure.map((baseCard) => ({
        id: baseCard.id,
        type: baseCard.type,
      })),
      manifest: {
        card_count: cardInfo.structure.length,
        resource_count: resourcePaths.length,
        resources: resourcePaths.map((resourcePath) => ({
          path: resourcePath,
          size: 0,
          type: resourcePath.match(/\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i) ? 'image' : 'other',
        })),
      },
    };

    const metaDir = `${path}/.card`;
    const contentDir = `${path}/content`;
    await resourceService.ensureDir(metaDir);
    await resourceService.ensureDir(contentDir);
    await resourceService.writeText(`${metaDir}/metadata.yaml`, yaml.stringify(metadataPayload));
    await resourceService.writeText(`${metaDir}/structure.yaml`, yaml.stringify(structurePayload));

    // 写入每个基础卡片的内容文件 content/{id}.yaml
    // 基础卡片的实际内容存储在 BaseCardInfo.config 中，
    // 需要同步到磁盘上的 content/{id}.yaml 文件
    for (const baseCard of cardInfo.structure) {
      const contentYaml = stringifyBaseCardContentYaml(baseCard.type, baseCard.config);
      const contentFilePath = `${contentDir}/${baseCard.id}.yaml`;
      await resourceService.writeText(contentFilePath, contentYaml);
    }

    // 更新状态
    this.cardStore.markCardSaved(cardId);
    // 总是更新 filePath，确保导出时可以找到卡片路径
    this.cardStore.updateFilePath(cardId, path);

    // 检查是否还有未保存的卡片
    if (!this.cardStore.hasModifiedCards) {
      this.editorStore.markSaved();
    }

    this.events.emit('card:saved', { cardId });
    this.log(`Card saved: ${cardId}`);
  }

  /**
   * 加载基础卡片配置
   * 
   * SDK 的 FileAPI._parseCard 只解析 metadata.yaml 和 structure.yaml，
   * 不会读取 content/{id}.yaml 中的基础卡片配置。
   * 此方法在打开卡片后，为每个基础卡片读取对应的 content YAML 文件，
   * 读取唯一标准格式并注入到 structure 的 config 中。
   * 
   * content YAML 格式：
   * ```yaml
   * type: RichTextCard
   * data:
   *   content_source: inline
   *   content_text: hello
   * ```
   * 
   * @param card - SDK 返回的卡片对象
   * @param cardPath - 卡片文件路径
   */
  private async loadBaseCardConfigs(card: SDKCard, cardPath: string): Promise<void> {
    const structure = card.structure?.structure;
    if (!structure || structure.length === 0) {
      return;
    }
    await loadBaseCardConfigsFromContent(structure, cardPath, (contentFilePath) =>
      resourceService.readText(contentFilePath)
    );
  }

  /**
   * 关闭卡片
   * 
   * @param cardId - 卡片 ID
   * @param force - 是否强制关闭（忽略未保存警告）
   * @returns 是否成功关闭
   */
  closeCard(cardId: string, force = false): boolean {
    const cardInfo = this.cardStore.getCard(cardId);
    if (!cardInfo) {
      return false;
    }

    // 如果有未保存的更改且不是强制关闭
    if (cardInfo.isModified && !force) {
      this.events.emit('card:closeRequested', {
        cardId,
        hasUnsavedChanges: true,
      });
      return false;
    }

    this.cardStore.removeCard(cardId);
    this.events.emit('card:closed', { cardId });
    this.log(`Card closed: ${cardId}`);

    return true;
  }

  /**
   * 删除卡片
   * 
   * @param cardId - 卡片 ID
   */
  async deleteCard(cardId: string): Promise<void> {
    this.ensureReady();

    const sdk = this.connector.getSDK();
    await sdk.card.delete(cardId);

    // 从 store 中移除
    this.cardStore.removeCard(cardId);

    this.events.emit('card:deleted', { cardId });
    this.log(`Card deleted: ${cardId}`);
  }

  /**
   * 保存所有修改过的卡片
   */
  async saveAllCards(): Promise<void> {
    const modifiedCards = this.cardStore.modifiedCards;
    for (const card of modifiedCards) {
      await this.saveCard(card.id);
    }
  }

  // ==================== 布局操作 ====================

  /**
   * 切换布局
   * 
   * @param layout - 布局类型
   */
  setLayout(layout: LayoutType): void {
    this.editorStore.setLayout(layout);
    this.events.emit('layout:changed', { layout });
    this.log(`Layout changed to: ${layout}`);
  }

  /**
   * 获取当前布局
   * 
   * @returns 当前布局类型
   */
  getLayout(): LayoutType {
    return this.editorStore.currentLayout;
  }

  // ==================== 窗口操作 ====================

  /**
   * 创建窗口
   * 
   * @param config - 窗口配置
   */
  createWindow(config: WindowConfig): void {
    this.uiStore.addWindow(config);
    this.events.emit('window:created', { windowId: config.id, config });
  }

  /**
   * 关闭窗口
   * 
   * @param windowId - 窗口 ID
   */
  closeWindow(windowId: string): void {
    this.uiStore.removeWindow(windowId);
    this.events.emit('window:closed', { windowId });
  }

  /**
   * 聚焦窗口
   * 
   * @param windowId - 窗口 ID
   */
  focusWindow(windowId: string): void {
    this.uiStore.focusWindow(windowId);
    this.events.emit('window:focused', { windowId });
  }

  // ==================== 事件系统 ====================

  /**
   * 订阅事件
   * 
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅 ID
   */
  on<T = unknown>(eventType: string, handler: (data: T) => void): string {
    return this.events.on(eventType, handler);
  }

  /**
   * 一次性订阅事件
   * 
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅 ID
   */
  once<T = unknown>(eventType: string, handler: (data: T) => void): string {
    return this.events.once(eventType, handler);
  }

  /**
   * 取消订阅
   * 
   * @param eventType - 事件类型
   * @param handlerOrId - 处理器函数或订阅 ID
   */
  off(eventType: string, handlerOrId?: ((data: unknown) => void) | string): void {
    this.events.off(eventType, handlerOrId);
  }

  /**
   * 发布事件
   * 
   * @param eventType - 事件类型
   * @param data - 事件数据
   */
  emit<T = unknown>(eventType: string, data: T): void {
    this.events.emit(eventType, data);
  }

  /**
   * 等待事件
   * 
   * @param eventType - 事件类型
   * @param timeout - 超时时间
   * @returns Promise
   */
  waitFor<T = unknown>(eventType: string, timeout?: number): Promise<T> {
    return this.events.waitFor(eventType, timeout);
  }

  // ==================== 状态访问 ====================

  /**
   * 获取编辑器状态
   */
  get state(): EditorState {
    return this.editorStore.state;
  }

  /**
   * 是否就绪
   */
  get isReady(): boolean {
    return this.editorStore.isReady;
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.editorStore.isConnected;
  }

  /**
   * 是否有未保存的更改
   */
  get hasUnsavedChanges(): boolean {
    return this.editorStore.hasUnsavedChanges || this.cardStore.hasModifiedCards;
  }

  /**
   * 获取 SDK 实例
   */
  get sdk(): ChipsSDK {
    return this.connector.getSDK();
  }

  /**
   * 获取编辑器配置
   */
  get configuration(): Readonly<RuntimeEditorConfig> {
    return this.config;
  }

  // ==================== Store 访问 ====================

  /**
   * 获取编辑器 Store
   */
  get stores() {
    return {
      editor: this.editorStore,
      card: this.cardStore,
      ui: this.uiStore,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 确保编辑器已就绪
   */
  private ensureReady(): void {
    if (!this.editorStore.isReady) {
      throw new Error('Editor is not ready');
    }
    if (!this.connector.connected) {
      throw new Error('SDK is not connected');
    }
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(async () => {
      if (this.cardStore.hasModifiedCards) {
        this.log('Auto-saving modified cards...');
        try {
          await this.saveAllCards();
          this.log('Auto-save completed');
        } catch (error) {
          this.log('Auto-save failed:', error);
        }
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听连接状态
    this.events.on('connector:connected', () => {
      this.editorStore.setConnected(true);
    });

    this.events.on('connector:disconnected', () => {
      this.editorStore.setConnected(false);
    });

    this.events.on<{ error: Error }>('connector:error', ({ error }) => {
      this.editorStore.setError(error);
    });
  }

  /**
   * 日志输出
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.warn('[ChipsEditor]', ...args);
    }
  }
}

/**
 * 创建编辑器实例
 * 
 * @param config - 编辑器配置
 * @returns 编辑器实例
 * 
 * @example
 * ```typescript
 * const editor = createEditor({
 *   layout: 'infinite-canvas',
 *   debug: true,
 *   autoSaveInterval: 60000,
 * });
 * ```
 */
export function createEditor(config: Partial<EditorConfig> = {}): ChipsEditor {
  return new ChipsEditor(config);
}
