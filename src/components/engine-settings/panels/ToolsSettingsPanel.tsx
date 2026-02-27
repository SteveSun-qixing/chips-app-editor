import React, { useState, useEffect, useCallback } from 'react';
import { ChipsButton, ChipsSwitch } from '@chips/component-library';
import { invokeEditorRuntime } from '@/services/editor-runtime-gateway';
import { t } from '@/services/i18n-service';
import '../styles/settings-panel.css';

/** 工具信息（从 SDK.PluginManager 获取） */
interface ToolInfo {
  id: string;
  name: string;
  version: string;
  type: string;
  author?: string;
  description?: string;
  enabled: boolean;
}

/**
 * 工具管理设置面板
 * 管理编辑引擎中已安装的工具和插件。
 * 支持启用、禁用和安装新工具。
 */
export function ToolsSettingsPanel() {
  /** 工具列表 */
  const [tools, setTools] = useState<ToolInfo[]>([]);

  /** 加载状态 */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 加载工具列表
   */
  const loadTools = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invokeEditorRuntime<{
        plugins?: Array<{
          id: string;
          name?: string;
          version?: string;
          type?: string;
          publisher?: string;
          description?: string;
          enabled: boolean;
        }>;
      }>('plugin', 'list', {});

      const plugins = Array.isArray(response.plugins) ? response.plugins : [];
      setTools(plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.name?.trim() || plugin.id,
        version: plugin.version?.trim() || '0.0.0',
        type: plugin.type?.trim() || 'module',
        author: plugin.publisher?.trim() || undefined,
        description: plugin.description?.trim() || undefined,
        enabled: plugin.enabled === true,
      })));
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  /**
   * 切换工具启用状态
   */
  const handleToggleTool = useCallback(async (toolId: string, enabled: boolean) => {
    try {
      const target = tools.find((tool) => tool.id === toolId);
      const type = target?.type;
      await invokeEditorRuntime('plugin', enabled ? 'enable' : 'disable', {
        pluginId: toolId,
        ...(type ? { type } : {}),
      });
      // 更新本地状态
      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === toolId ? { ...tool, enabled } : tool
        )
      );
    } catch (error) {
      console.error('Failed to toggle tool state:', error);
      await loadTools();
    }
  }, [tools, loadTools]);

  return (
    <div className="tools-settings-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.tools_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('engine_settings.tools_description')}
        </p>
      </div>

      {/* 已安装工具列表 */}
      <div className="settings-field">
        <div className="settings-field__header">
          <label className="settings-field__label">
            {t('engine_settings.tools_installed')}
          </label>
        </div>

        {/* 空状态 */}
        {tools.length === 0 && !isLoading && (
          <div className="settings-empty">
            <span className="settings-empty__icon">🧩</span>
            <span className="settings-empty__text">
              {t('engine_settings.tools_no_tools')}
            </span>
          </div>
        )}

        {/* 工具列表 */}
        {tools.length > 0 && (
          <div className="tools-list">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="tool-item"
              >
                <div className="tool-item__info">
                  <span className="tool-item__name">{tool.name}</span>
                  <span className="tool-item__meta">
                    {t('engine_settings.tools_version')}: {tool.version}
                    {tool.author && (
                      <> &middot; {t('engine_settings.tools_author')}: {tool.author}</>
                    )}
                  </span>
                  {tool.description && (
                    <span className="tool-item__desc">
                      {tool.description}
                    </span>
                  )}
                </div>
                <ChipsSwitch
                  checked={tool.enabled}
                  onChange={(val: boolean) => handleToggleTool(tool.id, val)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 安装新工具 */}
      <div className="settings-actions">
        <ChipsButton variant="default" htmlType="button">
          {t('engine_settings.tools_install')}
        </ChipsButton>
      </div>
    </div>
  );
}
