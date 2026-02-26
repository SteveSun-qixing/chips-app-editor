export interface LaunchFileParams {
  path?: string;
  extension?: string;
  kind?: string;
}

export interface PluginInitLaunchParams {
  reason?: string;
  source?: string;
  file?: LaunchFileParams;
  requestedAt?: string;
  workspaceRoot?: string;
  externalRoot?: string;
  workspace?: {
    root?: string;
    path?: string;
  };
  external?: {
    root?: string;
    path?: string;
  };
}

export interface PluginInitPayload {
  pluginId?: string;
  launchParams?: PluginInitLaunchParams;
  timestamp?: number;
}
