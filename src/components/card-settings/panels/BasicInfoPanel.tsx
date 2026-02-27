import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChipsButton, ChipsInput } from '@chips/component-library';
import type { CardInfo } from '@/core/state';
import { t } from '@/services/i18n-service';
import './BasicInfoPanel.css';

export interface BasicInfoPanelProps {
  /** 卡片 ID */
  cardId: string;
  /** 卡片信息 */
  cardInfo: CardInfo | undefined;
  /** 名称变更回调 */
  onNameChange?: (value: string) => void;
  /** 标签变更回调 */
  onTagsChange?: (value: string[]) => void;
}

/**
 * BasicInfoPanel 基本信息面板
 * 负责卡片名称、标签，元数据的编辑和展示
 */
export function BasicInfoPanel({
  cardId,
  cardInfo,
  onNameChange,
  onTagsChange,
}: BasicInfoPanelProps) {
  // 编辑状态
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // 监听卡片信息变化，同步编辑状态
  useEffect(() => {
    if (cardInfo) {
      setEditName(cardInfo.metadata.name || '');
      setEditTags(
        [...(cardInfo.metadata.tags || [])].map((tag) =>
          Array.isArray(tag) ? tag.join('/') : tag
        )
      );
    }
  }, [cardInfo]);

  // 同步名称到父组件
  const handleNameChange = useCallback((value: string) => {
    setEditName(value);
    onNameChange?.(value);
  }, [onNameChange]);

  // 同步标签到父组件
  const handleTagsChange = useCallback((value: string[]) => {
    setEditTags(value);
    onTagsChange?.(value);
  }, [onTagsChange]);

  /**
   * 格式化日期时间
   */
  const formatDateTime = useCallback((timestamp: string | number | undefined): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }, []);

  /**
   * 添加标签
   */
  const addTag = useCallback(() => {
    const tag = newTag.trim();
    if (tag && !editTags.includes(tag)) {
      const newTags = [...editTags, tag];
      handleTagsChange(newTags);
      setNewTag('');
    }
  }, [newTag, editTags, handleTagsChange]);

  /**
   * 删除标签
   */
  const removeTag = useCallback((index: number) => {
    const newTags = editTags.filter((_, i) => i !== index);
    handleTagsChange(newTags);
  }, [editTags, handleTagsChange]);

  /**
   * 处理标签输入框键盘事件
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  // 元数据条目
  const metadataItems = useMemo(() => [
    {
      label: t('card_settings.card_id'),
      value: cardId,
      mono: true,
    },
    {
      label: t('card_settings.created_at'),
      value: formatDateTime(cardInfo?.metadata.created_at),
      mono: false,
    },
    {
      label: t('card_settings.modified_at'),
      value: formatDateTime(cardInfo?.metadata.modified_at),
      mono: false,
    },
  ], [cardId, cardInfo, formatDateTime]);

  return (
    <div className="basic-info-panel">
      {/* 卡片名称 */}
      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.name')}
        </label>
        <ChipsInput
          value={editName}
          onChange={handleNameChange}
          type="text"
          className="basic-info-panel__input"
          placeholder={t('card_settings.name_placeholder')}
        />
      </div>

      {/* 标签 */}
      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.tags')}
        </label>
        <div className="basic-info-panel__tag-input-row">
          <ChipsInput
            value={newTag}
            onChange={setNewTag}
            type="text"
            className="basic-info-panel__tag-input"
            placeholder={t('card_settings.tag_placeholder')}
            onKeyDown={handleKeyDown}
          />
          <ChipsButton
            htmlType="button"
            variant="default"
            className="basic-info-panel__tag-add-btn"
            onClick={addTag}
          >
            {t('card_settings.tag_add')}
          </ChipsButton>
        </div>
        {editTags.length > 0 && (
          <div className="basic-info-panel__tag-list">
            {editTags.map((tag, index) => (
              <span key={index} className="basic-info-panel__tag">
                {tag}
                <button
                  className="basic-info-panel__tag-close"
                  type="button"
                  onClick={() => removeTag(index)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 元数据 */}
      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.metadata')}
        </label>
        <div className="basic-info-panel__metadata">
          {metadataItems.map((item) => (
            <div key={item.label} className="basic-info-panel__metadata-row">
              <span className="basic-info-panel__metadata-label">{item.label}</span>
              <span
                className={`basic-info-panel__metadata-value ${
                  item.mono ? 'basic-info-panel__metadata-value--mono' : ''
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
