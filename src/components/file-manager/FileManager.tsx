import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChipsButton as Button, ChipsInput as Input, type InputInstance } from '@chips/component-library';
import { FileTree } from './FileTree';
import { ContextMenu } from './ContextMenu';
import {
    type FileInfo,
    type ClipboardData,
    getFileService,
} from '@/core/file-service';
import { useWorkspaceService, type WorkspaceFile } from '@/core/workspace-service';
import { resourceService } from '@/services/resource-service';
import { invokeEditorRuntime } from '@/services/editor-runtime-gateway';
import { createEventEmitter } from '@/core/event-manager';
import { t } from '@/services/i18n-service';
import { useGlobalDragCreate, type DragData } from '@/components/card-box-library';

export interface FileManagerProps {
    workingDirectory?: string;
    onOpenFile?: (file: FileInfo) => void;
    onCreateCard?: (file: FileInfo) => void;
    onCreateBox?: (file: FileInfo) => void;
}

const events = createEventEmitter();
const fileService = getFileService(events);

function convertWorkspaceFileToFileInfo(wsFile: WorkspaceFile): FileInfo {
    const baseFile: FileInfo = {
        id: wsFile.id,
        name: wsFile.name,
        path: wsFile.path,
        type: wsFile.type === 'folder' ? 'folder' : wsFile.type,
        size: 0,
        createdAt: wsFile.createdAt,
        modifiedAt: wsFile.modifiedAt,
        isDirectory: wsFile.type === 'folder',
    };

    if (wsFile.children && wsFile.children.length > 0) {
        baseFile.children = wsFile.children.map(convertWorkspaceFileToFileInfo);
    }

    if (wsFile.expanded !== undefined) {
        baseFile.expanded = wsFile.expanded;
    }

    return baseFile;
}

function flattenAllFiles(fileList: FileInfo[]): FileInfo[] {
    const result: FileInfo[] = [];
    const flatten = (list: FileInfo[]): void => {
        for (const file of list) {
            result.push(file);
            if (file.children) {
                flatten(file.children);
            }
        }
    };
    flatten(fileList);
    return result;
}

export function FileManager(props: FileManagerProps) {
    const { workingDirectory = resourceService.workspaceRoot, onOpenFile, onCreateCard, onCreateBox } = props;

    const workspaceService = useWorkspaceService();
    const dragCreate = useGlobalDragCreate();

    const [files, setFiles] = useState<FileInfo[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FileInfo[]>([]);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
    const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

    const searchInputRef = useRef<InputInstance | null>(null);

    const isSearching = searchQuery.trim().length > 0;
    const displayFiles = isSearching ? searchResults : files;
    const hasClipboard = clipboard !== null && clipboard.files.length > 0;

    const selectedFiles = useMemo(() => {
        return files.length > 0
            ? flattenAllFiles(files).filter((f) => selectedPaths.includes(f.path))
            : [];
    }, [files, selectedPaths]);

    const loadFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!workspaceService.isInitialized) {
                await workspaceService.initialize();
            }

            const wsFiles = workspaceService.files;
            const newFiles = wsFiles.map(convertWorkspaceFileToFileInfo);
            setFiles(newFiles);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceService]);

    // To simulate reactivity missing from the removed Vue refs, poll or rely on actions
    // The eventEmitter would be ideal to listen to actual file changes if configured.
    useEffect(() => {
        loadFiles();

        // We will poll every 5s just in case files change externally or we missed an event
        const interval = setInterval(() => {
            loadFiles();
        }, 5000);
        return () => clearInterval(interval);
    }, [loadFiles]);

    const handleSelect = useCallback((paths: string[], clickedFiles: FileInfo[]) => {
        setSelectedPaths(paths);
    }, []);

    const handleOpen = useCallback((file: FileInfo) => {
        onOpenFile?.(file);
    }, [onOpenFile]);

    const handleContextMenu = useCallback((file: FileInfo, event: React.MouseEvent) => {
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu((prev) => ({ ...prev, visible: false }));
    }, []);

    const handleToggle = useCallback(async (file: FileInfo) => {
        await fileService.toggleFolderExpanded(file.path);
        const newFiles = await fileService.getFileTree();
        setFiles(newFiles);
    }, []);

    const handleRename = useCallback(async (file: FileInfo, newName: string) => {
        const result = await fileService.renameFile(file.path, newName);
        if (result.success) {
            await loadFiles();
            setRenamingPath(null);
        } else {
            console.error('Rename failed:', result.error);
        }
    }, [loadFiles]);

    const handleRenameCancel = useCallback(() => {
        setRenamingPath(null);
    }, []);

    useEffect(() => {
        const doSearch = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            const results = await fileService.searchFiles(searchQuery);
            setSearchResults(results);
        };
        doSearch();
    }, [searchQuery]);

    const handleFileDragStart = useCallback((file: FileInfo, event: React.DragEvent) => {
        if (file.type !== 'card' && file.type !== 'box') {
            return;
        }
        const dragData: DragData = {
            type: 'workspace-file',
            fileId: file.id,
            fileType: file.type,
            filePath: file.path,
            name: file.name,
        };
        dragCreate.startDrag(dragData, event.nativeEvent);
    }, [dragCreate]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
    }, []);

    const toggleSearch = useCallback(() => {
        setIsSearchExpanded((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
            } else {
                clearSearch();
            }
            return next;
        });
    }, [clearSearch]);

    const closeSearch = useCallback(() => {
        setIsSearchExpanded((prev) => {
            if (prev) {
                clearSearch();
            }
            return false;
        });
    }, [clearSearch]);

    const handleContextMenuAction = useCallback(async (actionId: string, targetFiles: FileInfo[]) => {
        const targetPath = targetFiles[0]?.isDirectory
            ? targetFiles[0].path
            : fileService.getWorkingDirectory();

        switch (actionId) {
            case 'new-card': {
                const result = await fileService.createCard({
                    name: 'file.untitled_card',
                    parentPath: targetPath,
                });
                if (result.success && result.file) {
                    await loadFiles();
                    setRenamingPath(result.file.path);
                    onCreateCard?.(result.file);
                }
                break;
            }
            case 'new-box': {
                const result = await fileService.createBox({
                    name: 'file.untitled_box',
                    parentPath: targetPath,
                });
                if (result.success && result.file) {
                    await loadFiles();
                    setRenamingPath(result.file.path);
                    onCreateBox?.(result.file);
                }
                break;
            }
            case 'open':
                if (targetFiles[0]) {
                    handleOpen(targetFiles[0]);
                }
                break;
            case 'cut':
                fileService.cutToClipboard(targetFiles.map((f) => f.path));
                setClipboard(fileService.getClipboard());
                break;
            case 'copy':
                fileService.copyToClipboard(targetFiles.map((f) => f.path));
                setClipboard(fileService.getClipboard());
                break;
            case 'paste':
                await fileService.paste(targetPath);
                setClipboard(fileService.getClipboard());
                await loadFiles();
                break;
            case 'rename':
                if (targetFiles[0]) {
                    setRenamingPath(targetFiles[0].path);
                }
                break;
            case 'delete':
                for (const file of targetFiles) {
                    await fileService.deleteFile(file.path);
                }
                setSelectedPaths([]);
                await loadFiles();
                break;
            case 'reveal':
                if (targetFiles[0]) {
                    try {
                        await invokeEditorRuntime('platform', 'showInFileManager', {
                            path: targetFiles[0].path,
                        });
                    } catch (error) {
                        console.error('Failed to reveal file in manager:', error);
                    }
                }
                break;
        }
    }, [loadFiles, handleOpen, onCreateCard, onCreateBox]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (renamingPath) return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? event.metaKey : event.ctrlKey;

            switch (event.key) {
                case 'Delete':
                case 'Backspace':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        handleContextMenuAction('delete', selectedFiles);
                    }
                    break;
                case 'F2':
                    if (selectedFiles.length === 1) {
                        event.preventDefault();
                        const [selectedFile] = selectedFiles;
                        if (selectedFile) {
                            setRenamingPath(selectedFile.path);
                        }
                    }
                    break;
                case 'c':
                    if (modKey && selectedFiles.length > 0) {
                        event.preventDefault();
                        handleContextMenuAction('copy', selectedFiles);
                    }
                    break;
                case 'x':
                    if (modKey && selectedFiles.length > 0) {
                        event.preventDefault();
                        handleContextMenuAction('cut', selectedFiles);
                    }
                    break;
                case 'v':
                    if (modKey && hasClipboard) {
                        event.preventDefault();
                        handleContextMenuAction('paste', selectedFiles);
                    }
                    break;
                case 'f':
                    if (modKey) {
                        event.preventDefault();
                        if (!isSearchExpanded) {
                            toggleSearch();
                        } else {
                            searchInputRef.current?.focus();
                        }
                    }
                    break;
                case 'Enter':
                    if (selectedFiles.length === 1) {
                        const [file] = selectedFiles;
                        if (!file) break;
                        if (file.isDirectory) {
                            handleToggle(file);
                        } else {
                            handleOpen(file);
                        }
                    }
                    break;
                case 'Escape':
                    if (isSearchExpanded) {
                        closeSearch();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [renamingPath, selectedFiles, hasClipboard, isSearchExpanded, handleContextMenuAction, toggleSearch, handleToggle, handleOpen, closeSearch]);

    return (
        <div className="file-manager">
            {/* 工具栏 */}
            <div className="file-manager__toolbar">
                <div className="file-manager__toolbar-left">
                    <Button
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_card')}
                        htmlType="button"
                        type="text"
                        onClick={() => handleContextMenuAction('new-card', [])}
                    >
                        🃏
                    </Button>
                    <Button
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_box')}
                        htmlType="button"
                        type="text"
                        onClick={() => handleContextMenuAction('new-box', [])}
                    >
                        📦
                    </Button>
                </div>

                {/* 搜索按钮 */}
                <Button
                    className="file-manager__btn file-manager__btn--icon"
                    title={t('file_manager.search_placeholder')}
                    htmlType="button"
                    type="text"
                    onClick={toggleSearch}
                >
                    🔍
                </Button>
            </div>

            {/* 搜索框（单独一行） */}
            {isSearchExpanded && (
                <div className="file-manager__search-row">
                    <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="file-manager__search-input"
                        placeholder={t('file_manager.search_placeholder')}
                        clearable
                        onClear={clearSearch}
                        prefix={<span>🔍</span>}
                    />
                    <Button
                        className="file-manager__search-close"
                        htmlType="button"
                        type="text"
                        title="关闭搜索"
                        onClick={closeSearch}
                    >
                        ✕
                    </Button>
                </div>
            )}

            {/* 文件树 */}
            <div className="file-manager__content">
                {isLoading ? (
                    <div className="file-manager__loading">
                        <span className="file-manager__loading-spinner">⏳</span>
                        <span>{t('file_manager.loading')}</span>
                    </div>
                ) : displayFiles.length === 0 && !isSearching ? (
                    <div className="file-manager__empty">
                        <span className="file-manager__empty-icon">📂</span>
                        <span className="file-manager__empty-title">{t('file_manager.empty_title')}</span>
                        <span className="file-manager__empty-hint">
                            {t('file_manager.empty_hint_line1')}<br />
                            {t('file_manager.empty_hint_line2')}
                        </span>
                        <div className="file-manager__empty-actions">
                            <Button
                                className="file-manager__empty-btn"
                                htmlType="button"
                                type="text"
                                onClick={() => handleContextMenuAction('open-file', [])}
                            >
                                📄 {t('file_manager.open_file')}
                            </Button>
                            <Button
                                className="file-manager__empty-btn"
                                htmlType="button"
                                type="text"
                                onClick={() => handleContextMenuAction('open-folder', [])}
                            >
                                📁 {t('file_manager.open_folder')}
                            </Button>
                        </div>
                    </div>
                ) : displayFiles.length === 0 && isSearching ? (
                    <div className="file-manager__empty">
                        <span className="file-manager__empty-icon">🔍</span>
                        <span className="file-manager__empty-title">{t('file_manager.search_empty_title')}</span>
                        <Button className="file-manager__empty-btn" htmlType="button" type="text" onClick={clearSearch}>
                            {t('file_manager.clear_search')}
                        </Button>
                    </div>
                ) : (
                    <FileTree
                        files={displayFiles}
                        selectedPaths={selectedPaths}
                        renamingPath={renamingPath}
                        searchQuery={searchQuery}
                        multiSelect={true}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onContextMenu={handleContextMenu}
                        onToggle={handleToggle}
                        onRename={handleRename}
                        onRenameCancel={handleRenameCancel}
                        onDragStart={handleFileDragStart}
                    />
                )}
            </div>

            {/* 状态栏 */}
            <div className="file-manager__statusbar">
                {isSearching ? (
                    <>
                        <span>{t('file_manager.search_results')}</span>
                        <span className="file-manager__statusbar-count">{searchResults.length}</span>
                    </>
                ) : selectedPaths.length > 0 ? (
                    <>
                        <span>{t('file_manager.selected_count')}</span>
                        <span className="file-manager__statusbar-count">{selectedPaths.length}</span>
                    </>
                ) : (
                    <>
                        <span>{t('file_manager.total_items')}</span>
                        <span className="file-manager__statusbar-count">{flattenAllFiles(files).length}</span>
                    </>
                )}
            </div>

            {/* 上下文菜单 */}
            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                selectedFiles={selectedFiles}
                hasClipboard={hasClipboard}
                onClose={closeContextMenu}
                onAction={handleContextMenuAction}
            />
        </div>
    );
}
