/**
 * 核心模块导出
 * @module core
 * @description Chips 编辑器核心模块，提供编辑器主类、连接器、事件管理和状态管理
 */

// ==================== 核心版本 ====================
export const CORE_VERSION = '1.0.0';

// ==================== 编辑器主类 ====================
export { ChipsEditor, createEditor } from './editor';
export type { CreateCardOptions, OpenCardOptions, SaveCardOptions } from './editor';

// ==================== SDK 连接器 ====================
export { SDKConnector, createConnector } from './connector';
export type {
  SDKConnectorOptions,
} from './connector';

// ==================== 事件管理 ====================
export { EventEmitter, createEventEmitter } from './event-manager';

// ==================== 状态管理 ====================
export {
  getEditorStore,
  useEditorStore,
  getCardStore,
  useCardStore,
  getUIStore,
  useUIStore,
  getSettingsStore,
  useSettingsStore,
} from './state';

export type {
  EditorStoreState,
  EditorStore,
  CardStoreState,
  CardStore,
  CardInfo,
  CardMetadata,
  BaseCardInfo,
  Card,
  UIStoreState,
  UIStore,
  DockPosition,
} from './state';

// ==================== 窗口管理 ====================
export {
  WindowManager,
  useWindowManager,
  resetWindowManager,
} from './window-manager';

// ==================== 文件服务 ====================
export {
  FileService,
  getFileService,
  resetFileService,
  getFileType,
  isValidFileName,
} from './file-service';

export type {
  FileType,
  FileInfo,
  CreateCardOptions as CreateFileCardOptions,
  CreateBoxOptions,
  CreateFolderOptions,
  FileOperationResult,
  ClipboardOperation,
  ClipboardData,
} from './file-service';

// ==================== 工作区服务 ====================
export {
  createWorkspaceService,
  useWorkspaceService,
  resetWorkspaceService,
} from './workspace-service';

export type {
  WorkspaceFile,
  WorkspaceState,
  WorkspaceService,
} from './workspace-service';

// ==================== 卡片服务 ====================
export {
  createCardService,
  useCardService,
  resetCardService,
} from './card-service';

export type {
  BasicCardData,
  CardMetadata as CardServiceMetadata,
  CardStructure,
  CompositeCard,
  CardService,
} from './card-service';

// ==================== 命令管理 ====================
export {
  CommandManager,
  useCommandManager,
  resetCommandManager,
} from './command-manager';

export type {
  Command,
  CommandHistory,
  CommandManagerConfig,
  CommandManagerEvents,
  CommandManagerEventCallback,
} from './command-manager';

// ==================== 命令 ====================
export {
  // 卡片命令
  AddBaseCardCommand,
  RemoveBaseCardCommand,
  MoveBaseCardCommand,
  UpdateBaseCardConfigCommand,
  BatchCardCommand,
  // 窗口命令
  CreateWindowCommand,
  CloseWindowCommand,
  MoveWindowCommand,
  ResizeWindowCommand,
  SetWindowStateCommand,
  BatchWindowCommand,
} from './commands';

// ==================== 拖放管理 ====================
export {
  DragDropManager,
  useDragDropManager,
  resetDragDropManager,
  useFileDrop,
  useCardSort,
  useCardNest,
  detectFileType,
  detectFileTypes,
} from './drag-drop-manager';

export type {
  DragSourceType,
  DropTargetType,
  DropEffect,
  FileDropType,
  DragSourceConfig,
  DropTargetConfig,
  DragSource,
  DropTarget,
  Position,
  InsertPosition,
  DragDropState,
  FileDragData,
  BaseCardDragData,
  CardNestDragData,
  UseFileDropReturn,
  UseCardSortReturn,
  UseCardNestReturn,
} from './drag-drop-manager';

// ==================== 卡片初始化器 ====================
export {
  createCardInitializer,
  useCardInitializer,
  resetCardInitializer,
  getCardInitializerOptions,
} from './card-initializer';

export type {
  BasicCardConfig,
  CardMetadataYaml,
  StructureEntry,
  ManifestResource,
  CardManifest,
  CardStructureYaml,
  BasicCardYaml,
  CardInitOptions,
  CardInitResult,
  CardInitializer,
} from './card-initializer';
