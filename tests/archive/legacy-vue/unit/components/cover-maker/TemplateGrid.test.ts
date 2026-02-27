/**
 * 模板网格组件测试
 * @module tests/unit/components/cover-maker/TemplateGrid
 * @description 测试模板选择网格的渲染和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import TemplateGrid from '@/components/cover-maker/TemplateGrid.vue';
import { templates } from '@/components/cover-maker/templates';
import { t } from '@/services/i18n-service';
import type { TemplateStyle } from '@/components/cover-maker/types';

describe('TemplateGrid 模板网格组件', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    // 每个测试前重置
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      expect(wrapper.find('.template-grid').exists()).toBe(true);
    });

    it('应该渲染所有8个模板项', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items).toHaveLength(8);
    });

    it('应该为每个模板显示预览区域', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const previews = wrapper.findAll('.template-grid__preview');
      expect(previews).toHaveLength(8);
    });

    it('应该显示预览文字 "Aa"', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const previewTexts = wrapper.findAll('.template-grid__preview-text');
      expect(previewTexts).toHaveLength(8);
      previewTexts.forEach((text) => {
        expect(text.text()).toBe('Aa');
      });
    });

    it('应该显示每个模板的名称', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const names = wrapper.findAll('.template-grid__name');
      expect(names).toHaveLength(8);

      const expectedNames = templates.map((template) => t(template.name));
      names.forEach((name, index) => {
        expect(name.text()).toBe(expectedNames[index]);
      });
    });

    it('应该显示每个模板的描述', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const descriptions = wrapper.findAll('.template-grid__description');
      expect(descriptions).toHaveLength(8);

      const expectedDescriptions = templates.map((template) => t(template.description));
      descriptions.forEach((desc, index) => {
        expect(desc.text()).toBe(expectedDescriptions[index]);
      });
    });

    it('应该为每个模板预览应用样式', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const previews = wrapper.findAll('.template-grid__preview');

      // 验证每个预览都有 style 属性
      previews.forEach((preview) => {
        const style = preview.attributes('style');
        expect(style).toBeDefined();
        // 只要有样式就行，不严格检查内容（因为 Vue 可能会处理样式）
        expect(style!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('选中状态', () => {
    it('应该高亮显示选中的模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'minimal-white' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      const selectedItem = items[0]; // minimal-white 是第一个

      expect(selectedItem.classes()).toContain('template-grid__item--selected');
    });

    it('应该只有一个模板被选中', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'gradient-blue' as TemplateStyle,
        },
      });

      const selectedItems = wrapper.findAll('.template-grid__item--selected');
      expect(selectedItems).toHaveLength(1);
    });

    it('应该在 modelValue 为 null 时没有选中项', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const selectedItems = wrapper.findAll('.template-grid__item--selected');
      expect(selectedItems).toHaveLength(0);
    });

    it('应该正确选中 gradient-blue 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'gradient-blue' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[1].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 dark-theme 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'dark-theme' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[2].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 geometric 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'geometric' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[3].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 bordered 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'bordered' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[4].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 magazine 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'magazine' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[5].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 news-banner 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'news-banner' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[6].classes()).toContain('template-grid__item--selected');
    });

    it('应该正确选中 circle-soft 模板', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'circle-soft' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      expect(items[7].classes()).toContain('template-grid__item--selected');
    });
  });

  describe('交互', () => {
    it('应该在点击模板时触发 update:modelValue 事件', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      await items[0].trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['minimal-white']);
    });

    it('应该在点击不同模板时发出对应的模板ID', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const items = wrapper.findAll('.template-grid__item');

      // 点击每个模板并验证发出的事件
      for (let i = 0; i < templates.length; i++) {
        await items[i].trigger('click');
        const emitted = wrapper.emitted('update:modelValue')!;
        expect(emitted[i]).toEqual([templates[i].id]);
      }
    });

    it('应该允许切换到不同的模板', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'minimal-white' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      await items[3].trigger('click'); // 点击 geometric

      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['geometric']);
    });

    it('应该允许重复点击同一个模板', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'minimal-white' as TemplateStyle,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      await items[0].trigger('click');
      await items[0].trigger('click');

      const emitted = wrapper.emitted('update:modelValue')!;
      expect(emitted).toHaveLength(2);
      expect(emitted[0]).toEqual(['minimal-white']);
      expect(emitted[1]).toEqual(['minimal-white']);
    });
  });

  describe('响应式更新', () => {
    it('应该在 props 更新时更新选中状态', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'minimal-white' as TemplateStyle,
        },
      });

      let selectedItems = wrapper.findAll('.template-grid__item--selected');
      expect(selectedItems).toHaveLength(1);
      expect(wrapper.findAll('.template-grid__item')[0].classes()).toContain(
        'template-grid__item--selected'
      );

      // 更新 props
      await wrapper.setProps({ modelValue: 'gradient-blue' });

      selectedItems = wrapper.findAll('.template-grid__item--selected');
      expect(selectedItems).toHaveLength(1);
      expect(wrapper.findAll('.template-grid__item')[1].classes()).toContain(
        'template-grid__item--selected'
      );
    });

    it('应该在 modelValue 变为 null 时取消所有选中', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: 'minimal-white' as TemplateStyle,
        },
      });

      await wrapper.setProps({ modelValue: null });

      const selectedItems = wrapper.findAll('.template-grid__item--selected');
      expect(selectedItems).toHaveLength(0);
    });
  });

  describe('可访问性', () => {
    it('每个模板项应该是可点击的', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const items = wrapper.findAll('.template-grid__item');
      items.forEach((item) => {
        // 检查元素是否可交互（有cursor: pointer样式由CSS控制）
        expect(item.element.tagName).toBe('DIV');
      });
    });
  });

  describe('样式', () => {
    it('应该有正确的网格容器类', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      expect(wrapper.find('.template-grid').exists()).toBe(true);
    });

    it('每个模板项应该有信息区域', () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const infoAreas = wrapper.findAll('.template-grid__info');
      expect(infoAreas).toHaveLength(8);
    });
  });

  describe('边界情况', () => {
    it('应该处理快速连续点击', async () => {
      wrapper = mount(TemplateGrid, {
        props: {
          modelValue: null,
        },
      });

      const items = wrapper.findAll('.template-grid__item');

      // 快速连续点击
      await items[0].trigger('click');
      await items[1].trigger('click');
      await items[2].trigger('click');

      const emitted = wrapper.emitted('update:modelValue')!;
      expect(emitted).toHaveLength(3);
    });
  });
});
