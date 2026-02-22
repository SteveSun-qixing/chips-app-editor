/**
 * EngineSettingsDialog 组件测试
 * @module tests/unit/components/engine-settings/EngineSettingsDialog
 *
 * 测试全屏模态弹窗形态的引擎设置对话框：
 * - 显示/隐藏控制
 * - 左侧菜单动态渲染
 * - 分类切换
 * - 关闭和重置
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import EngineSettingsDialog from '@/components/engine-settings/EngineSettingsDialog.vue';
import { useSettingsStore } from '@/core/state/stores/settings';
import type { SettingsPanelDefinition } from '@/types';

// Mock settings service
vi.mock('@/services/settings-service', () => ({
  initializeSettingsService: vi.fn(),
  getAvailableThemes: vi.fn().mockResolvedValue([]),
  handleLanguageChange: vi.fn(),
  handleThemeChange: vi.fn(),
  handleLayoutChange: vi.fn(),
  handleFileModeChange: vi.fn(),
  destroySettingsService: vi.fn(),
}));

/** Stub 面板组件 */
const PanelStubA = defineComponent({
  name: 'PanelA',
  setup() {
    return () => h('div', { class: 'panel-stub-a' }, 'Panel A');
  },
});

const PanelStubB = defineComponent({
  name: 'PanelB',
  setup() {
    return () => h('div', { class: 'panel-stub-b' }, 'Panel B');
  },
});

/** 创建测试面板 */
function createPanel(
  id: string,
  component: any,
  order: number,
  group?: string,
): SettingsPanelDefinition {
  return {
    category: {
      id,
      labelKey: `test.${id}`,
      icon: '🔧',
      order,
      group,
    },
    component,
    defaultData: {},
  };
}

describe('EngineSettingsDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function registerTestPanels() {
    const store = useSettingsStore();
    store.registerPanels([
      createPanel('panelA', PanelStubA, 100, 'group1'),
      createPanel('panelB', PanelStubB, 200, 'group2'),
    ]);
  }

  it('should not render when visible is false', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: false },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.engine-settings-dialog').exists()).toBe(false);
  });

  it('should render dialog when visible is true', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.engine-settings-dialog').exists()).toBe(true);
  });

  it('should display the title', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const title = wrapper.find('.engine-settings-dialog__title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBeTruthy();
  });

  it('should render navigation items from registered panels', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const navItems = wrapper.findAll('.engine-settings-dialog__nav-item');
    expect(navItems.length).toBe(2);
  });

  it('should render group dividers between groups', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const dividers = wrapper.findAll('.engine-settings-dialog__nav-divider');
    expect(dividers.length).toBe(1); // 2 groups = 1 divider
  });

  it('should have first category active by default', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const activeItem = wrapper.find('.engine-settings-dialog__nav-item--active');
    expect(activeItem.exists()).toBe(true);
  });

  it('should render active panel component dynamically', () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    // First panel (panelA) should be rendered
    expect(wrapper.find('.panel-stub-a').exists()).toBe(true);
  });

  it('should switch panel when nav item is clicked', async () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    // Click second nav item (panelB)
    const navItems = wrapper.findAll('.engine-settings-dialog__nav-item');
    await navItems[1]?.trigger('click');

    expect(wrapper.find('.panel-stub-b').exists()).toBe(true);
    expect(wrapper.find('.panel-stub-a').exists()).toBe(false);
  });

  it('should emit close when close button is clicked', async () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const closeBtn = wrapper.find('.engine-settings-dialog__close-btn');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should emit close when bottom close button is clicked', async () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const closeBtn = wrapper.find('.engine-settings-dialog__btn--close');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should emit close when overlay is clicked', async () => {
    registerTestPanels();
    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const overlay = wrapper.find('.engine-settings-overlay');
    await overlay.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should reset current category when reset button is clicked', async () => {
    const store = useSettingsStore();
    store.registerPanel({
      category: {
        id: 'testCat',
        labelKey: 'test.cat',
        icon: '🔧',
        order: 100,
      },
      component: PanelStubA,
      defaultData: { val: 'default' },
    });

    store.updateData('testCat', { val: 'changed' });

    const wrapper = mount(EngineSettingsDialog, {
      props: { visible: true },
      global: { stubs: { Teleport: true } },
    });

    const resetBtn = wrapper.find('.engine-settings-dialog__btn--reset');
    await resetBtn.trigger('click');

    expect(store.getData<{ val: string }>('testCat')?.val).toBe('default');
  });
});
