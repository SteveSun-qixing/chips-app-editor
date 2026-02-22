/**
 * useWorkbenchControls Hook 测试
 * @module tests/unit/layouts/workbench/use-workbench
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkbenchControls } from '@/layouts/workbench/use-workbench';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useWorkbenchControls', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 清理 localStorage mock
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const controls = useWorkbenchControls();

      expect(controls.leftPanelWidth.value).toBe(280);
      expect(controls.rightPanelWidth.value).toBe(320);
      expect(controls.leftPanelExpanded.value).toBe(true);
      expect(controls.rightPanelExpanded.value).toBe(true);
      expect(controls.showLeftPanel.value).toBe(true);
      expect(controls.showRightPanel.value).toBe(true);
      expect(controls.isResizing.value).toBe(false);
    });

    it('should accept custom options', () => {
      const controls = useWorkbenchControls({
        leftPanelWidth: 300,
        rightPanelWidth: 400,
        leftPanelExpanded: false,
        rightPanelExpanded: false,
      });

      expect(controls.leftPanelWidth.value).toBe(300);
      expect(controls.rightPanelWidth.value).toBe(400);
      expect(controls.leftPanelExpanded.value).toBe(false);
      expect(controls.rightPanelExpanded.value).toBe(false);
    });
  });

  describe('panel toggle', () => {
    it('should toggle left panel', () => {
      const { leftPanelExpanded, toggleLeftPanel } = useWorkbenchControls();

      expect(leftPanelExpanded.value).toBe(true);
      toggleLeftPanel();
      expect(leftPanelExpanded.value).toBe(false);
      toggleLeftPanel();
      expect(leftPanelExpanded.value).toBe(true);
    });

    it('should toggle right panel', () => {
      const { rightPanelExpanded, toggleRightPanel } = useWorkbenchControls();

      expect(rightPanelExpanded.value).toBe(true);
      toggleRightPanel();
      expect(rightPanelExpanded.value).toBe(false);
      toggleRightPanel();
      expect(rightPanelExpanded.value).toBe(true);
    });

    it('should expand left panel', () => {
      const { leftPanelExpanded, collapseLeftPanel, expandLeftPanel } = useWorkbenchControls();

      collapseLeftPanel();
      expect(leftPanelExpanded.value).toBe(false);
      expandLeftPanel();
      expect(leftPanelExpanded.value).toBe(true);
    });

    it('should collapse left panel', () => {
      const { leftPanelExpanded, collapseLeftPanel } = useWorkbenchControls();

      expect(leftPanelExpanded.value).toBe(true);
      collapseLeftPanel();
      expect(leftPanelExpanded.value).toBe(false);
    });

    it('should expand right panel', () => {
      const { rightPanelExpanded, collapseRightPanel, expandRightPanel } = useWorkbenchControls();

      collapseRightPanel();
      expect(rightPanelExpanded.value).toBe(false);
      expandRightPanel();
      expect(rightPanelExpanded.value).toBe(true);
    });

    it('should collapse right panel', () => {
      const { rightPanelExpanded, collapseRightPanel } = useWorkbenchControls();

      expect(rightPanelExpanded.value).toBe(true);
      collapseRightPanel();
      expect(rightPanelExpanded.value).toBe(false);
    });
  });

  describe('panel width', () => {
    it('should set left panel width', () => {
      const { leftPanelWidth, setLeftPanelWidth } = useWorkbenchControls();

      setLeftPanelWidth(350);
      expect(leftPanelWidth.value).toBe(350);
    });

    it('should set right panel width', () => {
      const { rightPanelWidth, setRightPanelWidth } = useWorkbenchControls();

      setRightPanelWidth(400);
      expect(rightPanelWidth.value).toBe(400);
    });

    it('should clamp left panel width to min', () => {
      const { leftPanelWidth, setLeftPanelWidth } = useWorkbenchControls({
        leftPanelMinWidth: 180,
      });

      setLeftPanelWidth(100);
      expect(leftPanelWidth.value).toBe(180);
    });

    it('should clamp left panel width to max', () => {
      const { leftPanelWidth, setLeftPanelWidth } = useWorkbenchControls({
        leftPanelMaxWidth: 480,
      });

      setLeftPanelWidth(600);
      expect(leftPanelWidth.value).toBe(480);
    });

    it('should clamp right panel width to min', () => {
      const { rightPanelWidth, setRightPanelWidth } = useWorkbenchControls({
        rightPanelMinWidth: 200,
      });

      setRightPanelWidth(100);
      expect(rightPanelWidth.value).toBe(200);
    });

    it('should clamp right panel width to max', () => {
      const { rightPanelWidth, setRightPanelWidth } = useWorkbenchControls({
        rightPanelMaxWidth: 500,
      });

      setRightPanelWidth(700);
      expect(rightPanelWidth.value).toBe(500);
    });
  });

  describe('panel visibility', () => {
    it('should show left panel', () => {
      const { showLeftPanel, hideLeft, showLeft } = useWorkbenchControls();

      hideLeft();
      expect(showLeftPanel.value).toBe(false);
      showLeft();
      expect(showLeftPanel.value).toBe(true);
    });

    it('should hide left panel', () => {
      const { showLeftPanel, hideLeft } = useWorkbenchControls();

      expect(showLeftPanel.value).toBe(true);
      hideLeft();
      expect(showLeftPanel.value).toBe(false);
    });

    it('should show right panel', () => {
      const { showRightPanel, hideRight, showRight } = useWorkbenchControls();

      hideRight();
      expect(showRightPanel.value).toBe(false);
      showRight();
      expect(showRightPanel.value).toBe(true);
    });

    it('should hide right panel', () => {
      const { showRightPanel, hideRight } = useWorkbenchControls();

      expect(showRightPanel.value).toBe(true);
      hideRight();
      expect(showRightPanel.value).toBe(false);
    });
  });

  describe('reset layout', () => {
    it('should reset layout to defaults', () => {
      const controls = useWorkbenchControls({
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        leftPanelExpanded: true,
        rightPanelExpanded: true,
      });

      // 修改状态
      controls.setLeftPanelWidth(400);
      controls.setRightPanelWidth(500);
      controls.collapseLeftPanel();
      controls.collapseRightPanel();
      controls.hideLeft();
      controls.hideRight();

      // 重置
      controls.resetLayout();

      expect(controls.leftPanelWidth.value).toBe(280);
      expect(controls.rightPanelWidth.value).toBe(320);
      expect(controls.leftPanelExpanded.value).toBe(true);
      expect(controls.rightPanelExpanded.value).toBe(true);
      expect(controls.showLeftPanel.value).toBe(true);
      expect(controls.showRightPanel.value).toBe(true);
    });
  });

  describe('resizing state', () => {
    it('should set resizing state', () => {
      const { isResizing, setResizing } = useWorkbenchControls();

      expect(isResizing.value).toBe(false);
      setResizing(true);
      expect(isResizing.value).toBe(true);
      setResizing(false);
      expect(isResizing.value).toBe(false);
    });
  });

  describe('main area width', () => {
    it('should calculate main area width', () => {
      const { mainAreaWidth } = useWorkbenchControls({
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        leftPanelExpanded: true,
        rightPanelExpanded: true,
      });

      // 主区域宽度应该是总宽度减去两侧面板宽度
      // 具体值取决于 window.innerWidth
      expect(mainAreaWidth.value).toBeGreaterThan(0);
    });

    it('should use collapsed width when panels are collapsed', () => {
      const controls = useWorkbenchControls({
        leftPanelWidth: 280,
        rightPanelWidth: 320,
      });

      const expandedWidth = controls.mainAreaWidth.value;

      controls.collapseLeftPanel();
      controls.collapseRightPanel();

      // 收起后主区域宽度应该更大
      expect(controls.mainAreaWidth.value).toBeGreaterThan(expandedWidth);
    });
  });

  describe('state object', () => {
    it('should provide reactive state object', () => {
      const controls = useWorkbenchControls();

      expect(controls.state.leftPanelWidth).toBe(280);
      expect(controls.state.rightPanelWidth).toBe(320);
      expect(controls.state.leftPanelExpanded).toBe(true);
      expect(controls.state.rightPanelExpanded).toBe(true);
      expect(controls.state.showLeftPanel).toBe(true);
      expect(controls.state.showRightPanel).toBe(true);
      expect(controls.state.isResizing).toBe(false);
    });

    it('should update state object when values change', () => {
      const controls = useWorkbenchControls();

      controls.setLeftPanelWidth(350);
      controls.collapseRightPanel();

      expect(controls.state.leftPanelWidth).toBe(350);
      expect(controls.state.rightPanelExpanded).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should save layout when persistLayout is true', () => {
      const controls = useWorkbenchControls({
        persistLayout: true,
        storageKey: 'test-layout',
      });

      controls.setLeftPanelWidth(350);
      controls.saveLayout();

      const stored = localStorage.getItem('test-layout');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.leftPanelWidth).toBe(350);
    });

    it('should load layout when persistLayout is true', () => {
      const layoutData = {
        leftPanelWidth: 400,
        rightPanelWidth: 450,
        leftPanelExpanded: false,
        rightPanelExpanded: true,
      };
      localStorage.setItem('test-layout-2', JSON.stringify(layoutData));

      const controls = useWorkbenchControls({
        persistLayout: true,
        storageKey: 'test-layout-2',
      });

      expect(controls.leftPanelWidth.value).toBe(400);
      expect(controls.rightPanelWidth.value).toBe(450);
      expect(controls.leftPanelExpanded.value).toBe(false);
      expect(controls.rightPanelExpanded.value).toBe(true);
    });

    it('should not save when persistLayout is false', () => {
      const controls = useWorkbenchControls({
        persistLayout: false,
        storageKey: 'test-layout-3',
      });

      controls.setLeftPanelWidth(350);
      controls.saveLayout();

      const stored = localStorage.getItem('test-layout-3');
      expect(stored).toBeNull();
    });
  });
});
