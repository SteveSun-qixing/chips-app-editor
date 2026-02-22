/**
 * Workbench 组件测试
 * @module tests/unit/layouts/workbench/Workbench
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Workbench from '@/layouts/workbench/Workbench.vue';
import SidePanel from '@/layouts/workbench/SidePanel.vue';
import MainArea from '@/layouts/workbench/MainArea.vue';

describe('Workbench', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(Workbench);
      
      expect(wrapper.find('.workbench').exists()).toBe(true);
    });

    it('should render left panel by default', () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const leftPanel = sidePanels.find(p => p.props('position') === 'left');
      expect(leftPanel).toBeTruthy();
    });

    it('should render right panel by default', () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const rightPanel = sidePanels.find(p => p.props('position') === 'right');
      expect(rightPanel).toBeTruthy();
    });

    it('should render main area', () => {
      const wrapper = mount(Workbench);
      
      expect(wrapper.findComponent(MainArea).exists()).toBe(true);
    });
  });

  describe('config', () => {
    it('should apply initial config', () => {
      const wrapper = mount(Workbench, {
        props: {
          config: {
            leftPanelWidth: 300,
            rightPanelWidth: 350,
            leftPanelExpanded: false,
            rightPanelExpanded: true,
          },
        },
      });
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const leftPanel = sidePanels.find(p => p.props('position') === 'left');
      const rightPanel = sidePanels.find(p => p.props('position') === 'right');
      
      expect(leftPanel?.props('width')).toBe(300);
      expect(rightPanel?.props('width')).toBe(350);
      expect(leftPanel?.props('expanded')).toBe(false);
      expect(rightPanel?.props('expanded')).toBe(true);
    });

    it('should hide left panel when showLeftPanel is false', () => {
      const wrapper = mount(Workbench, {
        props: {
          config: {
            showLeftPanel: false,
          },
        },
      });
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const leftPanel = sidePanels.find(p => p.props('position') === 'left');
      expect(leftPanel).toBeFalsy();
    });

    it('should hide right panel when showRightPanel is false', () => {
      const wrapper = mount(Workbench, {
        props: {
          config: {
            showRightPanel: false,
          },
        },
      });
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const rightPanel = sidePanels.find(p => p.props('position') === 'right');
      expect(rightPanel).toBeFalsy();
    });
  });

  describe('panel width changes', () => {
    it('should emit layout-change when left panel width changes', async () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const leftPanel = sidePanels.find(p => p.props('position') === 'left');
      
      leftPanel?.vm.$emit('update:width', 320);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
      const emittedConfig = wrapper.emitted('layout-change')![0][0] as any;
      expect(emittedConfig.leftPanelWidth).toBe(320);
    });

    it('should emit layout-change when right panel width changes', async () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const rightPanel = sidePanels.find(p => p.props('position') === 'right');
      
      rightPanel?.vm.$emit('update:width', 400);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
      const emittedConfig = wrapper.emitted('layout-change')![0][0] as any;
      expect(emittedConfig.rightPanelWidth).toBe(400);
    });
  });

  describe('panel expand/collapse', () => {
    it('should emit layout-change when left panel expand state changes', async () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const leftPanel = sidePanels.find(p => p.props('position') === 'left');
      
      leftPanel?.vm.$emit('update:expanded', false);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
      const emittedConfig = wrapper.emitted('layout-change')![0][0] as any;
      expect(emittedConfig.leftPanelExpanded).toBe(false);
    });

    it('should emit layout-change when right panel expand state changes', async () => {
      const wrapper = mount(Workbench);
      
      const sidePanels = wrapper.findAllComponents(SidePanel);
      const rightPanel = sidePanels.find(p => p.props('position') === 'right');
      
      rightPanel?.vm.$emit('update:expanded', false);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
      const emittedConfig = wrapper.emitted('layout-change')![0][0] as any;
      expect(emittedConfig.rightPanelExpanded).toBe(false);
    });
  });

  describe('tab events', () => {
    it('should emit tab-change when main area tab changes', async () => {
      const wrapper = mount(Workbench);
      
      const mainArea = wrapper.findComponent(MainArea);
      mainArea.vm.$emit('tab-change', 'card-1');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('tab-change')).toBeTruthy();
      expect(wrapper.emitted('tab-change')![0]).toEqual(['card-1']);
    });

    it('should emit tab-close when main area tab closes', async () => {
      const wrapper = mount(Workbench);
      
      const mainArea = wrapper.findComponent(MainArea);
      mainArea.vm.$emit('tab-close', 'card-1');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('tab-close')).toBeTruthy();
      expect(wrapper.emitted('tab-close')![0]).toEqual(['card-1']);
    });
  });

  describe('expose', () => {
    it('should expose layoutConfig', () => {
      const wrapper = mount(Workbench, {
        props: {
          config: {
            leftPanelWidth: 280,
            rightPanelWidth: 320,
          },
        },
      });
      
      expect(wrapper.vm.layoutConfig).toBeDefined();
      expect(wrapper.vm.layoutConfig.leftPanelWidth).toBe(280);
      expect(wrapper.vm.layoutConfig.rightPanelWidth).toBe(320);
    });

    it('should expose toggleLeftPanel method', async () => {
      const wrapper = mount(Workbench);
      
      wrapper.vm.toggleLeftPanel();
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
    });

    it('should expose toggleRightPanel method', async () => {
      const wrapper = mount(Workbench);
      
      wrapper.vm.toggleRightPanel();
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
    });

    it('should expose setLayoutConfig method', async () => {
      const wrapper = mount(Workbench);
      
      wrapper.vm.setLayoutConfig({
        leftPanelWidth: 350,
        rightPanelWidth: 400,
      });
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.layoutConfig.leftPanelWidth).toBe(350);
      expect(wrapper.vm.layoutConfig.rightPanelWidth).toBe(400);
    });

    it('should expose resetLayout method', async () => {
      const wrapper = mount(Workbench, {
        props: {
          config: {
            leftPanelWidth: 400,
            rightPanelWidth: 500,
            leftPanelExpanded: false,
          },
        },
      });
      
      wrapper.vm.resetLayout();
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.layoutConfig.leftPanelWidth).toBe(280);
      expect(wrapper.vm.layoutConfig.rightPanelWidth).toBe(320);
      expect(wrapper.vm.layoutConfig.leftPanelExpanded).toBe(true);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should toggle left panel on Ctrl+B', async () => {
      const wrapper = mount(Workbench, {
        attachTo: document.body,
      });
      
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('layout-change')).toBeTruthy();
      
      wrapper.unmount();
    });
  });

  describe('slots', () => {
    it('should render left-panel slot content', () => {
      const wrapper = mount(Workbench, {
        slots: {
          'left-panel': '<div class="custom-left">Left Content</div>',
        },
      });
      
      expect(wrapper.find('.custom-left').exists()).toBe(true);
    });

    it('should render right-panel slot content', () => {
      const wrapper = mount(Workbench, {
        slots: {
          'right-panel': '<div class="custom-right">Right Content</div>',
        },
      });
      
      expect(wrapper.find('.custom-right').exists()).toBe(true);
    });
  });
});
