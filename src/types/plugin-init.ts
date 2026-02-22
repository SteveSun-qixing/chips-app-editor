/**
 * 插件初始化启动文件参数
 */
export interface LaunchFileParams {
  path?: string;
  extension?: string;
  kind?: string;
}

/**
 * 插件初始化启动参数
 */
export interface PluginInitLaunchParams {
  reason?: string;
  source?: string;
  file?: LaunchFileParams;
  /** 工作区根路径（由 Host 在启动编辑器时传入） */
  workspaceRoot?: string;
  /** 外部环境根路径（由 Host 在启动编辑器时传入） */
  externalRoot?: string;
  requestedAt?: string;
}

/**
 * 插件初始化事件载荷
 */
export interface PluginInitPayload {
  pluginId?: string;
  launchParams?: PluginInitLaunchParams;
  timestamp?: number;
}
