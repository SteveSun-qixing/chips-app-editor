import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { FileItem } from './FileItem';
import type { FileInfo } from '@/core/file-service';
import { t } from '@/services/i18n-service';
import './FileTree.css';

export interface FileTreeProps {
    /** 文件列表 */
    files: FileInfo[];
    /** 选中的文件路径列表 */
    selectedPaths?: string[];
    /** 正在重命名的文件路径 */
    renamingPath?: string | null;
    /** 搜索关键词 */
    searchQuery?: string;
    /** 是否允许多选 */
    multiSelect?: boolean;

    onSelect?: (paths: string[], files: FileInfo[]) => void;
    onOpen?: (file: FileInfo) => void;
    onContextMenu?: (file: FileInfo, event: React.MouseEvent) => void;
    onToggle?: (file: FileInfo) => void;
    onRename?: (file: FileInfo, newName: string) => void;
    onRenameCancel?: () => void;
    onDragStart?: (file: FileInfo, event: React.DragEvent) => void;
}

function flattenFiles(files: FileInfo[], result: FileInfo[] = []): FileInfo[] {
    for (const file of files) {
        result.push(file);
        if (file.isDirectory && file.expanded && file.children) {
            flattenFiles(file.children, result);
        }
    }
    return result;
}

function getFileLevel(file: FileInfo): number {
    const parts = file.path.split('/').filter(Boolean);
    return Math.max(0, parts.length - 2); // workspace 不计入层级
}

export function FileTree(props: FileTreeProps) {
    const {
        files,
        selectedPaths = [],
        renamingPath = null,
        searchQuery = '',
        multiSelect = false,
        onSelect,
        onOpen,
        onContextMenu,
        onToggle,
        onRename,
        onRenameCancel,
        onDragStart,
    } = props;

    const treeRef = useRef<HTMLDivElement>(null);
    const [focusIndex, setFocusIndex] = useState(-1);

    const flattenedFiles = useMemo(() => flattenFiles(files), [files]);

    const handleFileClick = useCallback((file: FileInfo, event: React.MouseEvent) => {
        const paths: string[] = [];
        const selectedObjFiles: FileInfo[] = [];

        if (multiSelect && (event.ctrlKey || event.metaKey)) {
            // 多选：切换选中状态
            const currentPaths = [...selectedPaths];
            const index = currentPaths.indexOf(file.path);
            if (index > -1) {
                currentPaths.splice(index, 1);
            } else {
                currentPaths.push(file.path);
            }

            for (const path of currentPaths) {
                const f = flattenedFiles.find((f) => f.path === path);
                if (f) {
                    paths.push(path);
                    selectedObjFiles.push(f);
                }
            }
        } else if (multiSelect && event.shiftKey && selectedPaths.length > 0) {
            // 范围选择
            const lastSelected = selectedPaths[selectedPaths.length - 1];
            const lastIndex = flattenedFiles.findIndex((f) => f.path === lastSelected);
            const currentIndex = flattenedFiles.findIndex((f) => f.path === file.path);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);

                for (let i = start; i <= end; i++) {
                    const f = flattenedFiles[i];
                    if (f) {
                        paths.push(f.path);
                        selectedObjFiles.push(f);
                    }
                }
            }
        } else {
            // 单选
            paths.push(file.path);
            selectedObjFiles.push(file);
        }

        // 更新焦点索引
        setFocusIndex(flattenedFiles.findIndex((f) => f.path === file.path));

        onSelect?.(paths, selectedObjFiles);
    }, [multiSelect, selectedPaths, flattenedFiles, onSelect]);

    const handleFileDoubleClick = useCallback((file: FileInfo) => {
        if (file.isDirectory) {
            onToggle?.(file);
        } else {
            onOpen?.(file);
        }
    }, [onToggle, onOpen]);

    const handleContextMenuProxy = useCallback((file: FileInfo, event: React.MouseEvent) => {
        if (!selectedPaths.includes(file.path)) {
            onSelect?.([file.path], [file]);
        }
        onContextMenu?.(file, event);
    }, [selectedPaths, onSelect, onContextMenu]);

    const selectFocusedFile = useCallback((index: number) => {
        const file = flattenedFiles[index];
        if (file) {
            onSelect?.([file.path], [file]);
        }
    }, [flattenedFiles, onSelect]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (flattenedFiles.length === 0) return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setFocusIndex((prev) => {
                        const next = Math.min(prev + 1, flattenedFiles.length - 1);
                        selectFocusedFile(next);
                        return next;
                    });
                    break;

                case 'ArrowUp':
                    event.preventDefault();
                    setFocusIndex((prev) => {
                        const next = Math.max(prev - 1, 0);
                        selectFocusedFile(next);
                        return next;
                    });
                    break;

                case 'ArrowRight': {
                    event.preventDefault();
                    const file = flattenedFiles[focusIndex];
                    if (file?.isDirectory && !file.expanded) {
                        onToggle?.(file);
                    }
                    break;
                }

                case 'ArrowLeft': {
                    event.preventDefault();
                    const file = flattenedFiles[focusIndex];
                    if (file?.isDirectory && file.expanded) {
                        onToggle?.(file);
                    }
                    break;
                }

                case 'Enter': {
                    event.preventDefault();
                    const file = flattenedFiles[focusIndex];
                    if (file) {
                        if (file.isDirectory) {
                            onToggle?.(file);
                        } else {
                            onOpen?.(file);
                        }
                    }
                    break;
                }

                case 'Home':
                    event.preventDefault();
                    setFocusIndex(0);
                    selectFocusedFile(0);
                    break;

                case 'End':
                    event.preventDefault();
                    setFocusIndex(flattenedFiles.length - 1);
                    selectFocusedFile(flattenedFiles.length - 1);
                    break;
            }
        };

        const el = treeRef.current;
        if (el) {
            el.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            if (el) {
                el.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [flattenedFiles, focusIndex, onToggle, onOpen, selectFocusedFile]);

    return (
        <div
            ref={treeRef}
            className="file-tree"
            tabIndex={0}
            role="tree"
            aria-label={t('file.tree_label')}
        >
            {flattenedFiles.length > 0 ? (
                flattenedFiles.map((file) => (
                    <FileItem
                        key={file.path}
                        file={file}
                        level={getFileLevel(file)}
                        selected={selectedPaths.includes(file.path)}
                        renaming={renamingPath === file.path}
                        searchQuery={searchQuery}
                        onClick={handleFileClick}
                        onDoubleClick={handleFileDoubleClick}
                        onContextMenu={handleContextMenuProxy}
                        onToggle={onToggle}
                        onRename={onRename}
                        onRenameCancel={onRenameCancel}
                        onDragStart={onDragStart}
                    />
                ))
            ) : (
                <div className="file-tree__empty">
                    <span className="file-tree__empty-icon">📁</span>
                    <span className="file-tree__empty-text">{t('file.empty_folder')}</span>
                </div>
            )}
        </div>
    );
}
