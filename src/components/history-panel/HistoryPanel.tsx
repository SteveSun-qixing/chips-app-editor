import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChipsButton as Button } from '@chips/component-library';
import { useCommandManager, type CommandHistory } from '@/core/command-manager';
import { useEditorStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import './HistoryPanel.css';

/** 组件属性 */
export interface HistoryPanelProps {
    /** 最大显示数量 */
    maxItems?: number;
    /** 是否显示时间 */
    showTime?: boolean;
    /** 是否紧凑模式 */
    compact?: boolean;
    /** 跳转到历史记录 */
    onGoto?: (historyId: string) => void;
    /** 撤销操作 */
    onUndo?: () => void;
    /** 重做操作 */
    onRedo?: () => void;
}

export function HistoryPanel(props: HistoryPanelProps) {
    const {
        maxItems = 50,
        showTime = true,
        compact = false,
        onGoto,
        onUndo,
        onRedo,
    } = props;

    const commandManager = useCommandManager();
    const editorStore = useEditorStore((state) => state);

    const [undoHistory, setUndoHistory] = useState<CommandHistory[]>([]);
    const [redoHistory, setRedoHistory] = useState<CommandHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const currentIndex = useMemo(() => (undoHistory.length > 0 ? undoHistory.length - 1 : -1), [undoHistory]);
    const canUndo = useMemo(() => commandManager.canUndo(), [commandManager, undoHistory]);
    const canRedo = useMemo(() => commandManager.canRedo(), [commandManager, redoHistory]);

    const displayHistory = useMemo(() => {
        // 合并历史记录：重做记录（未来）+ 撤销记录（过去）
        const redo = redoHistory.map((h, i) => ({
            ...h,
            type: 'redo' as const,
            index: i,
        }));

        const undo = undoHistory.map((h, i) => ({
            ...h,
            type: 'undo' as const,
            index: i,
        }));

        return [...redo.reverse(), ...undo].slice(0, maxItems);
    }, [undoHistory, redoHistory, maxItems]);

    const formatTime = useCallback((timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString(editorStore.locale || undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }, [editorStore.locale]);

    const formatRelativeTime = useCallback((timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) {
            return t('history_panel.just_now');
        } else if (diff < 3600000) {
            return t('history_panel.minutes_ago', { count: Math.floor(diff / 60000) });
        } else if (diff < 86400000) {
            return t('history_panel.hours_ago', { count: Math.floor(diff / 3600000) });
        } else {
            return formatTime(timestamp);
        }
    }, [formatTime]);

    const getDescription = useCallback((key: string): string => {
        const descriptions: Record<string, string> = {
            'command.add_base_card': 'history_panel.command_add_base_card',
            'command.remove_base_card': 'history_panel.command_remove_base_card',
            'command.move_base_card': 'history_panel.command_move_base_card',
            'command.update_base_card_config': 'history_panel.command_update_base_card_config',
            'command.batch_operation': 'history_panel.command_batch_operation',
            'command.create_window': 'history_panel.command_create_window',
            'command.close_window': 'history_panel.command_close_window',
            'command.move_window': 'history_panel.command_move_window',
            'command.resize_window': 'history_panel.command_resize_window',
            'command.set_window_state': 'history_panel.command_set_window_state',
            'command.batch_window_operation': 'history_panel.command_batch_window_operation',
        };

        const translationKey = descriptions[key];
        return translationKey ? t(translationKey) : key;
    }, []);

    const updateHistory = useCallback(() => {
        setUndoHistory(commandManager.getHistory(maxItems));
        setRedoHistory(commandManager.getRedoHistory());
    }, [commandManager, maxItems]);

    const handleUndo = useCallback(async () => {
        if (!commandManager.canUndo() || isLoading) return;

        setIsLoading(true);
        try {
            await commandManager.undo();
            onUndo?.();
        } finally {
            setIsLoading(false);
            updateHistory();
        }
    }, [commandManager, isLoading, onUndo, updateHistory]);

    const handleRedo = useCallback(async () => {
        if (!commandManager.canRedo() || isLoading) return;

        setIsLoading(true);
        try {
            await commandManager.redo();
            onRedo?.();
        } finally {
            setIsLoading(false);
            updateHistory();
        }
    }, [commandManager, isLoading, onRedo, updateHistory]);

    const handleGoto = useCallback(async (historyId: string) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            await commandManager.goToHistory(historyId);
            onGoto?.(historyId);
        } finally {
            setIsLoading(false);
            updateHistory();
        }
    }, [commandManager, isLoading, onGoto, updateHistory]);

    const handleClear = useCallback(() => {
        commandManager.clear();
        updateHistory();
    }, [commandManager, updateHistory]);

    useEffect(() => {
        updateHistory();

        const handleStateChange = () => {
            updateHistory();
        };

        commandManager.on('state:changed', handleStateChange);
        commandManager.on('command:executed', handleStateChange);
        commandManager.on('command:undone', handleStateChange);
        commandManager.on('command:redone', handleStateChange);
        commandManager.on('history:cleared', handleStateChange);

        return () => {
            commandManager.off('state:changed', handleStateChange);
            commandManager.off('command:executed', handleStateChange);
            commandManager.off('command:undone', handleStateChange);
            commandManager.off('command:redone', handleStateChange);
            commandManager.off('history:cleared', handleStateChange);
        };
    }, [commandManager, updateHistory]);

    return (
        <div className={`history-panel ${compact ? 'compact' : ''}`}>
            {/* 工具栏 */}
            <div className="history-toolbar">
                <Button
                    className="history-btn"
                    disabled={!canUndo || isLoading}
                    title={t('history_panel.undo_title')}
                    htmlType="button"
                    type="text"
                    onClick={handleUndo}
                >
                    <span className="history-btn-icon">↶</span>
                    {!compact && <span className="history-btn-text">{t('history_panel.undo')}</span>}
                </Button>

                <Button
                    className="history-btn"
                    disabled={!canRedo || isLoading}
                    title={t('history_panel.redo_title')}
                    htmlType="button"
                    type="text"
                    onClick={handleRedo}
                >
                    <span className="history-btn-icon">↷</span>
                    {!compact && <span className="history-btn-text">{t('history_panel.redo')}</span>}
                </Button>

                <div className="history-toolbar-spacer"></div>

                <Button
                    className="history-btn history-btn-clear"
                    disabled={displayHistory.length === 0}
                    title={t('history_panel.clear')}
                    htmlType="button"
                    type="text"
                    onClick={handleClear}
                >
                    <span className="history-btn-icon">🗑</span>
                </Button>
            </div>

            {/* 历史列表 */}
            {displayHistory.length > 0 ? (
                <div className="history-list">
                    {displayHistory.map((item) => (
                        <div
                            key={item.id}
                            className={`history-item ${item.type === 'undo' && item.index === currentIndex ? 'history-item--current' : ''} ${item.type === 'redo' ? 'history-item--redo' : ''} ${item.type === 'undo' ? 'history-item--undo' : ''}`}
                            onClick={() => handleGoto(item.id)}
                        >
                            <div className="history-item-indicator">
                                {item.type === 'undo' && item.index === currentIndex ? (
                                    <span className="current-marker">●</span>
                                ) : (
                                    <span className="history-marker">○</span>
                                )}
                            </div>

                            <div className="history-item-content">
                                <div className="history-item-description">
                                    {getDescription(item.description)}
                                </div>
                                {showTime && !compact && (
                                    <div className="history-item-time">
                                        {formatRelativeTime(item.timestamp)}
                                    </div>
                                )}
                            </div>

                            {item.type === 'redo' && (
                                <div className="history-item-badge">
                                    {t('history_panel.badge_redo')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* 空状态 */
                <div className="history-empty">
                    <div className="history-empty-icon">📋</div>
                    <div className="history-empty-text">{t('history_panel.empty')}</div>
                </div>
            )}

            {/* 状态栏 */}
            <div className="history-status">
                <span>{t('history_panel.status_undo')}: {undoHistory.length}</span>
                <span className="history-status-divider">|</span>
                <span>{t('history_panel.status_redo')}: {redoHistory.length}</span>
            </div>
        </div>
    );
}
