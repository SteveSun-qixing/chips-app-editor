import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChipsButton } from '@chips/component-library';
import { useSettingsStore, getSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { SettingsCategoryId } from '@/types';
import './EngineSettingsDialog.css';

export interface EngineSettingsDialogProps {
  /** 是否显示 */
  visible: boolean;
  /** 初始激活的分类 ID */
  initialCategory?: SettingsCategoryId;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 编辑引擎设置弹窗
 * 全屏模态弹窗，在引擎最上层显示。
 * 左侧菜单栏 + 右侧动态面板，完全零硬编码。
 */
export function EngineSettingsDialog({
  visible,
  initialCategory,
  onClose,
}: EngineSettingsDialogProps) {
  // 使用 useSettingsStore 获取只读状态
  const settingsState = useSettingsStore();
  // 使用 getSettingsStore 获取 store 实例来调用 actions
  const settingsStoreActions = getSettingsStore();

  /** 当前选中的分类 ID */
  const [activeCategoryId, setActiveCategoryId] = useState<SettingsCategoryId>('');

  /** 按分组排列的分类列表 */
  const groupedCategories = useMemo(() => settingsState.groupedCategories, [settingsState.groupedCategories]);

  /** 当前激活的面板组件 */
  const activePanelComponent = useMemo(() => {
    if (!activeCategoryId) return undefined;
    return settingsStoreActions.getPanelComponent(activeCategoryId);
  }, [activeCategoryId, settingsStoreActions]);

  /**
   * 设置默认激活分类
   */
  const syncActiveCategory = useCallback(() => {
    if (initialCategory && settingsStoreActions.hasPanel(initialCategory)) {
      setActiveCategoryId(initialCategory);
    } else {
      const sorted = settingsState.sortedCategories;
      setActiveCategoryId(sorted[0]?.id ?? '');
    }
  }, [initialCategory, settingsState, settingsStoreActions]);

  /**
   * 弹窗打开时，重置分类选择
   */
  useEffect(() => {
    if (visible) {
      syncActiveCategory();
    }
  }, [visible, syncActiveCategory]);

  /**
   * 选择分类
   */
  const handleSelectCategory = useCallback((categoryId: SettingsCategoryId) => {
    setActiveCategoryId(categoryId);
  }, []);

  /**
   * 关闭弹窗
   */
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  /**
   * 遮罩点击关闭
   */
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('engine-settings-overlay')) {
      handleClose();
    }
  }, [handleClose]);

  /**
   * Escape 键关闭
   */
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, [visible, handleClose]);

  /**
   * 重置当前分类设置
   */
  const handleResetCategory = useCallback(() => {
    if (activeCategoryId) {
      settingsStoreActions.resetCategory(activeCategoryId);
    }
  }, [activeCategoryId, settingsStoreActions]);

  // 渲染菜单项
  const renderNavItems = () => {
    return groupedCategories.map((group: typeof groupedCategories[number], groupIndex: number) => (
      <React.Fragment key={groupIndex}>
        {/* 分组分隔线（非首组） */}
        {groupIndex > 0 && (
          <div className="engine-settings-dialog__nav-divider" />
        )}
        {/* 分组内的菜单项 */}
        {group.map((category: typeof group[number]) => (
          <button
            key={category.id}
            type="button"
            className={`engine-settings-dialog__nav-item ${
              activeCategoryId === category.id ? 'engine-settings-dialog__nav-item--active' : ''
            }`}
            onClick={() => handleSelectCategory(category.id)}
          >
            {category.icon && (
              <span className="engine-settings-dialog__nav-icon">
                {category.icon}
              </span>
            )}
            <span className="engine-settings-dialog__nav-label">
              {t(category.labelKey)}
            </span>
          </button>
        ))}
      </React.Fragment>
    ));
  };

  // 如果不可见，返回null
  if (!visible) return null;

  // 使用React Portal渲染到body
  return createPortal(
    <div className="engine-settings-overlay" onClick={handleOverlayClick}>
      <div className="engine-settings-dialog">
        {/* 头部 */}
        <div className="engine-settings-dialog__header">
          <h2 className="engine-settings-dialog__title">
            {t('engine_settings.title')}
          </h2>
          <button
            type="button"
            className="engine-settings-dialog__close-btn"
            aria-label={t('engine_settings.close')}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* 主体：左侧菜单 + 右侧面板 */}
        <div className="engine-settings-dialog__body">
          {/* 左侧菜单栏 */}
          <nav className="engine-settings-dialog__nav">
            {renderNavItems()}
          </nav>

          {/* 右侧面板内容 */}
          <div className="engine-settings-dialog__content">
            {/* 动态面板渲染 */}
            {activePanelComponent ? (
              <div key={activeCategoryId}>
                {React.createElement(activePanelComponent)}
              </div>
            ) : (
              /* 未找到面板的回退 */
              <div className="engine-settings-dialog__empty">
                <p className="engine-settings-dialog__empty-text">
                  {t('engine_settings.no_settings')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="engine-settings-dialog__footer">
          <ChipsButton
            htmlType="button"
            variant="default"
            className="engine-settings-dialog__btn engine-settings-dialog__btn--reset"
            onClick={handleResetCategory}
          >
            {t('engine_settings.reset')}
          </ChipsButton>
          <div className="engine-settings-dialog__footer-spacer" />
          <ChipsButton
            htmlType="button"
            variant="primary"
            className="engine-settings-dialog__btn engine-settings-dialog__btn--close"
            onClick={handleClose}
          >
            {t('engine_settings.close')}
          </ChipsButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
