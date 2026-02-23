export interface IframeBridgeRequestMessage {
  type: 'bridge-request';
  pluginId: string;
  sessionNonce: string;
  requestNonce: string;
  requestId: string;
  namespace: string;
  action: string;
  params?: unknown;
}

export interface IframeConfigUpdateMessage {
  type: 'config-update';
  pluginId: string;
  sessionNonce: string;
  config: Record<string, unknown>;
  persist?: boolean;
}

export interface IframeEditorCancelMessage {
  type: 'editor-cancel';
  pluginId: string;
  sessionNonce: string;
}

export interface IframeResizeMessage {
  type: 'resize';
  pluginId: string;
  sessionNonce: string;
  width?: number;
  height?: number;
}

export interface IframeVocabularyPayload {
  mode: 'full';
  vocabulary: Record<string, string>;
}

export interface IframeI18nEnvelope {
  locale: string;
  version: string;
  payload: IframeVocabularyPayload;
}
