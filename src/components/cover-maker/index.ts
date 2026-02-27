/**
 * 封面快速制作器模块导出
 * @module components/cover-maker
 *
 * 注意：CoverMaker 组件仍在归档状态，等待后续迁移
 */

// 类型导出
export type {
  CoverCreationMode,
  TemplateStyle,
  CoverTemplate,
  TemplateConfig,
  CoverData,
  CoverCreationResult,
  CoverMakerProps,
  CoverMakerEmits,
} from './types';

// 模板工具导出
export {
  templates,
  getTemplateById,
  generateCoverHtml,
  generateImageCoverHtml,
  generateDefaultCoverHtml,
} from './templates';

// CoverMaker 组件已归档至 archive/legacy-vue/components/cover-maker/
// 待 React 版本 CoverMaker 实现后在此导出
