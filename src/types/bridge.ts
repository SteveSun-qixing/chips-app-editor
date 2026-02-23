export type {
  ChipsDialogFileFilter,
  ChipsOpenDialogOptions,
  ChipsSaveDialogOptions,
  ChipsMessageBoxOptions,
  ChipsPluginListFilter,
  ChipsPluginInfo,
  ChipsPluginSelfInfo,
  ChipsCardPluginEntry,
  ChipsLayoutPluginEntry,
  ChipsWindowInfo,
  ChipsWindowBridge,
  ChipsDialogBridge,
  ChipsPluginBridge,
  ChipsClipboardBridge,
  ChipsShellBridge,
  ChipsBridgeAPI,
} from '@chips/sdk';

export interface FileReadResult {
  content: string;
  encoding: 'utf8' | 'base64' | 'binary';
  size: number;
}
