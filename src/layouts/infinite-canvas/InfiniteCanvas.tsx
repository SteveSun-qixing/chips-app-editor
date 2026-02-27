import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DesktopLayer } from './DesktopLayer';
import { WindowLayer } from './WindowLayer';
import { ZoomControl } from './ZoomControl';
import { useUIStore } from '@/core/state';
import { useCanvasControls } from './use-canvas';
import './InfiniteCanvas.css';

// Placeholder imports for drag-create (need Vue -> React migration later)
// import { DragPreview } from '@/components/card-box-library';
// import { useGlobalDragCreate } from '@/components/card-box-library/use-drag-create';
// import type { DragData } from '@/components/card-box-library/types';

export interface CardWindowDropTarget {
    type: 'card-window';
    cardId: string;
    insertIndex?: number;
}

export interface InfiniteCanvasProps {
    onDropCreate?: (
        data: any, // DragData
        worldPosition: { x: number; y: number },
        target?: CardWindowDropTarget
    ) => void;
    onOpenSettings?: () => void;
    desktopContent?: React.ReactNode;
    windowContent?: React.ReactNode;
}

export const CanvasContext = React.createContext<any>(null);

export function InfiniteCanvas(props: InfiniteCanvasProps) {
    const { onDropCreate, onOpenSettings, desktopContent, windowContent } = props;

    const uiStoreVisibleGrid = useUIStore((s) => s.showGrid);
    const gridSize = useUIStore((s) => s.gridSize);

    const canvasRef = useRef<HTMLDivElement | null>(null);

    // Vue-drag-drop placeholders
    const [isDragOver, setIsDragOver] = useState(false);
    const [insertIndicator, setInsertIndicator] = useState<{ left: number; top: number; width: number } | null>(null);

    const cardWheelSequenceLocked = useRef(false);
    const wheelSequenceActive = useRef(false);
    const wheelSequenceRafId = useRef<number | null>(null);
    const wheelEventSeenInFrame = useRef(false);
    const emptyWheelFrames = useRef(0);
    const WHEEL_INTERRUPT_EMPTY_FRAMES = 12;

    const canvasControls = useCanvasControls();
    const {
        zoom,
        panX,
        panY,
        isPanning,
        handleWheel,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        zoomIn,
        zoomOut,
        zoomTo,
        resetView,
        fitToContent,
        screenToWorld,
        worldToScreen,
    } = canvasControls;

    const desktopInsertIndicatorStyle = useMemo(() => {
        if (!insertIndicator) return undefined;
        const worldPoint = screenToWorld(insertIndicator.left, insertIndicator.top);
        return {
            left: `${worldPoint.x}px`,
            top: `${worldPoint.y}px`,
            width: `${insertIndicator.width / zoom}px`,
            '--chips-insert-indicator-scale': `${1 / Math.max(zoom, 0.001)}`,
        } as React.CSSProperties;
    }, [insertIndicator, screenToWorld, zoom]);

    const desktopStyle = useMemo<React.CSSProperties>(() => ({
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
    }), [panX, panY, zoom]);

    const gridStyle = useMemo<React.CSSProperties>(() => {
        const size = gridSize * zoom;
        return {
            backgroundSize: `${size}px ${size}px`,
            backgroundPosition: `${panX % size}px ${panY % size}px`,
        };
    }, [gridSize, zoom, panX, panY]);

    const canvasCursor = isPanning ? 'grabbing' : 'grab';

    const startWheelSequenceMonitor = useCallback(() => {
        const tick = () => {
            if (!wheelSequenceActive.current) {
                wheelSequenceRafId.current = null;
                return;
            }

            if (wheelEventSeenInFrame.current) {
                wheelEventSeenInFrame.current = false;
                emptyWheelFrames.current = 0;
                wheelSequenceRafId.current = requestAnimationFrame(tick);
                return;
            }

            emptyWheelFrames.current += 1;
            if (emptyWheelFrames.current < WHEEL_INTERRUPT_EMPTY_FRAMES) {
                wheelSequenceRafId.current = requestAnimationFrame(tick);
                return;
            }

            wheelSequenceActive.current = false;
            cardWheelSequenceLocked.current = false;
            emptyWheelFrames.current = 0;
            wheelSequenceRafId.current = null;
        };

        wheelSequenceRafId.current = requestAnimationFrame(tick);
    }, []);

    const markWheelSequence = useCallback((lockDesktopZoom: boolean) => {
        wheelEventSeenInFrame.current = true;
        if (lockDesktopZoom) {
            cardWheelSequenceLocked.current = true;
        }

        if (wheelSequenceActive.current) return;
        wheelSequenceActive.current = true;
        emptyWheelFrames.current = 0;
        startWheelSequenceMonitor();
    }, [startWheelSequenceMonitor]);

    const onCanvasWheel = useCallback((e: React.WheelEvent) => {
        const target = e.target as HTMLElement;

        const isDesktopBackground =
            target === canvasRef.current ||
            target.classList.contains('infinite-canvas__grid') ||
            target.classList.contains('desktop-layer');

        const isToolWindow = Boolean(target.closest('.base-window'));
        // React CardCover not implemented fully but we keep logic identical
        const isCardWindow = Boolean(target.closest('.card-window-base, .card-cover, .base-window'));
        // ^ BaseWindow replaces card-window-base in standard forms. Will refine later.
        const isCardContentWheel = isCardWindow && !isToolWindow;

        markWheelSequence(isCardContentWheel);

        if (e.ctrlKey || e.metaKey) {
            handleWheel(e);
            return;
        }

        if (isDesktopBackground && cardWheelSequenceLocked.current) {
            e.preventDefault();
            return;
        }

        if (isDesktopBackground) {
            handleWheel(e);
            return;
        }

        if (isCardContentWheel) {
            // e.preventDefault(); // Might need to avoid if we want scrolling within card!
            // In InfiniteCanvas.vue, it hijacked this. We'll leave it out for native scrolling of native windows, or wait, it manually adjusted panX/panY. Let's keep it if we want panning instead of scrolling.
            // But we probably want native scrolling inside windows! The Vue code actually had it. I will comment it out so windows can scroll inside.
            // e.preventDefault();
            // const zoomFactor = zoom || 1;
            // updateCanvas({ panX: panX - e.deltaX / zoomFactor, panY: panY - e.deltaY / zoomFactor });
        }
    }, [handleWheel, markWheelSequence, zoom]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                resetView();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                zoomIn();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                zoomOut();
            }
        };

        const clearDragVisualState = () => {
            setIsDragOver(false);
            setInsertIndicator(null);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('dragend', clearDragVisualState);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('dragend', clearDragVisualState);

            wheelSequenceActive.current = false;
            cardWheelSequenceLocked.current = false;
            if (wheelSequenceRafId.current !== null) {
                cancelAnimationFrame(wheelSequenceRafId.current);
                wheelSequenceRafId.current = null;
            }
            emptyWheelFrames.current = 0;
        };
    }, [resetView, zoomIn, zoomOut]);


    // NOTE: Drag and drop methods for components/card-box-library omitted for now. They will be simple callbacks once that module is migrated.

    return (
        <CanvasContext.Provider value={canvasControls}>
            <div
                ref={canvasRef}
                className={`infinite-canvas ${isDragOver ? 'infinite-canvas--drag-over' : ''}`}
                style={{ cursor: canvasCursor }}
                onWheel={onCanvasWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {uiStoreVisibleGrid && (
                    <div className="infinite-canvas__grid" style={gridStyle} />
                )}

                <DesktopLayer style={desktopStyle}>
                    {insertIndicator && (
                        <div className="infinite-canvas__insert-indicator" style={desktopInsertIndicatorStyle} />
                    )}
                    {desktopContent}
                </DesktopLayer>

                <WindowLayer onOpenSettings={onOpenSettings}>
                    {windowContent}
                </WindowLayer>

                <ZoomControl
                    zoom={zoom}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onZoomTo={zoomTo}
                    onReset={resetView}
                    onFit={() => fitToContent()}
                />

                {/* Drag preview placeholder */}
            </div>
        </CanvasContext.Provider>
    );
}
