import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { FileInfo } from '@/core/file-service';
import { t } from '@/services/i18n-service';
import './ContextMenu.css';

/**
 * 菜单项接口
 */
export interface MenuItem {
    /** 菜单项 ID */
    id: string;
    /** 显示文本（i18n key） */
    label: string;
    /** 图标 */
    icon?: string;
    /** 快捷键提示 */
    shortcut?: string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否为分隔线 */
    divider?: boolean;
    /** 子菜单 */
    children?: MenuItem[];
}

export interface ContextMenuProps {
    /** 是否显示 */
    visible: boolean;
    /** 位置 X */
    x: number;
    /** 位置 Y */
    y: number;
    /** 当前选中的文件 */
    selectedFiles?: FileInfo[];
    /** 是否有剪贴板内容 */
    hasClipboard?: boolean;
    /** 关闭菜单回调 */
    onClose?: () => void;
    /** 菜单项点击回调 */
    onAction?: (actionId: string, files: FileInfo[]) => void;
}

export function ContextMenu(props: ContextMenuProps) {
    const {
        visible,
        x,
        y,
        selectedFiles = [],
        hasClipboard = false,
        onClose,
        onAction,
    } = props;

    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);

    const isSingleFile = selectedFiles.length === 1;
    const hasSelection = selectedFiles.length > 0;

    const menuItems = useMemo<MenuItem[]>(() => {
        const items: MenuItem[] = [];

        // 新建菜单（始终显示）
        items.push({
            id: 'new',
            label: 'file_manager.menu_new',
            icon: '➕',
            children: [
                { id: 'new-card', label: 'file_manager.new_card', icon: '🃏' },
                { id: 'new-box', label: 'file_manager.new_box', icon: '📦' },
            ],
        });

        items.push({ id: 'divider-1', label: '', divider: true });

        // 文件操作（需要选中项）
        if (hasSelection) {
            items.push({
                id: 'open',
                label: 'file_manager.open',
                icon: '📂',
                shortcut: 'Enter',
                disabled: !isSingleFile,
            });

            items.push({ id: 'divider-2', label: '', divider: true });

            items.push({
                id: 'cut',
                label: 'common.cut',
                icon: '✂️',
                shortcut: '⌘X',
            });

            items.push({
                id: 'copy',
                label: 'common.copy',
                icon: '📋',
                shortcut: '⌘C',
            });
        }

        // 粘贴（始终显示，但可能禁用）
        items.push({
            id: 'paste',
            label: 'common.paste',
            icon: '📥',
            shortcut: '⌘V',
            disabled: !hasClipboard,
        });

        if (hasSelection) {
            items.push({ id: 'divider-3', label: '', divider: true });

            items.push({
                id: 'rename',
                label: 'file_manager.rename',
                icon: '✏️',
                shortcut: 'F2',
                disabled: !isSingleFile,
            });

            items.push({
                id: 'delete',
                label: 'common.delete',
                icon: '🗑️',
                shortcut: 'Del',
            });
        }

        items.push({ id: 'divider-4', label: '', divider: true });

        // 在资源管理器中显示
        if (isSingleFile) {
            items.push({
                id: 'reveal',
                label: 'file_manager.reveal_in_finder',
                icon: '🔍',
            });
        }

        items.push({
            id: 'refresh',
            label: 'file_manager.refresh',
            icon: '🔄',
        });

        return items;
    }, [hasSelection, isSingleFile, hasClipboard]);

    const adjustPosition = useCallback(() => {
        if (!menuRef.current) {
            setPosition({ x, y });
            return;
        }

        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        // 右边界检查
        if (posX + rect.width > viewportWidth) {
            posX = viewportWidth - rect.width - 10;
        }

        // 下边界检查
        if (posY + rect.height > viewportHeight) {
            posY = viewportHeight - rect.height - 10;
        }

        // 确保不小于 0
        posX = Math.max(10, posX);
        posY = Math.max(10, posY);

        setPosition({ x: posX, y: posY });
    }, [x, y]);

    useEffect(() => {
        if (visible) {
            setExpandedSubmenu(null);
            // 延迟调整位置，等待 DOM 渲染
            requestAnimationFrame(adjustPosition);
        }
    }, [visible, adjustPosition]);

    const handleItemClick = useCallback((item: MenuItem) => {
        if (item.disabled || item.divider) {
            return;
        }

        if (item.children) {
            setExpandedSubmenu((prev) => (prev === item.id ? null : item.id));
            return;
        }

        onAction?.(item.id, selectedFiles);
        onClose?.();
    }, [selectedFiles, onAction, onClose]);

    const handleSubmenuClick = useCallback((e: React.MouseEvent, item: MenuItem) => {
        e.stopPropagation();
        if (item.disabled || item.divider) {
            return;
        }

        onAction?.(item.id, selectedFiles);
        onClose?.();
    }, [selectedFiles, onAction, onClose]);

    const handleMouseEnter = useCallback((item: MenuItem) => {
        if (item.children) {
            setExpandedSubmenu(item.id);
        } else {
            setExpandedSubmenu(null);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        if (visible) {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
            role="menu"
        >
            {menuItems.map((item) => {
                if (item.divider) {
                    return <div key={item.id} className="context-menu__divider"></div>;
                }

                const isExpanded = expandedSubmenu === item.id;

                return (
                    <div
                        key={item.id}
                        className={`context-menu__item ${item.disabled ? 'context-menu__item--disabled' : ''} ${item.children ? 'context-menu__item--has-submenu' : ''} ${isExpanded ? 'context-menu__item--expanded' : ''}`}
                        data-action-id={item.id}
                        role="menuitem"
                        aria-disabled={item.disabled}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => handleMouseEnter(item)}
                    >
                        {item.icon && <span className="context-menu__icon">{item.icon}</span>}
                        <span className="context-menu__label">{t(item.label)}</span>
                        {item.shortcut && <span className="context-menu__shortcut">{item.shortcut}</span>}
                        {item.children && <span className="context-menu__arrow">▶</span>}

                        {/* 子菜单 */}
                        {item.children && isExpanded && (
                            <div className="context-menu__submenu">
                                {item.children.map((child) => (
                                    <div
                                        key={child.id}
                                        className={`context-menu__item ${child.disabled ? 'context-menu__item--disabled' : ''}`}
                                        data-action-id={child.id}
                                        role="menuitem"
                                        aria-disabled={child.disabled}
                                        onClick={(e) => handleSubmenuClick(e, child)}
                                    >
                                        {child.icon && <span className="context-menu__icon">{child.icon}</span>}
                                        <span className="context-menu__label">{t(child.label)}</span>
                                        {child.shortcut && <span className="context-menu__shortcut">{child.shortcut}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>,
        document.body
    );
}
