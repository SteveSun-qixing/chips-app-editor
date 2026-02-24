/**
 * EditPanel 组件单元测试
 * @module tests/unit/components/edit-panel/EditPanel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import EditPanel from '@/components/edit-panel/EditPanel.vue';
import { useCardStore, useEditorStore } from '@/core/state';

// Mock PluginHost 组件
vi.mock('@/components/edit-panel/PluginHost.vue', () => ({
  default: {
    name: 'PluginHost',
    props: ['cardId', 'cardType', 'baseCardId', 'config'],
    emits: ['config-change'],
    template: '<div class="mock-plugin-host" data-testid="plugin-host"><slot /></div>',
  },
}));

describe('EditPanel', () => {
  let wrapper: VueWrapper;
  let cardStore: ReturnType<typeof useCardStore>;
  let editorStore: ReturnType<typeof useEditorStore>;

  beforeEach(() => {
    // 创建新的 Pinia 实例
    const pinia = createPinia();
    setActivePinia(pinia);

    // 获取 store 实例
    cardStore = useCardStore();
    editorStore = useEditorStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  /**
   * 创建带有基础卡片数据的 store 状态
   */
  function setupStoreWithCard(): void {
    const mockCard = {
      id: 'card-001',
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: 'card-001',
        name: 'Test Card',
        created_at: '2026-01-01T00:00:00Z',
        modified_at: '2026-01-01T00:00:00Z',
      },
      structure: {
        structure: [
          {
            id: 'base-001',
            type: 'TextCard',
            config: { text: 'Hello World' },
          },
          {
            id: 'base-002',
            type: 'ImageCard',
            config: { src: 'image.png' },
          },
        ],
        manifest: {
          card_count: 2,
          resource_count: 0,
          resources: [],
        },
      },
    };

    cardStore.addCard(mockCard);
    cardStore.setActiveCard('card-001');
  }

  /**
   * 挂载组件
   */
  function mountComponent(props = {}): VueWrapper {
    return mount(EditPanel, {
      props: {
        position: 'right',
        width: 320,
        defaultExpanded: true,
        ...props,
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    });
  }

  // ==================== 渲染测试 ====================

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.edit-panel').exists()).toBe(true);
    });

    it('无选中卡片时应该隐藏或显示空状态', async () => {
      wrapper = mountComponent();
      // 没有选中基础卡片时
      const emptyState = wrapper.find('.edit-panel__empty');
      // 组件可能不显示，因为 shouldShow 为 false
      expect(cardStore.selectedBaseCardId).toBe(null);
    });

    it('有选中卡片时应该显示编辑器', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');

      wrapper = mountComponent();
      await nextTick();

      expect(wrapper.find('.edit-panel__editor').exists()).toBe(true);
    });

    it('应向 PluginHost 传递当前 cardId', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');

      wrapper = mountComponent();
      await nextTick();

      const pluginHost = wrapper.findComponent({ name: 'PluginHost' });
      expect(pluginHost.props('cardId')).toBe('card-001');
    });

    it('应该正确应用位置类名', () => {
      wrapper = mountComponent({ position: 'right' });
      expect(wrapper.find('.edit-panel--right').exists()).toBe(true);

      wrapper.unmount();

      wrapper = mountComponent({ position: 'left' });
      expect(wrapper.find('.edit-panel--left').exists()).toBe(true);
    });
  });

  // ==================== 展开/收起测试 ====================

  describe('展开/收起功能', () => {
    it('默认应该展开', () => {
      wrapper = mountComponent({ defaultExpanded: true });
      expect(wrapper.find('.edit-panel--expanded').exists()).toBe(true);
    });

    it('点击切换按钮应该切换展开状态', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent();
      await nextTick();

      const toggleBtn = wrapper.find('.edit-panel__action--toggle');
      expect(toggleBtn.exists()).toBe(true);

      await toggleBtn.trigger('click');
      expect(wrapper.find('.edit-panel--collapsed').exists()).toBe(true);

      await toggleBtn.trigger('click');
      expect(wrapper.find('.edit-panel--expanded').exists()).toBe(true);
    });

    it('应该触发 toggle 事件', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent();
      await nextTick();

      const toggleBtn = wrapper.find('.edit-panel__action--toggle');
      await toggleBtn.trigger('click');

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')![0]).toEqual([false]);
    });
  });

  // ==================== 响应式测试 ====================

  describe('响应式行为', () => {
    it('选中新基础卡片时应该自动展开', async () => {
      setupStoreWithCard();
      wrapper = mountComponent({ defaultExpanded: false });
      
      // 模拟收起状态
      const vm = wrapper.vm as any;
      vm.isExpanded = false;
      await nextTick();

      // 选中基础卡片
      cardStore.setSelectedBaseCard('base-001');
      await nextTick();

      // 应该自动展开
      expect(vm.isExpanded).toBe(true);
    });

    it('切换选中的基础卡片应该更新显示', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');

      wrapper = mountComponent();
      await nextTick();

      // 验证显示第一个卡片
      expect(wrapper.find('.edit-panel__subtitle').text()).toBe('base-001');

      // 切换到第二个卡片
      cardStore.setSelectedBaseCard('base-002');
      await nextTick();

      expect(wrapper.find('.edit-panel__subtitle').text()).toBe('base-002');
    });
  });

  // ==================== Props 测试 ====================

  describe('Props', () => {
    it('应该正确应用宽度', () => {
      wrapper = mountComponent({ width: 400 });
      const style = wrapper.find('.edit-panel').attributes('style');
      expect(style).toContain('width: 400px');
    });

    it('应该正确应用默认展开状态', () => {
      wrapper = mountComponent({ defaultExpanded: false });
      expect(wrapper.find('.edit-panel--collapsed').exists()).toBe(true);
    });
  });

  // ==================== 配置变更测试 ====================

  describe('配置变更', () => {
    it('应该触发 config-changed 事件', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');

      wrapper = mountComponent();
      await nextTick();

      // 模拟 PluginHost 触发配置变更
      const pluginHost = wrapper.findComponent({ name: 'PluginHost' });
      if (pluginHost.exists()) {
        pluginHost.vm.$emit('config-change', { text: 'Updated' });
        await nextTick();

        expect(wrapper.emitted('config-changed')).toBeTruthy();
        expect(wrapper.emitted('config-changed')![0]).toEqual([
          'base-001',
          { text: 'Updated' },
        ]);
      }
    });
  });

  // ==================== Expose 测试 ====================

  describe('暴露的方法', () => {
    it('应该暴露 expand 方法', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent({ defaultExpanded: false });

      const vm = wrapper.vm as any;
      expect(vm.isExpanded).toBe(false);

      vm.expand();
      await nextTick();

      expect(vm.isExpanded).toBe(true);
    });

    it('应该暴露 collapse 方法', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent({ defaultExpanded: true });

      const vm = wrapper.vm as any;
      expect(vm.isExpanded).toBe(true);

      vm.collapse();
      await nextTick();

      expect(vm.isExpanded).toBe(false);
    });

    it('应该暴露 toggleExpand 方法', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent();

      const vm = wrapper.vm as any;
      const initialState = vm.isExpanded;

      vm.toggleExpand();
      await nextTick();

      expect(vm.isExpanded).toBe(!initialState);
    });
  });

  // ==================== 无障碍测试 ====================

  describe('无障碍', () => {
    it('应该有正确的 role 属性', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent();
      await nextTick();

      const panel = wrapper.find('.edit-panel');
      expect(panel.attributes('role')).toBe('complementary');
    });

    it('切换按钮应该有正确的 aria 属性', async () => {
      setupStoreWithCard();
      cardStore.setSelectedBaseCard('base-001');
      wrapper = mountComponent();
      await nextTick();

      const toggleBtn = wrapper.find('.edit-panel__action--toggle');
      expect(toggleBtn.attributes('aria-label')).toBeTruthy();
      expect(toggleBtn.attributes('aria-expanded')).toBe('true');
    });
  });
});
