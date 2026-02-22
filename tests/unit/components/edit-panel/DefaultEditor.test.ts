/**
 * DefaultEditor 组件单元测试
 * @module tests/unit/components/edit-panel/DefaultEditor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import DefaultEditor from '@/components/edit-panel/DefaultEditor.vue';
import type { BaseCardInfo } from '@/core/state/stores/card';

describe('DefaultEditor', () => {
  let wrapper: VueWrapper;

  /**
   * 创建测试用基础卡片
   */
  function createBaseCard(config: Record<string, unknown> = {}): BaseCardInfo {
    return {
      id: 'base-001',
      type: 'TextCard',
      config: {
        text: 'Hello World',
        fontSize: 16,
        bold: false,
        color: '#000000',
        ...config,
      },
    };
  }

  /**
   * 挂载组件
   */
  function mountComponent(props = {}): VueWrapper {
    return mount(DefaultEditor, {
      props: {
        baseCard: createBaseCard(),
        mode: 'form',
        ...props,
      },
      global: {
        stubs: {
          Transition: false,
        },
      },
    });
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // ==================== 渲染测试 ====================

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.default-editor').exists()).toBe(true);
    });

    it('应该显示工具栏', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.default-editor__toolbar').exists()).toBe(true);
    });

    it('应该显示卡片类型', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.default-editor__type').text()).toBe('TextCard');
    });

    it('应该显示卡片 ID', () => {
      wrapper = mountComponent();
      expect(wrapper.find('.default-editor__id').text()).toBe('base-001');
    });
  });

  // ==================== 模式切换测试 ====================

  describe('模式切换', () => {
    it('默认应该是表单模式', () => {
      wrapper = mountComponent({ mode: 'form' });
      expect(wrapper.find('.default-editor__form').exists()).toBe(true);
    });

    it('应该能切换到 JSON 模式', async () => {
      wrapper = mountComponent();
      
      const modeBtn = wrapper.find('.default-editor__btn--mode');
      await modeBtn.trigger('click');

      expect(wrapper.find('.default-editor__json').exists()).toBe(true);
    });

    it('应该能从 JSON 模式切换回表单模式', async () => {
      wrapper = mountComponent({ mode: 'json' });
      
      const modeBtn = wrapper.find('.default-editor__btn--mode');
      await modeBtn.trigger('click');

      expect(wrapper.find('.default-editor__form').exists()).toBe(true);
    });

    it('JSON 解析错误时不应该切换模式', async () => {
      wrapper = mountComponent({ mode: 'json' });
      await nextTick();

      const vm = wrapper.vm as any;
      vm.jsonContent = '{ invalid json }';
      await nextTick();

      const modeBtn = wrapper.find('.default-editor__btn--mode');
      await modeBtn.trigger('click');

      // 由于 JSON 无效，应该保持在 JSON 模式
      expect(vm.currentMode).toBe('json');
    });
  });

  // ==================== 表单模式测试 ====================

  describe('表单模式', () => {
    it('应该根据配置生成表单字段', async () => {
      wrapper = mountComponent();
      await nextTick();
      
      const vm = wrapper.vm as any;
      // 表单字段从配置中推断生成
      expect(vm.formFields.length).toBeGreaterThan(0);
    });

    it('应该正确显示字符串字段', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ text: 'Hello' }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const textField = vm.formFields.find((f: any) => f.key === 'text');
      expect(textField).toBeDefined();
      expect(textField.type).toBe('string');
    });

    it('应该正确显示数字字段', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ fontSize: 16 }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const numField = vm.formFields.find((f: any) => f.key === 'fontSize');
      expect(numField).toBeDefined();
      expect(numField.type).toBe('number');
    });

    it('应该正确显示布尔字段', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ bold: false }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const boolField = vm.formFields.find((f: any) => f.key === 'bold');
      expect(boolField).toBeDefined();
      expect(boolField.type).toBe('boolean');
    });

    it('应该正确显示颜色字段', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ color: '#ff0000' }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const colorField = vm.formFields.find((f: any) => f.key === 'color');
      expect(colorField).toBeDefined();
      expect(colorField.type).toBe('color');
    });

    it('修改字段应该触发 config-change 事件', async () => {
      wrapper = mountComponent();
      await nextTick();
      
      const vm = wrapper.vm as any;
      vm.handleFieldChange('text', 'New Text');
      await nextTick();

      expect(wrapper.emitted('config-change')).toBeTruthy();
    });
  });

  // ==================== JSON 模式测试 ====================

  describe('JSON 模式', () => {
    it('应该显示 JSON 内容', async () => {
      wrapper = mountComponent({ mode: 'json' });
      await nextTick();

      const vm = wrapper.vm as any;
      expect(vm.jsonContent).toContain('text');
    });

    it('修改 JSON 应该触发 config-change 事件', async () => {
      wrapper = mountComponent({ mode: 'json' });
      await nextTick();

      const textarea = wrapper.find('.default-editor__json-input');
      await textarea.setValue('{"text": "Updated"}');
      await nextTick();

      expect(wrapper.emitted('config-change')).toBeTruthy();
    });

    it('无效 JSON 应该显示错误', async () => {
      wrapper = mountComponent({ mode: 'json' });
      await nextTick();

      const textarea = wrapper.find('.default-editor__json-input');
      await textarea.setValue('{ invalid }');
      await nextTick();

      expect(wrapper.find('.default-editor__json-error').exists()).toBe(true);
    });

    it('格式化按钮应该格式化 JSON', async () => {
      wrapper = mountComponent({ mode: 'json' });
      await nextTick();

      const vm = wrapper.vm as any;
      vm.jsonContent = '{"text":"compact"}';

      const formatBtn = wrapper.findAll('.default-editor__btn')[1];
      await formatBtn.trigger('click');

      expect(vm.jsonContent).toContain('\n');
    });
  });

  // ==================== 验证测试 ====================

  describe('验证', () => {
    it('应该验证必填字段', async () => {
      const schema = {
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ name: '' }),
        schema,
      });

      const vm = wrapper.vm as any;
      const isValid = vm.validateAll();

      expect(isValid).toBe(false);
    });

    it('验证失败应该显示错误信息', async () => {
      const schema = {
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ name: '' }),
        schema,
      });

      const vm = wrapper.vm as any;
      vm.validateAll();
      await nextTick();

      expect(wrapper.find('.default-editor__error').exists()).toBe(true);
    });

    it('应该触发 validation 事件', async () => {
      const schema = {
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ name: '' }),
        schema,
      });

      const vm = wrapper.vm as any;
      vm.validateAll();

      expect(wrapper.emitted('validation')).toBeTruthy();
    });
  });

  // ==================== Schema 支持测试 ====================

  describe('Schema 支持', () => {
    it('应该从 schema 生成表单字段', () => {
      const schema = {
        properties: {
          title: { type: 'string', title: 'Title' },
          count: { type: 'number', title: 'Count' },
          enabled: { type: 'boolean', title: 'Enabled' },
        },
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ title: '', count: 0, enabled: false }),
        schema,
      });

      expect(wrapper.find('.default-editor__form').exists()).toBe(true);
    });

    it('应该正确处理 enum 类型', async () => {
      const schema = {
        properties: {
          size: {
            type: 'string',
            title: 'Size',
            enum: ['small', 'medium', 'large'],
          },
        },
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ size: 'medium' }),
        schema,
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const sizeField = vm.formFields.find((f: any) => f.key === 'size');
      expect(sizeField).toBeDefined();
      expect(sizeField.type).toBe('select');
      expect(sizeField.options).toHaveLength(3);
    });

    it('应该正确处理数值范围验证', async () => {
      const schema = {
        properties: {
          age: {
            type: 'number',
            title: 'Age',
            minimum: 0,
            maximum: 150,
          },
        },
      };

      wrapper = mountComponent({
        baseCard: createBaseCard({ age: 200 }),
        schema,
      });

      const vm = wrapper.vm as any;
      vm.handleFieldChange('age', 200);
      await nextTick();

      expect(vm.validationErrors.size).toBeGreaterThan(0);
    });
  });

  // ==================== 重置功能测试 ====================

  describe('重置功能', () => {
    it('点击重置按钮应该恢复原始配置', async () => {
      wrapper = mountComponent();

      const vm = wrapper.vm as any;
      vm.localConfig.text = 'Modified';
      await nextTick();

      const resetBtn = wrapper.findAll('.default-editor__btn').pop();
      await resetBtn?.trigger('click');

      expect(vm.localConfig.text).toBe('Hello World');
    });

    it('重置应该清除验证错误', async () => {
      wrapper = mountComponent();

      const vm = wrapper.vm as any;
      vm.validationErrors.set('text', 'Error');
      await nextTick();

      vm.resetConfig();
      await nextTick();

      expect(vm.validationErrors.size).toBe(0);
    });
  });

  // ==================== Expose 测试 ====================

  describe('暴露的方法', () => {
    it('应该暴露 currentMode', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(vm.currentMode).toBe('form');
    });

    it('应该暴露 localConfig', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(vm.localConfig).toBeDefined();
    });

    it('应该暴露 hasErrors', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(typeof vm.hasErrors).toBe('boolean');
    });

    it('应该暴露 validateAll 方法', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(typeof vm.validateAll).toBe('function');
    });

    it('应该暴露 resetConfig 方法', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(typeof vm.resetConfig).toBe('function');
    });

    it('应该暴露 formatJson 方法', () => {
      wrapper = mountComponent();
      const vm = wrapper.vm as any;
      expect(typeof vm.formatJson).toBe('function');
    });
  });

  // ==================== 字段标签格式化测试 ====================

  describe('字段标签格式化', () => {
    it('应该格式化 camelCase 字段名', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ firstName: 'John' }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const field = vm.formFields.find((f: any) => f.key === 'firstName');
      expect(field).toBeDefined();
      expect(field.label).toContain('First');
    });

    it('应该格式化 snake_case 字段名', async () => {
      wrapper = mountComponent({
        baseCard: createBaseCard({ first_name: 'John' }),
      });
      await nextTick();

      const vm = wrapper.vm as any;
      const field = vm.formFields.find((f: any) => f.key === 'first_name');
      expect(field).toBeDefined();
      expect(field.label.toLowerCase()).toContain('first');
    });
  });

  // ==================== 响应式测试 ====================

  describe('响应式', () => {
    it('baseCard 变化时应该重新初始化', async () => {
      wrapper = mountComponent();

      const newBaseCard = createBaseCard({ text: 'New Text' });
      await wrapper.setProps({ baseCard: newBaseCard });

      const vm = wrapper.vm as any;
      expect(vm.localConfig.text).toBe('New Text');
    });

    it('mode prop 变化时应该切换模式', async () => {
      wrapper = mountComponent({ mode: 'form' });

      await wrapper.setProps({ mode: 'json' });

      const vm = wrapper.vm as any;
      expect(vm.currentMode).toBe('json');
    });
  });
});
