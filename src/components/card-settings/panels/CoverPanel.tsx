import React from 'react';
import { ChipsButton } from '@chips/component-library';
import { t } from '@/services/i18n-service';
import './CoverPanel.css';

export interface CoverPanelProps {
  /** 打开封面制作器回调 */
  onOpenCoverMaker?: () => void;
}

/**
 * CoverPanel 封面设置面板
 * 负责卡片封面的设置和管理
 */
export function CoverPanel({ onOpenCoverMaker }: CoverPanelProps) {
  /**
   * 打开封面制作器
   */
  const handleOpenCoverMaker = () => {
    onOpenCoverMaker?.();
  };

  return (
    <div className="cover-panel">
      {/* 描述说明 */}
      <p className="cover-panel__desc">
        {t('card_settings.cover_description')}
      </p>

      {/* 封面操作选项 */}
      <div className="cover-panel__options">
        <ChipsButton
          htmlType="button"
          variant="default"
          className="cover-panel__option-card"
          onClick={handleOpenCoverMaker}
        >
          <div className="cover-panel__option-inner">
            <span className="cover-panel__option-icon" aria-hidden="true">🎨</span>
            <div className="cover-panel__option-text">
              <span className="cover-panel__option-title">
                {t('card_settings.cover_maker')}
              </span>
              <span className="cover-panel__option-desc">
                {t('card_settings.cover_maker_desc')}
              </span>
            </div>
          </div>
        </ChipsButton>
      </div>

      {/* 提示信息 */}
      <div
        role="alert"
        className="chips-alert chips-alert--info cover-panel__hint"
      >
        <span className="chips-alert__icon cover-panel__hint-icon">💡</span>
        <span className="chips-alert__message">{t('card_settings.cover_maker_hint')}</span>
      </div>
    </div>
  );
}
