import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { ChipsButton as Button, ChipsInput as Input, type InputInstance } from '@chips/component-library';
import type { FileInfo } from '@/core/file-service';
import './FileItem.css';

export interface FileItemProps {
    /** 文件信息 */
    file: FileInfo;
    /** 缩进级别 */
    level?: number;
    /** 是否选中 */
    selected?: boolean;
    /** 是否正在重命名 */
    renaming?: boolean;
    /** 搜索关键词（用于高亮） */
    searchQuery?: string;

    onClick?: (file: FileInfo, event: React.MouseEvent) => void;
    onDoubleClick?: (file: FileInfo) => void;
    onContextMenu?: (file: FileInfo, event: React.MouseEvent) => void;
    onToggle?: (file: FileInfo) => void;
    onRename?: (file: FileInfo, newName: string) => void;
    onRenameCancel?: () => void;
    onDragStart?: (file: FileInfo, event: React.DragEvent) => void;
}

export function FileItem(props: FileItemProps) {
    const {
        file,
        level = 0,
        selected = false,
        renaming = false,
        searchQuery = '',
        onClick,
        onDoubleClick,
        onContextMenu,
        onToggle,
        onRename,
        onRenameCancel,
        onDragStart,
    } = props;

    const renameInput = useRef<InputInstance | null>(null);
    const [renameValue, setRenameValue] = React.useState('');

    const fileIcon = useMemo(() => {
        if (file.isDirectory) {
            return file.expanded ? '📂' : '📁';
        }
        switch (file.type) {
            case 'card':
                return '🃏';
            case 'box':
                return '📦';
            default:
                return '📄';
        }
    }, [file.isDirectory, file.expanded, file.type]);

    const indentStyle = useMemo(() => ({
        paddingLeft: `${level * 16 + 8}px`,
    }), [level]);

    const highlightedName = useMemo(() => {
        if (!searchQuery) {
            return file.name;
        }

        const query = searchQuery.toLowerCase();
        const name = file.name;
        const lowerName = name.toLowerCase();
        const index = lowerName.indexOf(query);

        if (index === -1) {
            return name;
        }

        const before = name.substring(0, index);
        const match = name.substring(index, index + query.length);
        const after = name.substring(index + query.length);

        return (
            <span className="file-item__name">
                {before}
                <mark className="file-item__highlight">{match}</mark>
                {after}
            </span>
        );
    }, [file.name, searchQuery]);

    useEffect(() => {
        if (renaming) {
            const name = file.name;
            const dotIndex = name.lastIndexOf('.');
            setRenameValue(dotIndex > 0 ? name.substring(0, dotIndex) : name);

            // Focus after render
            setTimeout(() => {
                renameInput.current?.focus();
                renameInput.current?.select();
            }, 0);
        }
    }, [renaming, file.name]);

    const handleClick = useCallback((event: React.MouseEvent) => {
        onClick?.(file, event);
    }, [onClick, file]);

    const handleDoubleClick = useCallback(() => {
        if (!renaming) {
            onDoubleClick?.(file);
        }
    }, [onDoubleClick, file, renaming]);

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        onContextMenu?.(file, event);
    }, [onContextMenu, file]);

    const handleToggle = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        if (file.isDirectory) {
            onToggle?.(file);
        }
    }, [onToggle, file]);

    const confirmRename = useCallback(() => {
        const newName = renameValue.trim();
        if (newName && newName !== file.name) {
            onRename?.(file, newName);
        } else {
            onRenameCancel?.();
        }
    }, [renameValue, file, onRename, onRenameCancel]);

    const cancelRename = useCallback(() => {
        onRenameCancel?.();
    }, [onRenameCancel]);

    const handleRenameKeydown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            confirmRename();
        } else if (event.key === 'Escape') {
            cancelRename();
        }
    }, [confirmRename, cancelRename]);

    const handleDragStart = useCallback((event: React.DragEvent) => {
        onDragStart?.(file, event);
    }, [onDragStart, file]);

    return (
        <div
            className={`file-item ${selected ? 'file-item--selected' : ''} ${file.isDirectory ? 'file-item--directory' : ''} ${renaming ? 'file-item--renaming' : ''}`}
            style={indentStyle}
            draggable={!renaming && !file.isDirectory && (file.type === 'card' || file.type === 'box')}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
        >
            {/* 展开/收起箭头 */}
            {file.isDirectory ? (
                <Button
                    className="file-item__toggle"
                    htmlType="button"
                    type="text"
                    onClick={handleToggle}
                >
                    <span className={`file-item__arrow ${file.expanded ? 'file-item__arrow--expanded' : ''}`}>
                        ▶
                    </span>
                </Button>
            ) : (
                <span className="file-item__toggle-placeholder"></span>
            )}

            {/* 文件图标 */}
            <span className="file-item__icon">{fileIcon}</span>

            {/* 文件名 */}
            {renaming ? (
                <Input
                    ref={renameInput}
                    value={renameValue}
                    onChange={setRenameValue}
                    className="file-item__rename-input"
                    type="text"
                    onBlur={confirmRename}
                    onKeyDown={handleRenameKeydown}
                />
            ) : (
                typeof highlightedName === 'string' ? (
                    <span className="file-item__name">{highlightedName}</span>
                ) : (
                    highlightedName
                )
            )}

            {/* 状态指示器 */}
            {file.isDirectory && file.children?.length ? (
                <span className="file-item__badge">
                    {file.children.length}
                </span>
            ) : null}
        </div>
    );
}
