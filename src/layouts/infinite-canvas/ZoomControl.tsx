import React, { useState, useMemo, useCallback } from 'react';
import { ChipsButton as Button, ChipsSelect as Select } from '@chips/component-library';
import { t } from '@/services/i18n-service';
import './ZoomControl.css';

export interface ZoomControlProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onZoomTo?: (value: number) => void;
    onReset?: () => void;
    onFit?: () => void;
}

export function ZoomControl(props: ZoomControlProps) {
    const { zoom, minZoom = 0.1, maxZoom = 5, onZoomIn, onZoomOut, onZoomTo, onReset, onFit } = props;

    const [isExpanded, setIsExpanded] = useState(false);

    const zoomPercent = Math.round(zoom * 100);

    const zoomOptions = useMemo(() => {
        const defaultOptions = [25, 50, 75, 100, 125, 150, 200, 300, 400];
        const options = defaultOptions.map((v) => ({ label: `${v}%`, value: v / 100 }));
        if (!defaultOptions.includes(zoomPercent)) {
            options.push({ label: `${zoomPercent}%`, value: zoom });
            options.sort((a, b) => (a.value as number) - (b.value as number));
        }
        return options;
    }, [zoomPercent, zoom]);

    const canZoomIn = zoom < maxZoom;
    const canZoomOut = zoom > minZoom;

    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onZoomTo?.(Number(e.target.value));
    }, [onZoomTo]);

    const handleSelectChange = useCallback((value: string | number) => {
        onZoomTo?.(Number(value));
    }, [onZoomTo]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (isExpanded) {
            setIsExpanded(false);
        }
    }, [isExpanded]);

    return (
        <div className="zoom-control" onMouseLeave={handleMouseLeave}>
            <Button
                className="zoom-control__button"
                disabled={!canZoomOut}
                title={t('zoom_control.zoom_out')}
                type="text"
                htmlType="button"
                onClick={onZoomOut}
            >−</Button>

            {/* 展开按钮或当前比例（折叠时） */}
            {!isExpanded ? (
                <span
                    className="zoom-control__value-text"
                    title={t('zoom_control.reset')}
                    onClick={onReset}
                >
                    {zoomPercent}%
                </span>
            ) : (
                <Button
                    className={`zoom-control__button zoom-control__more ${isExpanded ? 'zoom-control__more--active' : ''}`}
                    title={t('zoom_control.more')}
                    type="text"
                    htmlType="button"
                    onClick={toggleExpanded}
                >⋯</Button>
            )}

            <Button
                className="zoom-control__button"
                disabled={!canZoomIn}
                title={t('zoom_control.zoom_in')}
                type="text"
                htmlType="button"
                onClick={onZoomIn}
            >+</Button>

            {/* 展开如果没有直接使用 CSSTransition，而是简单渲染 */}
            {isExpanded && (
                <div className="zoom-control__expanded">
                    <div className="zoom-control__value">
                        <Select
                            className="zoom-control__select"
                            value={zoom}
                            options={zoomOptions}
                            onChange={handleSelectChange}
                            size="small"
                        />
                    </div>

                    <div className="zoom-control__slider-container">
                        <input
                            type="range"
                            className="zoom-control__slider"
                            min={minZoom}
                            max={maxZoom}
                            step="0.05"
                            value={zoom}
                            onChange={handleSliderChange}
                            title={t('zoom_control.slide_zoom')}
                        />
                    </div>

                    <Button
                        className="zoom-control__button zoom-control__button--text"
                        title={t('zoom_control.reset')}
                        type="text"
                        htmlType="button"
                        onClick={onReset}
                    >{t('zoom_control.reset_label')}</Button>

                    <div className="zoom-control__divider" />

                    <Button
                        className="zoom-control__button zoom-control__button--text"
                        title={t('zoom_control.fit')}
                        type="text"
                        htmlType="button"
                        onClick={onFit}
                    >{t('zoom_control.fit_label')}</Button>
                </div>
            )}
        </div>
    );
}
