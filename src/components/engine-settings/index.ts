/**
 * 编辑引擎设置模块
 * @module components/engine-settings
 *
 * 提供编辑引擎级别的全局设置功能。
 * 基于「注册中心」架构，支持无限扩展设置分类。
 *
 * 导出：
 * - EngineSettingsDialog: 全屏模态设置弹窗
 * - builtinPanelDefinitions: 内置面板定义（供 App 初始化注册）
 * - 各面板组件（供外部按需引用）
 */

export { EngineSettingsDialog } from './EngineSettingsDialog';
export { builtinPanelDefinitions } from './settings-registry';
export {
  LanguageSettingsPanel,
  ThemeSettingsPanel,
  LayoutSettingsPanel,
  ToolsSettingsPanel,
  FileModeSettingsPanel,
  AboutPanel,
} from './panels';
