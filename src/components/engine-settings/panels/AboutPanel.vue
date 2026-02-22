<script setup lang="ts">
/**
 * 关于面板
 * @module components/engine-settings/panels/AboutPanel
 *
 * 展示编辑引擎的版本信息、开源协议、技术栈等。
 * 纯展示面板，无可修改设置。
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { t } from '@/services/i18n-service';

/** 软件版本信息 */
const appInfo = {
  name: t('engine_settings.about_app_name'),
  version: '0.1.0',
  protocolVersion: '1.0.0',
  license: 'MIT',
  techStack: 'Vue 3 + TypeScript + Pinia + Vite',
  homepage: 'https://github.com/SteveSun-qixing/PotatoEcosystem-Editor',
  copyright: '© 2026 Chips Ecosystem',
};
</script>

<template>
  <div class="about-panel">
    <!-- 标题 -->
    <div class="settings-panel-header">
      <h3 class="settings-panel-header__title">
        {{ t('engine_settings.about_title') }}
      </h3>
    </div>

    <!-- 应用图标和名称 -->
    <div class="about-hero">
      <div class="about-hero__icon">🥔</div>
      <h2 class="about-hero__name">{{ appInfo.name }}</h2>
      <span class="about-hero__version">v{{ appInfo.version }}</span>
    </div>

    <!-- 信息列表 -->
    <div class="settings-info-list">
      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_version') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.version }}
        </span>
      </div>

      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_protocol_version') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.protocolVersion }}
        </span>
      </div>

      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_license') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.license }}
        </span>
      </div>

      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_tech_stack') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.techStack }}
        </span>
      </div>

      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_homepage') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.homepage }}
        </span>
      </div>

      <div class="settings-info-item">
        <span class="settings-info-item__label">
          {{ t('engine_settings.about_copyright') }}
        </span>
        <span class="settings-info-item__value">
          {{ appInfo.copyright }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/settings-panel.css';

.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px) 0;
  margin-bottom: var(--chips-spacing-lg, 24px);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
}

.about-hero__icon {
  font-size: 56px;
  line-height: 1;
}

.about-hero__name {
  margin: 0;
  font-size: var(--chips-font-size-xl, 20px);
  font-weight: var(--chips-font-weight-bold, 700);
  color: var(--chips-color-text, #111827);
}

.about-hero__version {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
  background: color-mix(
    in srgb,
    var(--chips-color-text-secondary, #6b7280) 10%,
    transparent
  );
  padding: 2px 10px;
  border-radius: var(--chips-radius-full, 9999px);
}
</style>
