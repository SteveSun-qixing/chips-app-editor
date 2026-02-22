<script setup lang="ts">
/**
 * 工具管理设置面板
 * @module components/engine-settings/panels/ToolsSettingsPanel
 *
 * 管理编辑引擎中已安装的工具和插件。
 * 支持启用、禁用和安装新工具。
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { ref, onMounted } from 'vue';
import { Button, Switch } from '@chips/components';
import { t } from '@/services/i18n-service';

/** 工具信息（从 SDK.PluginManager 获取） */
interface ToolInfo {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  enabled: boolean;
}

/** 工具列表 */
const tools = ref<ToolInfo[]>([]);

/** 加载状态 */
const isLoading = ref(false);

/**
 * 加载工具列表
 */
async function loadTools(): Promise<void> {
  isLoading.value = true;
  try {
    // TODO: 从 SDK.PluginManager 获取工具列表
    // const sdk = await getEditorSdk();
    // const plugins = sdk.plugins.list();
    // tools.value = plugins.map(p => ({ ... }));
    tools.value = [];
  } finally {
    isLoading.value = false;
  }
}

/**
 * 切换工具启用状态
 */
function handleToggleTool(_toolId: string, _enabled: boolean): void {
  // TODO: 调用 SDK.PluginManager 切换工具状态
}

onMounted(() => {
  loadTools();
});
</script>

<template>
  <div class="tools-settings-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.tools_title') }}
      </h3>
      <p class="settings-panel-header__desc">
        {{ t('engine_settings.tools_description') }}
      </p>
    </div>

    <!-- 已安装工具列表 -->
    <div class="settings-field">
      <div class="settings-field__header">
        <label class="settings-field__label">
          {{ t('engine_settings.tools_installed') }}
        </label>
      </div>

      <!-- 空状态 -->
      <div v-if="tools.length === 0 && !isLoading" class="settings-empty">
        <span class="settings-empty__icon">🧩</span>
        <span class="settings-empty__text">
          {{ t('engine_settings.tools_no_tools') }}
        </span>
      </div>

      <!-- 工具列表 -->
      <div v-else class="tools-list">
        <div
          v-for="tool in tools"
          :key="tool.id"
          class="tool-item"
        >
          <div class="tool-item__info">
            <span class="tool-item__name">{{ tool.name }}</span>
            <span class="tool-item__meta">
              {{ t('engine_settings.tools_version') }}: {{ tool.version }}
              <template v-if="tool.author">
                &middot; {{ t('engine_settings.tools_author') }}: {{ tool.author }}
              </template>
            </span>
            <span v-if="tool.description" class="tool-item__desc">
              {{ tool.description }}
            </span>
          </div>
          <Switch
            :model-value="tool.enabled"
            @update:model-value="(val: boolean) => handleToggleTool(tool.id, val)"
          />
        </div>
      </div>
    </div>

    <!-- 安装新工具 -->
    <div class="settings-actions">
      <Button type="default" html-type="button">
        {{ t('engine_settings.tools_install') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';

.tools-list {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.tool-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-sm, 12px) var(--chips-spacing-md, 16px);
  border: 1px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
}

.tool-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  margin-right: var(--chips-spacing-md, 16px);
}

.tool-item__name {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

.tool-item__meta {
  font-size: 12px;
  color: var(--chips-color-text-secondary, #6b7280);
}

.tool-item__desc {
  font-size: 12px;
  color: var(--chips-color-text-secondary, #6b7280);
  margin-top: 2px;
}
</style>
