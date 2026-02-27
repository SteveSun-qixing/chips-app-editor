import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChipsButton } from '@chips/component-library';
import { useCardStore, getCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import { BasicInfoPanel, CoverPanel, ThemePanel, ExportPanel } from './panels';
import { t } from '@/services/i18n-service';
import './CardSettingsDialog.css';

export interface CardSettingsDialogProps {
  /** 卡片 ID */
  cardId: string;
  /** 是否显示 */
  visible: boolean;
  /** 关闭对话框回调 */
  onClose?: () => void;
  /** 保存设置回调 */
  onSave?: () => void;
}

/**
 * CardSettingsDialog 卡片设置对话框
 * 提供卡片的基本信息、封面、主题和导出设置
 */
export function CardSettingsDialog({
  cardId,
  visible,
  onClose,
  onSave,
}: CardSettingsDialogProps) {
  // 使用 useCardStore 获取只读状态
  const cardState = useCardStore();
  const workspaceService = useWorkspaceService();

  // 使用 getCardStore 获取 store 实例来调用 actions
  const cardStoreActions = getCardStore();

  // 获取卡片信息
  const cardInfo = cardState.openCards.get(cardId);

  // 选项卡状态
  const [activeTab, setActiveTab] = useState('basic');

  const DEFAULT_THEME_ID = 'default-light';

  // 编辑状态 - 由子面板通过事件同步
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME_ID);

  // 封面制作器状态（暂时不启用）
  const [showCoverMaker, setShowCoverMaker] = useState(false);

  // 初始化编辑数据
  useEffect(() => {
    if (visible && cardInfo) {
      setEditName(cardInfo.metadata.name || '');
      setEditTags(
        [...(cardInfo.metadata.tags || [])].map((tag) =>
          Array.isArray(tag) ? tag.join('/') : tag
        )
      );
      setSelectedTheme(cardInfo.metadata.theme || DEFAULT_THEME_ID);
      setActiveTab('basic');
    }
  }, [visible, cardInfo]);

  // 保存设置
  const handleSave = useCallback(() => {
    if (!cardInfo) return;

    // 更新卡片元数据
    cardStoreActions.updateCardMetadata(cardId, {
      name: editName.trim() || cardInfo.metadata.name,
      tags: editTags,
      theme: selectedTheme,
    });

    // 同步更新工作区文件名
    const newName = editName.trim();
    if (newName && newName !== cardInfo.metadata.name) {
      workspaceService.renameFile(cardId, `${newName}.card`);
    }

    onSave?.();
    onClose?.();
  }, [cardId, cardInfo, editName, editTags, selectedTheme, cardStoreActions, workspaceService, onSave, onClose]);

  // 取消设置
  const handleCancel = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // 处理遮罩点击关闭
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('card-settings-overlay')) {
      handleCancel();
    }
  }, [handleCancel]);

  // 处理 Escape 键关闭
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible && !showCoverMaker) {
        handleCancel();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleGlobalKeydown);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [visible, showCoverMaker, handleCancel]);

  // 打开封面制作器（暂时提示功能开发中）
  const handleOpenCoverMaker = useCallback(() => {
    setShowCoverMaker(true);
  }, []);

  // 封面保存处理（暂时不启用）
  const handleCoverSave = useCallback((_data: unknown) => {
    setShowCoverMaker(false);
  }, []);

  // Tab 配置
  const tabs = [
    { key: 'basic', label: t('card_settings.tab_basic') },
    { key: 'cover', label: t('card_settings.tab_cover') },
    { key: 'theme', label: t('card_settings.tab_theme') },
    { key: 'export', label: t('card_settings.tab_export') },
  ];

  if (!visible) return null;

  return createPortal(
    <div className="card-settings-overlay" onClick={handleOverlayClick}>
      <div className="card-settings-dialog">
        {/* 对话框头部 */}
        <div className="card-settings-dialog__header">
          <h2 className="card-settings-dialog__title">
            {t('card_settings.title')}
          </h2>
          <button
            type="button"
            className="card-settings-dialog__close-btn"
            aria-label={t('card_settings.close')}
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        {/* 选项卡导航 + 内容 */}
        <div className="card-settings-dialog__body">
          <div className="chips-tabs card-settings-dialog__tabs">
            <div className="chips-tabs__nav">
              <div className="chips-tabs__nav-list">
                {tabs.map((tab) => (
                  <div
                    key={tab.key}
                    className={`chips-tabs__tab ${activeTab === tab.key ? 'chips-tabs__tab--active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <button type="button" className="chips-tabs__tab-btn">
                      {tab.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="chips-tabs__content">
              <div
                className="chips-tabs__tabpane"
                style={{ display: activeTab === 'basic' ? 'block' : 'none' }}
              >
                <div className="card-settings-dialog__panel">
                  <BasicInfoPanel
                    cardId={cardId}
                    cardInfo={cardInfo}
                    onNameChange={setEditName}
                    onTagsChange={setEditTags}
                  />
                </div>
              </div>
              <div
                className="chips-tabs__tabpane"
                style={{ display: activeTab === 'cover' ? 'block' : 'none' }}
              >
                <div className="card-settings-dialog__panel">
                  <CoverPanel onOpenCoverMaker={handleOpenCoverMaker} />
                </div>
              </div>
              <div
                className="chips-tabs__tabpane"
                style={{ display: activeTab === 'theme' ? 'block' : 'none' }}
              >
                <div className="card-settings-dialog__panel">
                  <ThemePanel
                    modelValue={selectedTheme}
                    onUpdateModelValue={setSelectedTheme}
                  />
                </div>
              </div>
              <div
                className="chips-tabs__tabpane"
                style={{ display: activeTab === 'export' ? 'block' : 'none' }}
              >
                <div className="card-settings-dialog__panel">
                  <ExportPanel
                    cardId={cardId}
                    cardInfo={cardInfo}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 对话框底部 */}
        <div className="card-settings-dialog__footer">
          <ChipsButton
            htmlType="button"
            variant="default"
            className="card-settings-dialog__btn card-settings-dialog__btn--cancel"
            onClick={handleCancel}
          >
            {t('card_settings.cancel')}
          </ChipsButton>
          <ChipsButton
            htmlType="button"
            variant="primary"
            className="card-settings-dialog__btn card-settings-dialog__btn--save"
            onClick={handleSave}
          >
            {t('card_settings.save')}
          </ChipsButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
