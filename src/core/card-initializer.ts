/**
 * 卡片初始化器
 * @module core/card-initializer
 * @description 在工作区创建新卡片的文件夹结构
 * 
 * 设计说明：
 * - 负责在编辑器工作区中初始化卡片文件夹结构
 * - 创建符合卡片文件格式规范的目录和配置文件
 * - 通过 SDK 调用内核服务完成文件操作
 * 
 * 创建的文件夹结构：
 * ```
 * {card-id}/
 * ├── .card/
 * │   ├── metadata.yaml
 * │   ├── structure.yaml
 * │   └── cover.html
 * ├── content/
 * │   └── {basic-card-id}.yaml  # 如果有初始基础卡片
 * └── cardcover/                # 封面资源目录
 * ```
 */

import type { EventEmitter } from './event-manager';
import { createEventEmitter } from './event-manager';
import { resourceService } from '@/services/resource-service';
import { createBaseCardContentDocument } from './base-card-content-loader';
import { generateId62, isValidId62 } from '@/utils';

// ========== 类型定义 ==========

/** 初始基础卡片配置 */
export interface BasicCardConfig {
  /** 基础卡片 ID（10位62进制） */
  id: string;
  /** 基础卡片类型（对应插件 ID） */
  type: string;
  /** 卡片配置数据 */
  data?: Record<string, unknown>;
}

/** 卡片元数据 */
export interface CardMetadataYaml {
  /** 卡片 ID（10位62进制） */
  card_id: string;
  /** 卡片名称 */
  name: string;
  /** 创建时间（ISO 8601 格式） */
  created_at: string;
  /** 修改时间（ISO 8601 格式） */
  modified_at: string;
  /** 主题 ID */
  theme: string;
  /** 标签数组 */
  tags: string[][];
  /** 薯片规范版本 */
  chip_standards_version: string;
}

/** 结构文件中的基础卡片条目 */
export interface StructureEntry {
  /** 基础卡片 ID */
  id: string;
  /** 基础卡片类型 */
  type: string;
}

/** 资源清单条目 */
export interface ManifestResource {
  /** 文件路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  type: string;
}

/** 文件清单 */
export interface CardManifest {
  /** 基础卡片数量 */
  card_count: number;
  /** 资源文件数量 */
  resource_count: number;
  /** 资源文件列表 */
  resources: ManifestResource[];
}

/** 卡片结构 YAML */
export interface CardStructureYaml {
  /** 基础卡片列表 */
  structure: StructureEntry[];
  /** 文件清单 */
  manifest: CardManifest;
}

/** 基础卡片配置文件内容 */
export interface BasicCardYaml {
  /** 卡片类型 */
  type: string;
  /** 主题设置（可选，覆盖卡片级别主题） */
  theme?: string;
  /** 布局参数 */
  layout?: {
    /** 高度模式 */
    height_mode?: 'auto' | 'fixed';
    /** 宽高比 */
    aspect_ratio?: string;
  };
  /** 卡片配置数据 */
  data?: Record<string, unknown>;
}

/** 卡片初始化选项 */
export interface CardInitOptions {
  /** 工作区根路径 */
  workspaceRoot: string;
  /** 默认主题 ID */
  defaultThemeId?: string;
}

/** 卡片初始化结果 */
export interface CardInitResult {
  /** 是否成功 */
  success: boolean;
  /** 卡片根目录路径 */
  cardPath: string;
  /** 创建的文件列表 */
  createdFiles: string[];
  /** 错误信息（如果失败） */
  error?: string;
  /** 错误代码（如果失败） */
  errorCode?: string;
}

// ========== 常量定义 ==========

/** 默认主题 ID */
const DEFAULT_THEME_ID = 'default-light';

/** 卡片规范版本 */
const CHIPS_STANDARDS_VERSION = '1.0.0';

// ========== 多语言键定义 ==========
// 开发阶段使用人类可读的 key，打包时自动替换为系统编码

const I18N_KEYS = {
  ERROR_INVALID_CARD_ID: 'editor.card_initializer.error.invalid_card_id',
  ERROR_INVALID_NAME: 'editor.card_initializer.error.invalid_name',
  ERROR_CREATE_DIRECTORY_FAILED: 'editor.card_initializer.error.create_directory_failed',
  ERROR_WRITE_FILE_FAILED: 'editor.card_initializer.error.write_file_failed',
  ERROR_CARD_EXISTS: 'editor.card_initializer.error.card_exists',
  SUCCESS_CARD_CREATED: 'editor.card_initializer.success.card_created',
} as const;

// ========== 工具函数 ==========

/**
 * 验证 ID 格式是否正确
 * @param id - 要验证的 ID
 * @returns 是否为有效的 10 位 62 进制 ID
 */
function isValidId(id: string): boolean {
  return isValidId62(id);
}

/**
 * 获取当前时间的 ISO 8601 格式字符串（UTC 时区）
 * @returns ISO 8601 格式时间字符串
 */
function getISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 生成默认封面 HTML
 * @param cardName - 卡片名称
 * @returns HTML 字符串
 */
function generateDefaultCoverHtml(cardName: string): string {
  // 转义 HTML 特殊字符，防止 XSS
  const escapedName = cardName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .card-name {
      font-size: 24px;
      font-weight: 500;
      color: #333333;
      text-align: center;
      padding: 20px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="card-name">${escapedName}</div>
</body>
</html>`;
}

/**
 * 将对象转换为 YAML 格式字符串
 * 简单实现，用于生成配置文件
 * @param obj - 要转换的对象
 * @param indent - 缩进级别
 * @returns YAML 格式字符串
 */
function toYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    // 如果字符串包含特殊字符，使用引号
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || 
        obj.includes("'") || obj.includes('"') || obj.startsWith(' ') ||
        obj.endsWith(' ') || obj === '') {
      return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    return obj.map(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // 对象数组项：第一个属性紧跟 -，后续属性对齐
        const entries = Object.entries(item as Record<string, unknown>);
        if (entries.length === 0) {
          return `${spaces}- {}`;
        }
        const firstEntry = entries[0];
        if (!firstEntry) {
          return `${spaces}- {}`;
        }
        const [firstKey, firstEntryValue] = firstEntry;
        const firstValue = typeof firstEntryValue === 'object' && firstEntryValue !== null
          ? `\n${toYaml(firstEntryValue, indent + 2)}`
          : ` ${toYaml(firstEntryValue, 0)}`;
        const firstLine = `${spaces}- ${firstKey}:${firstValue}`;
        
        const restLines = entries.slice(1).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value) && value.length === 0) {
              return `${spaces}  ${key}: []`;
            }
            if (!Array.isArray(value) && Object.keys(value).length === 0) {
              return `${spaces}  ${key}: {}`;
            }
            return `${spaces}  ${key}:\n${toYaml(value, indent + 2)}`;
          }
          return `${spaces}  ${key}: ${toYaml(value, 0)}`;
        });
        
        return [firstLine, ...restLines].join('\n');
      }
      return `${spaces}- ${toYaml(item, 0)}`;
    }).join('\n');
  }
  
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value) && value.length === 0) {
          return `${spaces}${key}: []`;
        }
        if (!Array.isArray(value) && Object.keys(value).length === 0) {
          return `${spaces}${key}: {}`;
        }
        return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
      }
      return `${spaces}${key}: ${toYaml(value, indent)}`;
    }).join('\n');
  }
  
  return String(obj);
}

// ========== 卡片初始化器类 ==========

/**
 * 卡片初始化器接口
 */
export interface CardInitializer {
  /**
   * 在工作区创建新卡片文件夹结构
   * @param cardId - 卡片 ID（10位62进制）
   * @param name - 卡片名称
   * @param initialBasicCard - 初始基础卡片配置（可选）
   * @returns 创建结果
   */
  createCard(
    cardId: string,
    name: string,
    initialBasicCard?: BasicCardConfig
  ): Promise<CardInitResult>;
  
  /**
   * 生成新的卡片 ID
   * @returns 10 位 62 进制 ID
   */
  generateCardId(): string;
  
  /**
   * 生成新的基础卡片 ID
   * @returns 10 位 62 进制 ID
   */
  generateBasicCardId(): string;
  
  /**
   * 验证卡片 ID 格式
   * @param id - 要验证的 ID
   * @returns 是否有效
   */
  validateCardId(id: string): boolean;
}

/**
 * 创建卡片初始化器
 * 
 * @param options - 初始化选项
 * @param events - 事件发射器（可选）
 * @returns 卡片初始化器实例
 * 
 * @example
 * ```typescript
 * const initializer = createCardInitializer({
 *   workspaceRoot: '/path/to/workspace/cards'
 * });
 * 
 * // 创建新卡片
 * const result = await initializer.createCard(
 *   initializer.generateCardId(),
 *   '我的新卡片'
 * );
 * 
 * // 创建带初始基础卡片的卡片
 * const resultWithBasicCard = await initializer.createCard(
 *   initializer.generateCardId(),
 *   '视频卡片',
 *   {
 *     id: initializer.generateBasicCardId(),
 *     type: 'VideoCard',
 *     data: { video_file: 'example.mp4' }
 *   }
 * );
 * ```
 */
export function createCardInitializer(
  options: CardInitOptions,
  events?: EventEmitter
): CardInitializer {
  const eventEmitter = events || createEventEmitter();
  const workspaceRoot = options.workspaceRoot;
  const defaultThemeId = options.defaultThemeId || DEFAULT_THEME_ID;

  /**
   * 通过 SDK 创建目录
   * @param path - 目录路径
   */
  async function createDirectory(path: string): Promise<void> {
    console.warn(`[CardInitializer] Creating directory: ${path}`);
    await resourceService.ensureDir(path);
  }

  /**
   * 通过 SDK 写入文件
   * @param path - 文件路径
   * @param content - 文件内容
   */
  async function writeFile(path: string, content: string): Promise<void> {
    console.warn(`[CardInitializer] Writing file: ${path}`);
    await resourceService.writeText(path, content);
  }

  /**
   * 通过 SDK 检查路径是否存在
   * @param path - 路径
   */
  async function exists(path: string): Promise<boolean> {
    return resourceService.exists(path);
  }

  /**
   * 获取多语言文本
   * @param key - 翻译键
   * @param params - 插值参数
   */
  function t(key: string, params?: Record<string, string | number>): string {
    // TODO: 通过 SDK 获取多语言文本
    // return sdk.i18n.t(key, params);
    
    // 临时返回 key，实际集成时替换为 i18n 调用
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        key
      );
    }
    return key;
  }

  /**
   * 生成 metadata.yaml 内容
   */
  function generateMetadata(cardId: string, name: string): CardMetadataYaml {
    const timestamp = getISOTimestamp();
    return {
      card_id: cardId,
      name,
      created_at: timestamp,
      modified_at: timestamp,
      theme: defaultThemeId,
      tags: [],
      chip_standards_version: CHIPS_STANDARDS_VERSION,
    };
  }

  /**
   * 生成 structure.yaml 内容
   */
  function generateStructure(basicCard?: BasicCardConfig): CardStructureYaml {
    const structure: StructureEntry[] = [];
    
    if (basicCard) {
      structure.push({
        id: basicCard.id,
        type: basicCard.type,
      });
    }
    
    return {
      structure,
      manifest: {
        card_count: structure.length,
        resource_count: 0,
        resources: [],
      },
    };
  }

  /**
   * 生成基础卡片配置文件内容
   */
  function generateBasicCardConfig(basicCard: BasicCardConfig): BasicCardYaml {
    return createBaseCardContentDocument(basicCard.type, basicCard.data);
  }

  /**
   * 在工作区创建新卡片文件夹结构
   */
  async function createCard(
    cardId: string,
    name: string,
    initialBasicCard?: BasicCardConfig
  ): Promise<CardInitResult> {
    const createdFiles: string[] = [];
    
    try {
      // 1. 验证输入参数
      if (!isValidId(cardId)) {
        return {
          success: false,
          cardPath: '',
          createdFiles: [],
          error: t(I18N_KEYS.ERROR_INVALID_CARD_ID),
          errorCode: 'VAL-1001',
        };
      }

      if (!name || name.trim().length === 0 || name.length > 500) {
        return {
          success: false,
          cardPath: '',
          createdFiles: [],
          error: t(I18N_KEYS.ERROR_INVALID_NAME),
          errorCode: 'VAL-1002',
        };
      }

      // 验证初始基础卡片 ID（如果有）
      if (initialBasicCard && !isValidId(initialBasicCard.id)) {
        return {
          success: false,
          cardPath: '',
          createdFiles: [],
          error: t(I18N_KEYS.ERROR_INVALID_CARD_ID),
          errorCode: 'VAL-1003',
        };
      }

      // 2. 定义路径
      const normalizedCardId = cardId.endsWith('.card')
        ? cardId.replace(/\.card$/i, '')
        : cardId;
      const cardFolderName = normalizedCardId;
      const cardPath = `${workspaceRoot}/${cardFolderName}`;
      const cardConfigPath = `${cardPath}/.card`;
      const contentPath = `${cardPath}/content`;
      const cardcoverPath = `${cardPath}/cardcover`;
      
      // 3. 检查卡片是否已存在
      if (await exists(cardPath)) {
        return {
          success: false,
          cardPath,
          createdFiles: [],
          error: t(I18N_KEYS.ERROR_CARD_EXISTS),
          errorCode: 'RES-3002',
        };
      }

      // 4. 创建目录结构
      await createDirectory(cardPath);
      await createDirectory(cardConfigPath);
      await createDirectory(contentPath);
      await createDirectory(cardcoverPath);

      // 5. 生成并写入 metadata.yaml
      const metadata = generateMetadata(cardId, name.trim());
      const metadataPath = `${cardConfigPath}/metadata.yaml`;
      await writeFile(metadataPath, toYaml(metadata));
      createdFiles.push(metadataPath);

      // 6. 生成并写入 structure.yaml
      const structure = generateStructure(initialBasicCard);
      const structurePath = `${cardConfigPath}/structure.yaml`;
      await writeFile(structurePath, toYaml(structure));
      createdFiles.push(structurePath);

      // 7. 生成并写入 cover.html
      const coverHtml = generateDefaultCoverHtml(name.trim());
      const coverPath = `${cardConfigPath}/cover.html`;
      await writeFile(coverPath, coverHtml);
      createdFiles.push(coverPath);

      // 8. 如果有初始基础卡片，生成配置文件
      if (initialBasicCard) {
        const basicCardConfig = generateBasicCardConfig(initialBasicCard);
        const basicCardPath = `${contentPath}/${initialBasicCard.id}.yaml`;
        await writeFile(basicCardPath, toYaml(basicCardConfig));
        createdFiles.push(basicCardPath);
      }

      // 9. 发送事件
      eventEmitter.emit('card:initialized', {
        cardId,
        name: name.trim(),
        cardPath,
        createdFiles,
        hasInitialBasicCard: !!initialBasicCard,
      });

      console.warn(
        `[CardInitializer] ${t(I18N_KEYS.SUCCESS_CARD_CREATED)}:`,
        { cardId, name: name.trim(), createdFiles }
      );

      return {
        success: true,
        cardPath,
        createdFiles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      eventEmitter.emit('card:initialize-failed', {
        cardId,
        name,
        error: errorMessage,
      });

      const fallbackFolderName = cardId.endsWith('.card')
        ? cardId.replace(/\.card$/i, '')
        : cardId;
      return {
        success: false,
        cardPath: `${workspaceRoot}/${fallbackFolderName}`,
        createdFiles,
        error: t(I18N_KEYS.ERROR_CREATE_DIRECTORY_FAILED) + `: ${errorMessage}`,
        errorCode: 'SYS-9001',
      };
    }
  }

  /**
   * 生成新的卡片 ID
   */
  function generateCardId(): string {
    return generateId62();
  }

  /**
   * 生成新的基础卡片 ID
   */
  function generateBasicCardId(): string {
    return generateId62();
  }

  /**
   * 验证卡片 ID 格式
   */
  function validateCardId(id: string): boolean {
    return isValidId(id);
  }

  return {
    createCard,
    generateCardId,
    generateBasicCardId,
    validateCardId,
  };
}

// ========== 单例管理 ==========

/** 单例实例 */
let cardInitializerInstance: CardInitializer | null = null;

/** 单例选项 */
let cardInitializerOptions: CardInitOptions | null = null;

/**
 * 获取卡片初始化器实例（单例）
 * @param options - 初始化选项（首次调用必须提供）
 * @returns 卡片初始化器实例
 */
export function useCardInitializer(options?: CardInitOptions): CardInitializer {
  if (!cardInitializerInstance) {
    if (!options) {
      throw new Error(
        '[CardInitializer] Options are required for first initialization'
      );
    }
    cardInitializerOptions = options;
    cardInitializerInstance = createCardInitializer(options);
  }
  return cardInitializerInstance;
}

/**
 * 重置卡片初始化器（主要用于测试）
 */
export function resetCardInitializer(): void {
  cardInitializerInstance = null;
  cardInitializerOptions = null;
}

/**
 * 获取当前卡片初始化器配置
 */
export function getCardInitializerOptions(): CardInitOptions | null {
  return cardInitializerOptions;
}
