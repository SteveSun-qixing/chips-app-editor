/**
 * MainArea 组件测试
 * @module tests/unit/layouts/workbench/MainArea
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import MainArea from '@/layouts/workbench/MainArea.vue';
import { useUIStore, useCardStore } from '@/core/state';

describe('MainArea', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(MainArea);
      
      expect(wrapper.find('.main-area').exists()).toBe(true);
    });

    it('should show empty state when no tabs', () => {
      const wrapper = mount(MainArea, {
        props: {
          emptyText: 'No cards selected',
          emptyIcon: '📄',
        },
      });
      
      expect(wrapper.find('.main-area__empty').exists()).toBe(true);
      expect(wrapper.find('.main-area__empty-icon').text()).toBe('📄');
      expect(wrapper.find('.main-area__empty-text').text()).toBe('No cards selected');
    });

    it('should hide tabs when showTabs is false', async () => {
      const wrapper = mount(MainArea, {
        props: {
          showTabs: false,
        },
      });
      
      // 即使有数据，也不显示标签栏
      expect(wrapper.find('.main-area__tabs').exists()).toBe(false);
    });
  });

  describe('tabs', () => {
    it('should render tabs when cards are open', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      // 添加卡片窗口
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.main-area__tabs').exists()).toBe(true);
      expect(wrapper.findAll('.main-area__tab').length).toBe(1);
    });

    it('should highlight active tab', async () => {
      const wrapper = mount(MainArea, {
        props: {
          activeTabId: 'card-1',
        },
      });
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const activeTab = wrapper.find('.main-area__tab--active');
      expect(activeTab.exists()).toBe(true);
    });

    it('should emit tab-change on tab click', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const tab = wrapper.find('.main-area__tab');
      await tab.trigger('click');
      
      expect(wrapper.emitted('tab-change')).toBeTruthy();
      expect(wrapper.emitted('tab-change')![0]).toEqual(['card-1']);
    });

    it('should emit tab-close on close button click', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const closeButton = wrapper.find('.main-area__tab-close');
      await closeButton.trigger('click');
      
      expect(wrapper.emitted('tab-close')).toBeTruthy();
      expect(wrapper.emitted('tab-close')![0]).toEqual(['card-1']);
    });

    it('should close tab on middle click', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const tab = wrapper.find('.main-area__tab');
      await tab.trigger('mousedown', { button: 1 });
      
      expect(wrapper.emitted('tab-close')).toBeTruthy();
    });
  });

  describe('expose', () => {
    it('should expose activeTab', () => {
      const wrapper = mount(MainArea, {
        props: { activeTabId: 'card-1' },
      });
      
      expect(wrapper.vm.activeTab).toBe('card-1');
    });

    it('should expose switchTab method', async () => {
      const wrapper = mount(MainArea);
      
      wrapper.vm.switchTab('card-2');
      
      expect(wrapper.emitted('tab-change')).toBeTruthy();
      expect(wrapper.emitted('tab-change')![0]).toEqual(['card-2']);
    });

    it('should expose closeTab method', async () => {
      const wrapper = mount(MainArea);
      
      wrapper.vm.closeTab('card-1');
      
      expect(wrapper.emitted('tab-close')).toBeTruthy();
      expect(wrapper.emitted('tab-close')![0]).toEqual(['card-1']);
    });
  });

  describe('accessibility', () => {
    it('should have correct tablist role', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const tablist = wrapper.find('.main-area__tabs');
      expect(tablist.attributes('role')).toBe('tablist');
    });

    it('should have correct tab role', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const tab = wrapper.find('.main-area__tab');
      expect(tab.attributes('role')).toBe('tab');
    });

    it('should have correct tabpanel role', async () => {
      const wrapper = mount(MainArea);
      const uiStore = useUIStore();
      
      uiStore.addWindow({
        id: 'card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'Card 1',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        state: 'normal',
        zIndex: 100,
      } as any);
      
      await wrapper.vm.$nextTick();
      
      const panel = wrapper.find('.main-area__panel');
      expect(panel.attributes('role')).toBe('tabpanel');
    });
  });
});
