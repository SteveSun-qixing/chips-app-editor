/**
 * 工作台布局控制 Hook
 * @module layouts/workbench/use-workbench
 * @description 提供工作台布局的响应式控制和状态管理 (React版本)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { getUIStore } from '@/core/state';

export interface WorkbenchOptions {
  leftPanelWidth?: number;
  rightPanelWidth?: number;
  leftPanelMinWidth?: number;
  leftPanelMaxWidth?: number;
  rightPanelMinWidth?: number;
  rightPanelMaxWidth?: number;
  leftPanelExpanded?: boolean;
  rightPanelExpanded?: boolean;
  persistLayout?: boolean;
  storageKey?: string;
}

export interface WorkbenchState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelExpanded: boolean;
  rightPanelExpanded: boolean;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  isResizing: boolean;
}

export interface WorkbenchControlsReturn {
  state: WorkbenchState;
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelExpanded: boolean;
  rightPanelExpanded: boolean;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  isResizing: boolean;
  mainAreaWidth: number;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  expandLeftPanel: () => void;
  collapseLeftPanel: () => void;
  expandRightPanel: () => void;
  collapseRightPanel: () => void;
  showLeft: () => void;
  hideLeft: () => void;
  showRight: () => void;
  hideRight: () => void;
  resetLayout: () => void;
  saveLayout: () => void;
  loadLayout: () => void;
  setResizing: (resizing: boolean) => void;
}

const DEFAULT_OPTIONS: Required<WorkbenchOptions> = {
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  leftPanelMinWidth: 180,
  leftPanelMaxWidth: 480,
  rightPanelMinWidth: 200,
  rightPanelMaxWidth: 500,
  leftPanelExpanded: true,
  rightPanelExpanded: true,
  persistLayout: false,
  storageKey: 'chips-workbench-layout',
};

export function useWorkbenchControls(
  options: WorkbenchOptions = {}
): WorkbenchControlsReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const uiStore = getUIStore();

  const [leftPanelWidth, setLeftPanelWidthState] = useState(opts.leftPanelWidth);
  const [rightPanelWidth, setRightPanelWidthState] = useState(opts.rightPanelWidth);
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(opts.leftPanelExpanded);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(opts.rightPanelExpanded);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isResizing, setIsResizing] = useState(false);

  // Since mainAreaWidth depends on window size, we might need to listen to resize if we want it fully reactive,
  // but let's keep it simple as in Vue version (which only reactive to its own states unless computed triggers it).
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainAreaWidth = useMemo(() => {
    const totalWidth = windowWidth;
    const leftWidth = showLeftPanel ? (leftPanelExpanded ? leftPanelWidth : 40) : 0;
    const rightWidth = showRightPanel ? (rightPanelExpanded ? rightPanelWidth : 40) : 0;
    return Math.max(300, totalWidth - leftWidth - rightWidth);
  }, [windowWidth, showLeftPanel, leftPanelExpanded, leftPanelWidth, showRightPanel, rightPanelExpanded, rightPanelWidth]);

  const state = useMemo<WorkbenchState>(() => ({
    leftPanelWidth,
    rightPanelWidth,
    leftPanelExpanded,
    rightPanelExpanded,
    showLeftPanel,
    showRightPanel,
    isResizing,
  }), [leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, showLeftPanel, showRightPanel, isResizing]);

  const clampWidth = useCallback((width: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, width));
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelExpanded(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelExpanded(prev => !prev);
  }, []);

  const setLeftPanelWidth = useCallback((width: number) => {
    setLeftPanelWidthState(clampWidth(width, opts.leftPanelMinWidth, opts.leftPanelMaxWidth));
  }, [clampWidth, opts.leftPanelMinWidth, opts.leftPanelMaxWidth]);

  const setRightPanelWidth = useCallback((width: number) => {
    setRightPanelWidthState(clampWidth(width, opts.rightPanelMinWidth, opts.rightPanelMaxWidth));
  }, [clampWidth, opts.rightPanelMinWidth, opts.rightPanelMaxWidth]);

  const expandLeftPanel = useCallback(() => setLeftPanelExpanded(true), []);
  const collapseLeftPanel = useCallback(() => setLeftPanelExpanded(false), []);
  const expandRightPanel = useCallback(() => setRightPanelExpanded(true), []);
  const collapseRightPanel = useCallback(() => setRightPanelExpanded(false), []);
  const showLeft = useCallback(() => setShowLeftPanel(true), []);
  const hideLeft = useCallback(() => setShowLeftPanel(false), []);
  const showRight = useCallback(() => setShowRightPanel(true), []);
  const hideRight = useCallback(() => setShowRightPanel(false), []);

  const resetLayout = useCallback(() => {
    setLeftPanelWidthState(opts.leftPanelWidth);
    setRightPanelWidthState(opts.rightPanelWidth);
    setLeftPanelExpanded(opts.leftPanelExpanded);
    setRightPanelExpanded(opts.rightPanelExpanded);
    setShowLeftPanel(true);
    setShowRightPanel(true);
  }, [opts]);

  const saveLayout = useCallback(() => {
    if (!opts.persistLayout || typeof localStorage === 'undefined') return;
    const layoutData = {
      leftPanelWidth,
      rightPanelWidth,
      leftPanelExpanded,
      rightPanelExpanded,
      showLeftPanel,
      showRightPanel,
    };
    try {
      localStorage.setItem(opts.storageKey, JSON.stringify(layoutData));
    } catch (e) {
      console.warn('Failed to save workbench layout:', e);
    }
  }, [opts, leftPanelWidth, rightPanelWidth, leftPanelExpanded, rightPanelExpanded, showLeftPanel, showRightPanel]);

  const loadLayout = useCallback(() => {
    if (!opts.persistLayout || typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(opts.storageKey);
      if (stored) {
        const layoutData = JSON.parse(stored);
        if (layoutData.leftPanelWidth !== undefined) setLeftPanelWidthState(layoutData.leftPanelWidth);
        if (layoutData.rightPanelWidth !== undefined) setRightPanelWidthState(layoutData.rightPanelWidth);
        if (layoutData.leftPanelExpanded !== undefined) setLeftPanelExpanded(layoutData.leftPanelExpanded);
        if (layoutData.rightPanelExpanded !== undefined) setRightPanelExpanded(layoutData.rightPanelExpanded);
        if (layoutData.showLeftPanel !== undefined) setShowLeftPanel(layoutData.showLeftPanel);
        if (layoutData.showRightPanel !== undefined) setShowRightPanel(layoutData.showRightPanel);
      }
    } catch (e) {
      console.warn('Failed to load workbench layout:', e);
    }
  }, [opts]);

  const setResizing = useCallback((resizing: boolean) => {
    setIsResizing(resizing);
    uiStore.setDragging(resizing);
  }, [uiStore]);

  // Persist effect
  useEffect(() => {
    loadLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (opts.persistLayout) {
      saveLayout();
    }
  }, [saveLayout, opts.persistLayout]);

  return {
    state,
    leftPanelWidth,
    rightPanelWidth,
    leftPanelExpanded,
    rightPanelExpanded,
    showLeftPanel,
    showRightPanel,
    isResizing,
    mainAreaWidth,
    toggleLeftPanel,
    toggleRightPanel,
    setLeftPanelWidth,
    setRightPanelWidth,
    expandLeftPanel,
    collapseLeftPanel,
    expandRightPanel,
    collapseRightPanel,
    showLeft,
    hideLeft,
    showRight,
    hideRight,
    resetLayout,
    saveLayout,
    loadLayout,
    setResizing,
  };
}
