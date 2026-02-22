/**
 * 封面快速制作器类型定义
 * @module components/cover-maker/types
 */

/** 封面创建模式 */
export type CoverCreationMode = 'image' | 'html' | 'zip' | 'template';

/** 模板风格类型 */
export type TemplateStyle =
  | 'minimal-white'      // 简约白底
  | 'gradient-blue'      // 渐变蓝
  | 'dark-theme'         // 深色背景
  | 'geometric'          // 几何图形
  | 'bordered'           // 纯色边框
  | 'magazine'           // 杂志风格
  | 'news-banner'        // 新闻风格
  | 'circle-soft';       // 圆形背景

/** 模板定义 */
export interface CoverTemplate {
  /** 模板ID */
  id: TemplateStyle;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 预览背景样式 */
  previewStyle: string;
  /** 生成 HTML 的函数 */
  generateHtml: (config: TemplateConfig) => string;
}

/** 模板配置 */
export interface TemplateConfig {
  /** 主标题 */
  title: string;
  /** 副标题（可选） */
  subtitle?: string;
  /** 作者（可选） */
  author?: string;
  /** 日期（可选） */
  date?: string;
  /** 自定义颜色（可选） */
  primaryColor?: string;
  /** 自定义背景色（可选） */
  backgroundColor?: string;
}

/** 封面数据 */
export interface CoverData {
  /** 创建模式 */
  mode: CoverCreationMode;
  /** HTML 内容（用于 html 和 template 模式） */
  htmlContent?: string;
  /** 图片数据（用于 image 模式） */
  imageData?: {
    /** 文件名 */
    filename: string;
    /** 文件数据 */
    data: Uint8Array;
    /** MIME 类型 */
    mimeType: string;
  };
  /** ZIP 数据（用于 zip 模式） */
  zipData?: {
    /** 文件数据 */
    data: Uint8Array;
    /** 入口文件 */
    entryFile: string;
  };
  /** 模板配置（用于 template 模式） */
  templateConfig?: {
    /** 模板 ID */
    templateId: TemplateStyle;
    /** 配置数据 */
    config: TemplateConfig;
  };
}

/** 封面创建结果 */
export interface CoverCreationResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的 HTML 内容 */
  htmlContent?: string;
  /** 需要保存到 cardcover/ 的资源文件 */
  resources?: {
    /** 文件路径（相对于 cardcover/） */
    path: string;
    /** 文件数据 */
    data: Uint8Array;
  }[];
  /** 错误信息 */
  error?: string;
}

/** 组件 Props */
export interface CoverMakerProps {
  /** 卡片 ID */
  cardId: string;
  /** 当前封面 HTML（可选，用于编辑） */
  currentCoverHtml?: string;
  /** 是否显示 */
  visible: boolean;
}

/** 组件 Emits */
export interface CoverMakerEmits {
  /** 关闭 */
  (e: 'close'): void;
  /** 保存封面 */
  (e: 'save', data: CoverData): void;
  /** 预览封面 */
  (e: 'preview', html: string): void;
}
