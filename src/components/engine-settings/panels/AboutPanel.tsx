import React, { useMemo } from 'react';
import { t } from '@/services/i18n-service';
import '../styles/settings-panel.css';

/**
 * 关于面板
 * 展示编辑引擎的版本信息、开源协议、技术栈等。
 */
export function AboutPanel() {
  /** 软件版本信息 */
  const appInfo = useMemo(() => ({
    name: t('engine_settings.about_app_name'),
    version: '0.1.0',
    protocolVersion: '1.0.0',
    license: 'MIT',
    techStack: 'React 18 + TypeScript + Vite',
    homepage: 'https://github.com/SteveSun-qixing/PotatoEcosystem-Editor',
    copyright: '© 2026 Chips Ecosystem',
  }), []);

  return (
    <div className="about-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.about_title')}
        </h3>
      </div>

      {/* 应用图标和名称 */}
      <div className="about-hero">
        <div className="about-hero__icon">🥔</div>
        <h2 className="about-hero__name">{appInfo.name}</h2>
        <span className="about-hero__version">v{appInfo.version}</span>
      </div>

      {/* 信息列表 */}
      <div className="settings-info-list">
        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_version')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.version}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_protocol_version')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.protocolVersion}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_license')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.license}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_tech_stack')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.techStack}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_homepage')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.homepage}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_copyright')}
          </span>
          <span className="settings-info-item__value">
            {appInfo.copyright}
          </span>
        </div>
      </div>
    </div>
  );
}
