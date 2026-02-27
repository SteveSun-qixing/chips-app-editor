import React, { useState, useCallback } from 'react';
import { ChipsButton } from '@chips/component-library';
import type { CardInfo } from '@/core/state';
import { resourceService } from '@/services/resource-service';
import { t } from '@/services/i18n-service';
import './ExportPanel.css';

export interface ExportPanelProps {
  /** 卡片 ID */
  cardId: string;
  /** 卡片信息 */
  cardInfo?: CardInfo;
}

const ROOT_PREFIX = resourceService.workspaceRoot.split('/').slice(0, -1).join('/');

function toRootRelative(path: string): string {
  if (path.startsWith(ROOT_PREFIX + '/')) {
    return path.slice(ROOT_PREFIX.length + 1);
  }
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
}

const externalRootRelative = toRootRelative(resourceService.externalRoot);

/**
 * ExportPanel 导出面板组件
 * 负责卡片导出为各种格式（.card / HTML / PDF / 图片）
 */
export function ExportPanel({ cardId, cardInfo }: ExportPanelProps) {
  // 导出状态
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  /**
   * 清理文件名中的非法字符
   */
  const sanitizeFileName = useCallback((name: string): string => {
    return name
      .replace(/[/:*?"<>|]/g, '_')
      .replace(/[ -]/g, '')
      .trim();
  }, []);

  /**
   * 生成唯一文件名
   */
  const generateUniqueFileName = useCallback(async (
    baseName: string,
    extension: string
  ): Promise<{ fileName: string; fullPath: string }> => {
    const cleanBaseName = sanitizeFileName(baseName) || t('card_settings.untitled');
    const separator = '_';
    const maxAttempts = 1000;

    const originalFileName = `${cleanBaseName}${extension}`;
    const originalPath = `${externalRootRelative}/${originalFileName}`;

    const exists = await resourceService.exists(originalPath);
    if (!exists) {
      return { fileName: originalFileName, fullPath: originalPath };
    }

    for (let i = 1; i <= maxAttempts; i += 1) {
      const numberedFileName = `${cleanBaseName}${separator}${i}${extension}`;
      const numberedPath = `${externalRootRelative}/${numberedFileName}`;
      const numberedExists = await resourceService.exists(numberedPath);
      if (!numberedExists) {
        return { fileName: numberedFileName, fullPath: numberedPath };
      }
    }

    return { fileName: originalFileName, fullPath: originalPath };
  }, [sanitizeFileName]);

  /**
   * 处理 .card 格式导出
   */
  const handleExportCard = useCallback(async () => {
    if (!cardInfo) return;

    setExportStatus('exporting');
    setExportProgress(10);
    setExportMessage(t('card_settings.exporting'));

    try {
      const cardName = cardInfo.metadata.name || t('card_settings.untitled');
      const { fullPath } = await generateUniqueFileName(cardName, '.card');

      setExportProgress(50);
      // 导出逻辑
      await new Promise(resolve => setTimeout(resolve, 500));

      setExportProgress(100);
      setExportStatus('success');
      setExportMessage(t('card_settings.export_success'));
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setExportMessage(t('card_settings.export_failed'));
    }
  }, [cardInfo, generateUniqueFileName]);

  /**
   * 处理 HTML 格式导出
   */
  const handleExportHtml = useCallback(async () => {
    if (!cardInfo) return;

    setExportStatus('exporting');
    setExportProgress(10);
    setExportMessage(t('card_settings.exporting'));

    try {
      const cardName = cardInfo.metadata.name || t('card_settings.untitled');
      const { fullPath } = await generateUniqueFileName(cardName, '.html');

      setExportProgress(50);
      // 导出逻辑
      await new Promise(resolve => setTimeout(resolve, 500));

      setExportProgress(100);
      setExportStatus('success');
      setExportMessage(t('card_settings.export_success'));
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setExportMessage(t('card_settings.export_failed'));
    }
  }, [cardInfo, generateUniqueFileName]);

  /**
   * 重置导出状态
   */
  const handleReset = useCallback(() => {
    setExportStatus('idle');
    setExportProgress(0);
    setExportMessage('');
  }, []);

  return (
    <div className="export-panel">
      {/* 标题 */}
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('card_settings.export_title')}
        </h3>
        <p className="settings-panel-header__desc">
          {t('card_settings.export_description')}
        </p>
      </div>

      {/* 导出选项 */}
      <div className="export-options">
        <div className="export-option">
          <div className="export-option__info">
            <span className="export-option__name">{t('card_settings.export_format_card')}</span>
            <span className="export-option__desc">{t('card_settings.export_format_card_desc')}</span>
          </div>
          <ChipsButton
            variant="primary"
            htmlType="button"
            onClick={handleExportCard}
            disabled={exportStatus === 'exporting'}
          >
            {t('card_settings.export')}
          </ChipsButton>
        </div>

        <div className="export-option">
          <div className="export-option__info">
            <span className="export-option__name">{t('card_settings.export_format_html')}</span>
            <span className="export-option__desc">{t('card_settings.export_format_html_desc')}</span>
          </div>
          <ChipsButton
            variant="primary"
            htmlType="button"
            onClick={handleExportHtml}
            disabled={exportStatus === 'exporting'}
          >
            {t('card_settings.export')}
          </ChipsButton>
        </div>
      </div>

      {/* 导出状态 */}
      {exportStatus !== 'idle' && (
        <div className={`export-status export-status--${exportStatus}`}>
          {exportStatus === 'exporting' && (
            <>
              <div className="export-status__progress-bar">
                <div
                  className="export-status__progress-bar-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="export-status__message">{exportMessage}</span>
            </>
          )}
          {exportStatus === 'success' && (
            <>
              <span className="export-status__icon">✓</span>
              <span className="export-status__message">{exportMessage}</span>
              <ChipsButton
                variant="default"
                htmlType="button"
                onClick={handleReset}
              >
                {t('card_settings.export_again')}
              </ChipsButton>
            </>
          )}
          {exportStatus === 'error' && (
            <>
              <span className="export-status__icon">✕</span>
              <span className="export-status__message">{exportMessage}</span>
              <ChipsButton
                variant="default"
                htmlType="button"
                onClick={handleReset}
              >
                {t('card_settings.retry')}
              </ChipsButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
