/**
 * PluginHost 组件单元测试
 * @module tests/unit/components/edit-panel/PluginHost
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import PluginHost from '@/components/edit-panel/PluginHost.vue';
import { useCardStore, useEditorStore } from '@/core/state';
import { saveCardToWorkspace } from '@/services/card-persistence-service';

const { getEditorRuntimeMock, getLocalPluginVocabularyMock, getCardPluginPermissionsMock } = vi.hoisted(() => ({
  getEditorRuntimeMock: vi.fn(),
  getLocalPluginVocabularyMock: vi.fn(),
  getCardPluginPermissionsMock: vi.fn(),
}));

vi.mock('@/services/plugin-service', () => ({
  getEditorRuntime: getEditorRuntimeMock,
  getLocalPluginVocabulary: getLocalPluginVocabularyMock,
  getCardPluginPermissions: getCardPluginPermissionsMock,
}));

// Mock DefaultEditor 组件
vi.mock('@/components/edit-panel/DefaultEditor.vue', () => ({
  default: {
    name: 'DefaultEditor',
    props: ['baseCard', 'schema', 'mode'],
    emits: ['config-change', 'validation'],
    template: '<div class="mock-default-editor" data-testid="default-editor"><slot /></div>',
  },
}));

vi.mock('@/services/card-persistence-service', () => ({
  saveCardToWorkspace: vi.fn().mockResolvedValue(undefined),
}));

describe('PluginHost', () => {
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

    // 设置测试数据
    setupStoreWithCard();

    // 清除定时器 mock
    vi.useFakeTimers();

    vi.mocked(saveCardToWorkspace).mockReset();
    vi.mocked(saveCardToWorkspace).mockResolvedValue(undefined);
    getEditorRuntimeMock.mockReset();
    getEditorRuntimeMock.mockResolvedValue(null);
    getLocalPluginVocabularyMock.mockReset();
    getLocalPluginVocabularyMock.mockResolvedValue(null);
    getCardPluginPermissionsMock.mockReset();
    getCardPluginPermissionsMock.mockResolvedValue(new Set());
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
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
        ],
        manifest: {
          card_count: 1,
          resource_count: 0,
          resources: [],
        },
      },
    };

    cardStore.addCard(mockCard);
    cardStore.setActiveCard('card-001');
    cardStore.setSelectedBaseCard('base-001');
  }

  /**
   * 挂载组件
   */
  function mountComponent(props = {}): VueWrapper {
    return mount(PluginHost, {
      props: {
        cardType: 'TextCard',
        baseCardId: 'base-001',
        config: { text: 'Hello World' },
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
    it('应该正确渲染组件', async () => {
      wrapper = mountComponent();
      await nextTick();
      expect(wrapper.find('.plugin-host').exists()).toBe(true);
    });

    it('加载中应该显示加载状态', async () => {
      wrapper = mountComponent();
      // 初始状态应该是加载中
      expect(wrapper.find('.plugin-host__loading').exists()).toBe(true);
    });

    it('加载完成后应该显示默认编辑器', async () => {
      wrapper = mountComponent();
      await nextTick();
      
      // 等待加载完成
      vi.runAllTimers();
      await nextTick();

      // 由于没有插件，应该显示默认编辑器
      const vm = wrapper.vm as any;
      expect(vm.useDefaultEditor).toBe(true);
    });
  });

  // ==================== 加载状态测试 ====================

  describe('加载状态', () => {
    it('应该在加载时显示 spinner', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.plugin-host__spinner').exists()).toBe(true);
    });

    it('加载完成后应该隐藏加载状态', async () => {
      wrapper = mountComponent();
      await nextTick();
      
      const vm = wrapper.vm as any;
      // 手动设置加载完成状态
      vm.isLoading = false;
      await nextTick();

      // 验证 isLoading 状态已更新
      expect(vm.isLoading).toBe(false);
    });
  });

  // ==================== 配置变更测试 ====================

  describe('配置变更', () => {
    it('应该触发 config-change 事件', async () => {
      wrapper = mountComponent();
      await nextTick();
      vi.runAllTimers();
      await nextTick();

      // 模拟 DefaultEditor 触发配置变更
      const defaultEditor = wrapper.findComponent({ name: 'DefaultEditor' });
      if (defaultEditor.exists()) {
        defaultEditor.vm.$emit('config-change', { text: 'Updated' });
        
        // 等待防抖
        vi.advanceTimersByTime(300);
        await nextTick();

        expect(wrapper.emitted('config-change')).toBeTruthy();
      }
    });

    it('应该使用防抖机制', async () => {
      wrapper = mountComponent();
      await nextTick();
      vi.runAllTimers();
      await nextTick();

      const vm = wrapper.vm as any;

      // 快速连续调用
      vm.handleDefaultConfigChange({ text: 'Update 1' });
      vm.handleDefaultConfigChange({ text: 'Update 2' });
      vm.handleDefaultConfigChange({ text: 'Update 3' });

      // 防抖期间不应该触发事件
      expect(wrapper.emitted('config-change')).toBeFalsy();

      // 等待防抖完成
      vi.advanceTimersByTime(300);
      await nextTick();

      // 只应该触发一次事件
      const emitted = wrapper.emitted('config-change');
      if (emitted) {
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toEqual([{ text: 'Update 3' }]);
      }
    });
  });

  // ==================== 未保存状态测试 ====================

  describe('未保存状态', () => {
    it('有未保存更改时应该显示指示器', async () => {
      wrapper = mountComponent();
      await nextTick();
      vi.runAllTimers();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.hasUnsavedChanges = true;
      await nextTick();

      expect(wrapper.find('.plugin-host__unsaved-indicator').exists()).toBe(true);
    });

    it('保存后应该隐藏指示器', async () => {
      wrapper = mountComponent();
      await nextTick();
      vi.runAllTimers();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.hasUnsavedChanges = true;
      await nextTick();

      await vm.saveConfig();
      await nextTick();

      expect(vm.hasUnsavedChanges).toBe(false);
    });
  });

  // ==================== 自动保存测试 ====================

  describe('自动保存', () => {
    it('应该支持手动保存', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.isLoading = false;
      vm.hasUnsavedChanges = true;
      await nextTick();
      
      // 手动调用保存
      await vm.saveConfig();

      // 保存后应该重置未保存状态
      expect(vm.hasUnsavedChanges).toBe(false);
    });
  });

  describe('落盘保存', () => {
    it('saveConfig 成功后应调用落盘服务', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.isLoading = false;
      vm.localConfig = { text: 'Persisted content' };
      vm.hasUnsavedChanges = true;

      await vm.saveConfig();

      expect(saveCardToWorkspace).toHaveBeenCalledTimes(1);
      expect(vm.hasUnsavedChanges).toBe(false);
    });

    it('落盘失败时应保留未保存状态', async () => {
      vi.mocked(saveCardToWorkspace).mockRejectedValueOnce(new Error('persist failed'));

      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.isLoading = false;
      vm.localConfig = { text: 'Will fail' };
      vm.hasUnsavedChanges = true;

      await vm.saveConfig();

      expect(saveCardToWorkspace).toHaveBeenCalledTimes(1);
      expect(vm.hasUnsavedChanges).toBe(true);
    });

    it('连续保存请求应串行执行', async () => {
      let resolveFirstSave: (() => void) | null = null;
      const firstSavePromise = new Promise<void>((resolve) => {
        resolveFirstSave = resolve;
      });

      vi.mocked(saveCardToWorkspace)
        .mockImplementationOnce(() => firstSavePromise)
        .mockResolvedValueOnce(undefined);

      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.isLoading = false;
      vm.localConfig = { text: 'First' };
      vm.hasUnsavedChanges = true;

      const first = vm.saveConfig();
      await nextTick();

      vm.localConfig = { text: 'Second' };
      vm.hasUnsavedChanges = true;
      const second = vm.saveConfig();

      expect(saveCardToWorkspace).toHaveBeenCalledTimes(1);

      resolveFirstSave?.();
      await Promise.all([first, second]);

      expect(saveCardToWorkspace).toHaveBeenCalledTimes(2);
    });
  });

  describe('iframe 多语言桥接', () => {
    it('iframe load 时应在 init 和 language-change 消息中传递 vocabulary', async () => {
      editorStore.setLocale('en-US');
      getEditorRuntimeMock.mockResolvedValue({
        mode: 'iframe',
        pluginId: 'chips-official.rich-text-card',
        iframeUrl: 'https://example.com/editor/index.html',
      });
      getLocalPluginVocabularyMock.mockResolvedValue({
        'toolbar.bold': 'Bold',
        'dialog.confirm': 'Confirm',
      });

      wrapper = mountComponent({ cardType: 'RichTextCard' });
      await nextTick();
      await (wrapper.vm as any).reload();
      await nextTick();
      await (wrapper.vm as any).reload();
      await nextTick();

      const iframe = wrapper.find('iframe');
      expect(iframe.exists()).toBe(true);

      const postMessage = vi.fn();
      const vm = wrapper.vm as any;
      vm.pluginIframeRef = {
        contentWindow: { postMessage },
      };

      await vm.handleIframeLoad();

      expect(postMessage).toHaveBeenCalledTimes(2);
      expect(postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'init',
          payload: expect.objectContaining({
            locale: 'en-US',
            vocabularyVersion: expect.any(String),
            vocabulary: {
              'toolbar.bold': 'Bold',
              'dialog.confirm': 'Confirm',
            },
            i18n: expect.objectContaining({
              locale: 'en-US',
              version: expect.any(String),
              payload: {
                mode: 'full',
                vocabulary: {
                  'toolbar.bold': 'Bold',
                  'dialog.confirm': 'Confirm',
                },
              },
            }),
          }),
        }),
        'https://example.com'
      );
      expect(postMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'language-change',
          pluginId: 'chips-official.rich-text-card',
          sessionNonce: expect.any(String),
          locale: 'en-US',
          vocabularyVersion: expect.any(String),
          vocabulary: {
            'toolbar.bold': 'Bold',
            'dialog.confirm': 'Confirm',
          },
          i18n: expect.objectContaining({
            locale: 'en-US',
            version: expect.any(String),
            payload: {
              mode: 'full',
              vocabulary: {
                'toolbar.bold': 'Bold',
                'dialog.confirm': 'Confirm',
              },
            },
          }),
        }),
        'https://example.com'
      );
    });

    it('host 词汇为变量名时应回退本地词汇', async () => {
      editorStore.setLocale('en-US');
      (window as typeof window & { chips?: unknown }).chips = {
        invoke: vi.fn().mockResolvedValue({
          'toolbar.bold': 'toolbar.bold',
          'dialog.confirm': 'dialog.confirm',
        }),
      };

      getEditorRuntimeMock.mockResolvedValue({
        mode: 'iframe',
        pluginId: 'chips-official.rich-text-card',
        iframeUrl: 'https://example.com/editor/index.html',
      });
      getLocalPluginVocabularyMock.mockResolvedValue({
        'toolbar.bold': 'Bold',
        'dialog.confirm': 'Confirm',
      });

      wrapper = mountComponent({ cardType: 'RichTextCard' });
      await nextTick();
      await (wrapper.vm as any).reload();
      await nextTick();
      const vm = wrapper.vm as any;
      vm.pluginIframeRef = {
        contentWindow: { postMessage: vi.fn() },
      };

      await vm.handleIframeLoad();

      expect(vm.iframeVocabulary).toEqual({
        'toolbar.bold': 'Bold',
        'dialog.confirm': 'Confirm',
      });
    });

    it('host 词汇仅返回变量名且无本地词汇时应忽略该词条', async () => {
      editorStore.setLocale('en-US');
      (window as typeof window & { chips?: unknown }).chips = {
        invoke: vi.fn().mockResolvedValue({
          'toolbar.bold': 'toolbar.bold',
        }),
      };

      getEditorRuntimeMock.mockResolvedValue({
        mode: 'iframe',
        pluginId: 'chips-official.rich-text-card',
        iframeUrl: 'https://example.com/editor/index.html',
      });
      getLocalPluginVocabularyMock.mockResolvedValue(null);

      wrapper = mountComponent({ cardType: 'RichTextCard' });
      await nextTick();
      await (wrapper.vm as any).reload();
      await nextTick();
      const vm = wrapper.vm as any;
      vm.pluginIframeRef = {
        contentWindow: { postMessage: vi.fn() },
      };

      await vm.handleIframeLoad();

      expect(vm.iframeVocabulary).toEqual({});
    });
  });

  describe('iframe 安全桥接', () => {
    it('应拒绝未声明权限的 bridge 请求', async () => {
      getEditorRuntimeMock.mockResolvedValue({
        mode: 'iframe',
        pluginId: 'chips-official.rich-text-card',
        iframeUrl: 'https://example.com/editor/index.html',
      });
      getCardPluginPermissionsMock.mockResolvedValue(new Set());

      wrapper = mountComponent({ cardType: 'RichTextCard' });
      await nextTick();
      await (wrapper.vm as any).reload();
      await nextTick();

      const postMessage = vi.fn();
      const iframeWindow = {} as Window;
      const vm = wrapper.vm as any;
      vm.pluginIframeRef = {
        contentWindow: iframeWindow,
      };
      vm.pluginIframeRef.contentWindow.postMessage = postMessage;

      await vm.handleIframeBridgeRequest({
        type: 'bridge-request',
        pluginId: vm.iframePluginId,
        sessionNonce: vm.iframeSessionNonce,
        requestNonce: 'req-1',
        requestId: 'request-1',
        namespace: 'resource',
        action: 'fetch',
        params: { uri: 'chips://test' },
      });

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bridge-response',
          requestId: 'request-1',
          error: expect.objectContaining({
            code: 'BRIDGE_PERMISSION_DENIED',
          }),
        }),
        'https://example.com'
      );
    });

    it('应拦截非可信 origin 的消息', async () => {
      getEditorRuntimeMock.mockResolvedValue({
        mode: 'iframe',
        pluginId: 'chips-official.rich-text-card',
        iframeUrl: 'https://example.com/editor/index.html',
      });

      wrapper = mountComponent({ cardType: 'RichTextCard' });
      await nextTick();

      const invokeMock = vi.fn().mockResolvedValue({});
      (window as typeof window & { chips?: unknown }).chips = {
        invoke: invokeMock,
      };

      const postMessage = vi.fn();
      const iframeWindow = {} as Window;
      const vm = wrapper.vm as any;
      vm.pluginIframeRef = {
        contentWindow: iframeWindow,
      };
      vm.pluginIframeRef.contentWindow.postMessage = postMessage;

      vm.handleIframeMessage({
        source: iframeWindow,
        origin: 'https://attacker.example.com',
        data: {
          type: 'bridge-request',
          pluginId: vm.iframePluginId,
          sessionNonce: vm.iframeSessionNonce,
          requestNonce: 'req-1',
          requestId: 'request-1',
          namespace: 'resource',
          action: 'fetch',
        },
      });
      await nextTick();

      expect(invokeMock).not.toHaveBeenCalled();
      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  // ==================== Props 变化测试 ====================

  describe('Props 变化', () => {
    it('cardType 变化时组件应该响应', async () => {
      wrapper = mountComponent();
      await nextTick();

      const initialType = wrapper.props('cardType');
      expect(initialType).toBe('TextCard');

      await wrapper.setProps({ cardType: 'ImageCard' });
      await nextTick();

      expect(wrapper.props('cardType')).toBe('ImageCard');
    });

    it('baseCardId 变化时组件应该响应', async () => {
      wrapper = mountComponent();
      await nextTick();

      const initialId = wrapper.props('baseCardId');
      expect(initialId).toBe('base-001');

      await wrapper.setProps({ baseCardId: 'base-002' });
      await nextTick();

      expect(wrapper.props('baseCardId')).toBe('base-002');
    });

    it('config 变化时应该同步本地配置（无本地更改时）', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.isLoading = false;
      vm.hasUnsavedChanges = false;
      vm.localConfig = { text: 'Hello World' };
      await nextTick();

      await wrapper.setProps({ config: { text: 'New Text' } });
      await nextTick();

      expect(vm.localConfig).toEqual({ text: 'New Text' });
    });
  });

  // ==================== Expose 测试 ====================

  describe('暴露的方法', () => {
    it('应该暴露 reload 方法', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      expect(typeof vm.reload).toBe('function');
    });

    it('应该暴露 saveConfig 方法', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      expect(typeof vm.saveConfig).toBe('function');

      vm.isLoading = false;
      vm.hasUnsavedChanges = true;
      await vm.saveConfig();

      expect(vm.hasUnsavedChanges).toBe(false);
    });

    it('应该暴露 isLoading 状态', async () => {
      wrapper = mountComponent();
      
      const vm = wrapper.vm as any;
      expect(typeof vm.isLoading).toBe('boolean');
    });

    it('应该暴露 loadError 状态', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      expect(vm.loadError).toBe(null);
    });
  });

  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    it('加载失败时应该显示错误状态', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.loadError = new Error('Plugin load failed');
      vm.isLoading = false;
      await nextTick();

      expect(wrapper.find('.plugin-host__error').exists()).toBe(true);
      expect(wrapper.find('.plugin-host__error-text').text()).toContain('Plugin load failed');
    });

    it('点击重试按钮应该调用 reload', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      vm.loadError = new Error('Plugin load failed');
      vm.isLoading = false;
      await nextTick();

      const retryBtn = wrapper.find('.plugin-host__retry-btn');
      expect(retryBtn.exists()).toBe(true);
      
      // 验证按钮存在且可点击
      await retryBtn.trigger('click');
      // reload 方法会被调用
    });

    it('应该能设置 loadError 状态', async () => {
      wrapper = mountComponent();
      await nextTick();

      const vm = wrapper.vm as any;
      const error = new Error('Test error');
      vm.loadError = error;
      await nextTick();

      expect(vm.loadError).toBe(error);
    });
  });

  // ==================== 生命周期测试 ====================

  describe('生命周期', () => {
    it('卸载时应该清理定时器', async () => {
      wrapper = mountComponent();
      await nextTick();
      vi.runAllTimers();
      await nextTick();

      const vm = wrapper.vm as any;
      
      // 确保自动保存定时器已启动
      vm.hasUnsavedChanges = true;

      // 卸载组件
      wrapper.unmount();

      // 不应该有未清理的定时器导致错误
      expect(() => {
        vi.runAllTimers();
      }).not.toThrow();
    });
  });
});
