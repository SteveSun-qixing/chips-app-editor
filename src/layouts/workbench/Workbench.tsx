import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SidePanel } from './SidePanel';
import { MainArea } from './MainArea';
import { useCardStore, getCardStore, getUIStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import './Workbench.css';

export interface WorkbenchLayoutConfig {
    leftPanelWidth?: number;
    rightPanelWidth?: number;
    leftPanelExpanded?: boolean;
    rightPanelExpanded?: boolean;
    showLeftPanel?: boolean;
    showRightPanel?: boolean;
}

export interface WorkbenchProps {
    config?: WorkbenchLayoutConfig;
    onLayoutChange?: (config: WorkbenchLayoutConfig) => void;
    onTabChange?: (cardId: string) => void;
    onTabClose?: (cardId: string) => void;
    leftPanelSlot?: React.ReactNode;
    fileTreeSlot?: React.ReactNode;
    rightPanelSlot?: React.ReactNode;
    editPanelSlot?: React.ReactNode;
    cardPreviewSlot?: (cardId?: string) => React.ReactNode;
    emptyActionsSlot?: React.ReactNode;
}

export const WorkbenchContext = React.createContext<{
    leftPanelWidth: number;
    rightPanelWidth: number;
    leftPanelExpanded: boolean;
    rightPanelExpanded: boolean;
    toggleLeftPanel: () => void;
    toggleRightPanel: () => void;
    setLayoutConfig: (config: Partial<WorkbenchLayoutConfig>) => void;
    resetLayout: () => void;
} | null>(null);

export function Workbench(props: WorkbenchProps) {
    const {
        config = {},
        onLayoutChange,
        onTabChange,
        onTabClose,
        leftPanelSlot,
        fileTreeSlot,
        rightPanelSlot,
        editPanelSlot,
        cardPreviewSlot,
        emptyActionsSlot,
    } = props;

    // UI and Card Store states for React rendering
    const activeCardId = useCardStore((s) => s.activeCardId);

    const [leftPanelWidth, setLeftPanelWidth] = useState(config.leftPanelWidth ?? 280);
    const [rightPanelWidth, setRightPanelWidth] = useState(config.rightPanelWidth ?? 320);
    const [leftPanelExpanded, setLeftPanelExpanded] = useState(config.leftPanelExpanded ?? true);
    const [rightPanelExpanded, setRightPanelExpanded] = useState(config.rightPanelExpanded ?? true);
    const [showLeftPanel, setShowLeftPanel] = useState(config.showLeftPanel ?? true);
    const [showRightPanel, setShowRightPanel] = useState(config.showRightPanel ?? true);


    const layoutConfig = useMemo((): WorkbenchLayoutConfig => ({
        leftPanelWidth,
        rightPanelWidth,
        leftPanelExpanded,
        rightPanelExpanded,
        showLeftPanel,
        showRightPanel,
    }), [leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, showLeftPanel, showRightPanel]);

    const workbenchStyle = useMemo(() => ({
        '--left-panel-width': `${leftPanelExpanded ? leftPanelWidth : 40}px`,
        '--right-panel-width': `${rightPanelExpanded ? rightPanelWidth : 40}px`,
    } as React.CSSProperties), [leftPanelExpanded, leftPanelWidth, rightPanelExpanded, rightPanelWidth]);

    const emitLayoutChange = useCallback(() => {
        onLayoutChange?.(layoutConfig);
    }, [layoutConfig, onLayoutChange]);

    const handleLeftPanelWidthChange = useCallback((width: number) => {
        setLeftPanelWidth(width);
    }, []);

    const handleRightPanelWidthChange = useCallback((width: number) => {
        setRightPanelWidth(width);
    }, []);

    const handleLeftPanelExpandedChange = useCallback((expanded: boolean) => {
        setLeftPanelExpanded(expanded);
    }, []);

    const handleRightPanelExpandedChange = useCallback((expanded: boolean) => {
        setRightPanelExpanded(expanded);
    }, []);

    // Sync emitted layout change when states change implicitly
    useEffect(() => {
        emitLayoutChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, showLeftPanel, showRightPanel]);

    const handleTabChange = useCallback((cardId: string) => {
        // Note: React Zustand store updates must not be side effects of render cleanly, ideally done here in response to action.
        // In actual implementation we might directly call cardStore.getState().setActiveCard(cardId);
        getCardStore().setActiveCard(cardId); // Ensure cardStore supports direct calls like this
        onTabChange?.(cardId);
    }, [onTabChange]);

    const handleTabClose = useCallback((cardId: string) => {
        getUIStore().removeWindow(`card-${cardId}`); // Ensure uiStore supports this directly
        onTabClose?.(cardId);
    }, [onTabClose]);

    const toggleLeftPanel = useCallback(() => {
        setLeftPanelExpanded(prev => !prev);
    }, []);

    const toggleRightPanel = useCallback(() => {
        setRightPanelExpanded(prev => !prev);
    }, []);

    const setLayoutConfig = useCallback((newConfig: Partial<WorkbenchLayoutConfig>) => {
        if (newConfig.leftPanelWidth !== undefined) setLeftPanelWidth(newConfig.leftPanelWidth);
        if (newConfig.rightPanelWidth !== undefined) setRightPanelWidth(newConfig.rightPanelWidth);
        if (newConfig.leftPanelExpanded !== undefined) setLeftPanelExpanded(newConfig.leftPanelExpanded);
        if (newConfig.rightPanelExpanded !== undefined) setRightPanelExpanded(newConfig.rightPanelExpanded);
        if (newConfig.showLeftPanel !== undefined) setShowLeftPanel(newConfig.showLeftPanel);
        if (newConfig.showRightPanel !== undefined) setShowRightPanel(newConfig.showRightPanel);
    }, []);

    const resetLayout = useCallback(() => {
        setLeftPanelWidth(280);
        setRightPanelWidth(320);
        setLeftPanelExpanded(true);
        setRightPanelExpanded(true);
        setShowLeftPanel(true);
        setShowRightPanel(true);
    }, []);

    useEffect(() => {
        if (config) {
            setLayoutConfig(config);
        }
    }, [config, setLayoutConfig]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleLeftPanel();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                toggleRightPanel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleLeftPanel, toggleRightPanel]);

    const contextValue = useMemo(() => ({
        leftPanelWidth,
        rightPanelWidth,
        leftPanelExpanded,
        rightPanelExpanded,
        toggleLeftPanel,
        toggleRightPanel,
        setLayoutConfig,
        resetLayout,
    }), [leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, toggleLeftPanel, toggleRightPanel, setLayoutConfig, resetLayout]);

    return (
        <WorkbenchContext.Provider value={contextValue}>
            <div className="workbench" style={workbenchStyle}>
                {/* 左侧面板 */}
                {showLeftPanel && (
                    <SidePanel
                        position="left"
                        width={leftPanelWidth}
                        expanded={leftPanelExpanded}
                        minWidth={180}
                        maxWidth={480}
                        title={t('workbench.left_panel')}
                        onUpdateWidth={handleLeftPanelWidthChange}
                        onUpdateExpanded={handleLeftPanelExpandedChange}
                    >
                        {leftPanelSlot || fileTreeSlot}
                    </SidePanel>
                )}

                {/* 主区域 */}
                <MainArea
                    activeTabId={activeCardId}
                    showTabs={true}
                    emptyText={t('workbench.empty')}
                    emptyIcon="📄"
                    onTabChange={handleTabChange}
                    onTabClose={handleTabClose}
                    tabContentSlot={(tab) => {
                        return cardPreviewSlot ? cardPreviewSlot(tab.id) : null;
                    }}
                    emptyActionsSlot={emptyActionsSlot}
                />

                {/* 右侧面板 */}
                {showRightPanel && (
                    <SidePanel
                        position="right"
                        width={rightPanelWidth}
                        expanded={rightPanelExpanded}
                        minWidth={200}
                        maxWidth={500}
                        title={t('workbench.right_panel')}
                        onUpdateWidth={handleRightPanelWidthChange}
                        onUpdateExpanded={handleRightPanelExpandedChange}
                    >
                        {rightPanelSlot || editPanelSlot}
                    </SidePanel>
                )}
            </div>
        </WorkbenchContext.Provider>
    );
}
