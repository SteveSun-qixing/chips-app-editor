/**
 * 封面快速制作器模块导出
 * @module components/cover-maker
 */

export { default as CoverMaker } from './CoverMaker.vue';
export { default as TemplateGrid } from './TemplateGrid.vue';
export { default as TemplatePreview } from './TemplatePreview.vue';

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
