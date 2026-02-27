import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChipsButton as Button, ChipsInput as Input } from '@chips/component-library';
import { t } from '@/services/i18n-service';
import './WindowMenu.css';

export interface WindowMenuProps {
    /** 窗口标题 */
    title: string;
    /** 是否处于编辑模式 */
    isEditing?: boolean;
    /** 是否显示锁定按钮 */
    showLock?: boolean;
    /** 是否显示设置按钮 */
    showSettings?: boolean;
    /** 是否显示封面按钮 */
    showCover?: boolean;

    onToggleEdit?: () => void;
    onSwitchToCover?: () => void;
    onSettings?: () => void;
    onUpdateTitle?: (title: string) => void;
}

export function WindowMenu(props: WindowMenuProps) {
    const {
        title,
        isEditing = false,
        showLock = false,
        showSettings = true,
        showCover = true,
        onToggleEdit,
        onSwitchToCover,
        onSettings,
        onUpdateTitle,
    } = props;

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState('');

    // Note: If @chips/component-library Input does not expose inputRef properly or if we use standard input
    // We'll assume Input supports a standard ref or we do a best effort.
    // Actually, standard HTMLInputElement ref for the wrapper might be needed.
    const inputRef = useRef<any>(null);

    const startEditTitle = useCallback(() => {
        setEditingTitle(title);
        setIsEditingTitle(true);
        // Focus after render
        setTimeout(() => {
            const el = inputRef.current?.inputRef || inputRef.current;
            if (el?.focus) {
                el.focus();
                if (el.select) el.select();
            }
        }, 0);
    }, [title]);

    const saveTitle = useCallback(() => {
        if (!isEditingTitle) return;
        const trimmedTitle = editingTitle.trim();
        if (trimmedTitle && trimmedTitle !== '') {
            onUpdateTitle?.(trimmedTitle);
        }
        setIsEditingTitle(false);
    }, [isEditingTitle, editingTitle, onUpdateTitle]);

    const cancelEditTitle = useCallback(() => {
        setIsEditingTitle(false);
    }, []);

    const handleKeydown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditTitle();
        }
    }, [saveTitle, cancelEditTitle]);

    /* 全局点击以处理非失去焦点的情况 */
    useEffect(() => {
        const handleGlobalMousedown = (e: MouseEvent) => {
            if (!isEditingTitle) return;
            const target = e.target as HTMLElement;
            const el = inputRef.current?.inputRef || inputRef.current;
            if (el && !el.contains(target)) {
                saveTitle();
            }
        };
        document.addEventListener('mousedown', handleGlobalMousedown, true);
        return () => {
            document.removeEventListener('mousedown', handleGlobalMousedown, true);
        };
    }, [isEditingTitle, saveTitle]);

    return (
        <div className="window-menu">
            <div className="window-menu__left">
                {!isEditingTitle ? (
                    <div
                        className="window-menu__title"
                        onDoubleClick={startEditTitle}
                    >
                        {title}
                    </div>
                ) : (
                    <Input
                        ref={inputRef}
                        value={editingTitle}
                        className="window-menu__title-input"
                        type="text"
                        onBlur={saveTitle}
                        onKeyDown={handleKeydown}
                        onChange={(val: string | React.ChangeEvent<HTMLInputElement>) => {
                            // depend on Input library signature
                            const v = typeof val === 'string' ? val : val.target.value;
                            setEditingTitle(v);
                        }}
                    />
                )}
            </div>

            <div className="window-menu__right">
                {showLock && (
                    <Button
                        className={`window-menu__button ${isEditing ? 'window-menu__button--active' : ''}`}
                        htmlType="button"
                        type="text"
                        title={isEditing ? t('window_menu.switch_view') : t('window_menu.switch_edit')}
                        aria-label={isEditing ? t('window_menu.switch_view') : t('window_menu.switch_edit')}
                        onClick={() => onToggleEdit?.()}
                    >
                        <span className="window-menu__button-icon">{isEditing ? '🔓' : '🔒'}</span>
                    </Button>
                )}

                {showCover && (
                    <Button
                        className="window-menu__button"
                        htmlType="button"
                        type="text"
                        title={t('window_menu.switch_cover')}
                        aria-label={t('window_menu.switch_cover')}
                        onClick={() => onSwitchToCover?.()}
                    >
                        <span className="window-menu__button-icon">🖼️</span>
                    </Button>
                )}

                {showSettings && (
                    <Button
                        className="window-menu__button"
                        htmlType="button"
                        type="text"
                        title={t('window_menu.settings')}
                        aria-label={t('window_menu.settings')}
                        onClick={() => onSettings?.()}
                    >
                        <span className="window-menu__button-icon">⚙️</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
