import React, { useState, useCallback, useMemo } from 'react';
import { useFileDrop, type FileDragData, type FileDropType } from '@/core';
import { t } from '@/services/i18n-service';
import './FileDropZone.css';

export interface FileDropZoneProps {
    /** 是否禁用 */
    disabled?: boolean;
    /** 接受的文件类型 */
    acceptTypes?: FileDropType[];
    /** 是否全屏覆盖模式 */
    overlay?: boolean;
    /** 提示内容 */
    hint?: React.ReactNode;
    /** 子节点 */
    children?: React.ReactNode;
    /** 文件放置事件 */
    onDrop?: (data: FileDragData) => void;
    /** 拖入状态变化 */
    onDragStateChange?: (isDragOver: boolean) => void;
}

export function FileDropZone(props: FileDropZoneProps) {
    const {
        disabled = false,
        acceptTypes,
        overlay = false,
        hint,
        children,
        onDrop,
        onDragStateChange,
    } = props;

    const { isFileDragOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useFileDrop();

    const [localDragOver, setLocalDragOver] = useState(false);

    const isDragOverActive = useMemo(() => {
        return !disabled && (localDragOver || isFileDragOver);
    }, [disabled, localDragOver, isFileDragOver]);

    const isAcceptedType = useCallback((types: FileDropType[]) => {
        if (!acceptTypes) return true;
        return types.some((t) => acceptTypes.includes(t));
    }, [acceptTypes]);

    const onDragEnter = useCallback((event: React.DragEvent) => {
        if (disabled) return;
        handleDragEnter(event.nativeEvent);
        setLocalDragOver(true);
        onDragStateChange?.(true);
    }, [disabled, handleDragEnter, onDragStateChange]);

    const onDragOverDesktop = useCallback((event: React.DragEvent) => {
        if (disabled) return;
        handleDragOver(event.nativeEvent);
    }, [disabled, handleDragOver]);

    const onDragLeaveDesktop = useCallback((event: React.DragEvent) => {
        handleDragLeave(event.nativeEvent);
        setLocalDragOver(false);
        onDragStateChange?.(false);
    }, [handleDragLeave, onDragStateChange]);

    const onDropDesktop = useCallback((event: React.DragEvent) => {
        if (disabled) return;

        const data = handleDrop(event.nativeEvent);
        setLocalDragOver(false);
        onDragStateChange?.(false);

        if (!data) return;

        if (!isAcceptedType(data.types)) {
            console.warn('File types not accepted:', data.types);
            return;
        }

        onDrop?.(data);
    }, [disabled, handleDrop, onDragStateChange, isAcceptedType, onDrop]);

    return (
        <div
            className={`file-drop-zone ${isDragOverActive ? 'file-drop-zone--active' : ''} ${disabled ? 'file-drop-zone--disabled' : ''} ${overlay ? 'file-drop-zone--overlay' : ''}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOverDesktop}
            onDragLeave={onDragLeaveDesktop}
            onDrop={onDropDesktop}
        >
            {children}

            {/* 拖入提示覆盖层 */}
            {isDragOverActive && (
                <div className="file-drop-zone__overlay">
                    <div className="file-drop-zone__indicator">
                        <span className="file-drop-zone__icon">📁</span>
                        <span className="file-drop-zone__text">
                            {hint || t('drag_drop.drop_files')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
