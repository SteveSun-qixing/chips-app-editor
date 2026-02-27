import React, { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChipsButton } from '@chips/component-library';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';
import { t } from '@/services/i18n-service';
import './CardWindowBase.css';

export interface CardWindowBaseProps {
  /** 窗口配置 */
  config: CardWindowConfig;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可缩放 */
  resizable?: boolean;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 子元素 */
  children?: React.ReactNode;
  /** 标题栏内容 */
  header?: React.ReactNode;
  /** 操作按钮区域 */
  actions?: React.ReactNode;
  /** 位置更新回调 */
  onUpdatePosition?: (position: WindowPosition) => void;
  /** 大小更新回调 */
  onUpdateSize?: (size: WindowSize) => void;
  /** 窗口聚焦回调 */
  onFocus?: () => void;
  /** 窗口关闭回调 */
  onClose?: () => void;
  /** 窗口最小化回调 */
  onMinimize?: () => void;
  /** 窗口收起/展开回调 */
  onCollapse?: () => void;
}

export interface CardWindowBaseRef {
  isDragging: boolean;
  isResizing: boolean;
}

export const CardWindowBase = forwardRef<CardWindowBaseRef, CardWindowBaseProps>(({
  config,
  draggable = true,
  resizable = true,
  minWidth = 200,
  minHeight = 100,
  children,
  header,
  actions,
  onUpdatePosition,
  onUpdateSize,
  onFocus,
  onClose,
  onMinimize,
  onCollapse,
}, ref) => {
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  // 缩放状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    isDragging,
    isResizing,
  }));

  // 清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  /**
   * 计算窗口样式（复合卡片窗口）
   * - normal（展开）: 自适应内容高度
   * - collapsed（收起）: 固定 9:16 竖直比例
   */
  const windowStyle = useMemo(() => {
    const width = config.size.width;
    // 收起状态使用 9:16 比例计算高度（竖直卡片）
    const collapsedHeight = Math.round(width * 16 / 9);

    return {
      transform: `translate(${config.position.x}px, ${config.position.y}px)`,
      width: `${width}px`,
      // 展开状态自适应内容，收起状态固定 9:16 比例
      height: config.state === 'collapsed' ? `${collapsedHeight}px` : 'auto',
      zIndex: config.zIndex,
    };
  }, [config.position.x, config.position.y, config.size.width, config.state, config.zIndex]);

  /**
   * 窗口类名计算
   */
  const windowClass = useMemo(() => {
    const classes: string[] = ['card-window-base'];

    if (isDragging) classes.push('card-window-base--dragging');
    if (isResizing) classes.push('card-window-base--resizing');
    if (config.state === 'minimized') classes.push('card-window-base--minimized');
    if (config.state === 'collapsed') classes.push('card-window-base--collapsed');
    if (config.state === 'normal') classes.push('card-window-base--normal');
    classes.push('card-window-base--focused');

    return classes.join(' ');
  }, [isDragging, isResizing, config.state]);

  // 拖拽处理函数
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // 卡片窗口不涉及缩放比例，保持简单
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    onUpdatePosition?.({
      x: initialPosition.x + deltaX,
      y: initialPosition.y + deltaY,
    });
  }, [isDragging, dragStart, initialPosition, onUpdatePosition]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 忽略来自按钮的点击
    if ((e.target as HTMLElement).closest('.card-window-base__action')) {
      return;
    }

    if (!draggable) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ ...config.position });

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    e.preventDefault();
  }, [draggable, config.position, handleDragMove, handleDragEnd]);

  // 缩放处理函数
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStart.x;

    // 卡片窗口只调整宽度
    onUpdateSize?.({
      width: Math.max(minWidth, initialSize.width + deltaX),
      height: config.size.height, // 保持原高度（实际由内容决定）
    });
  }, [isResizing, resizeStart, minWidth, initialSize, config.size.height, onUpdateSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!resizable) return;

    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ ...config.size });

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    e.preventDefault();
  }, [resizable, config.size, handleResizeMove, handleResizeEnd]);

  // 事件处理
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    onMinimize?.();
  }, [onMinimize]);

  const handleCollapse = useCallback(() => {
    onCollapse?.();
  }, [onCollapse]);

  // 渲染默认操作按钮
  const renderDefaultActions = () => {
    if (actions) return actions;

    return (
      <>
        {config.minimizable !== false && (
          <ChipsButton
            className="card-window-base__action card-window-base__action--minimize"
            htmlType="button"
            variant="text"
            aria-label={t('window.minimize')}
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
          >
            <span className="card-window-base__action-icon">−</span>
          </ChipsButton>
        )}
        <ChipsButton
          className="card-window-base__action card-window-base__action--collapse"
          htmlType="button"
          variant="text"
          aria-label={config.state === 'collapsed' ? t('window.expand') : t('window.collapse')}
          onClick={(e) => {
            e.stopPropagation();
            handleCollapse();
          }}
        >
          <span className="card-window-base__action-icon">{config.state === 'collapsed' ? '▽' : '△'}</span>
        </ChipsButton>
        {config.closable !== false && (
          <ChipsButton
            className="card-window-base__action card-window-base__action--close"
            htmlType="button"
            variant="text"
            aria-label={t('window.close')}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <span className="card-window-base__action-icon">×</span>
          </ChipsButton>
        )}
      </>
    );
  };

  return (
    <div
      className={windowClass}
      style={windowStyle}
      onMouseDown={handleFocus}
    >
      {/* 标题栏 */}
      <div
        className="card-window-base__header"
        onMouseDown={handleDragStart}
      >
        {header ? header : (
          <span className="card-window-base__title">{config.title}</span>
        )}

        <div className="card-window-base__actions">
          {renderDefaultActions()}
        </div>
      </div>

      {/* 内容区 */}
      <div className="card-window-base__content">
        {children}
      </div>

      {/* 缩放手柄（仅水平方向） */}
      {resizable && (
        <div
          className="card-window-base__resize-handle"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
});

CardWindowBase.displayName = 'CardWindowBase';
