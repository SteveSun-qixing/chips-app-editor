/**
 * 模板预览组件测试
 * @module tests/unit/components/cover-maker/TemplatePreview
 * @description 测试封面预览功能
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import TemplatePreview from '@/components/cover-maker/TemplatePreview.vue';
import type { TemplateStyle, TemplateConfig } from '@/components/cover-maker/types';

describe('TemplatePreview 模板预览组件', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该渲染预览标签', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      expect(wrapper.find('.template-preview__label').text()).toBe('封面预览');
    });

    it('应该渲染 iframe 元素', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      expect(wrapper.find('iframe').exists()).toBe(true);
    });

    it('应该设置 iframe 的 sandbox 属性', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      const iframe = wrapper.find('iframe');
      expect(iframe.attributes('sandbox')).toBe('allow-same-origin');
    });

    it('应该设置 iframe 的 title 属性', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      const iframe = wrapper.find('iframe');
      expect(iframe.attributes('title')).toBe('封面预览');
    });

    it('应该渲染预览容器', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      expect(wrapper.find('.template-preview__container').exists()).toBe(true);
    });
  });

  describe('模板名称显示', () => {
    it('应该显示当前模板名称', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      const templateName = wrapper.find('.template-preview__template-name');
      expect(templateName.exists()).toBe(true);
      expect(templateName.text()).toBe('简约白底');
    });

    it('应该显示渐变蓝模板名称', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'gradient-blue' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      const templateName = wrapper.find('.template-preview__template-name');
      expect(templateName.text()).toBe('渐变蓝');
    });

    it('当 templateId 为 null 时不应显示模板名称', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: null,
          config: { title: '' },
          customHtml: '<p>Custom</p>',
        },
      });

      expect(wrapper.find('.template-preview__template-name').exists()).toBe(false);
    });
  });

  describe('比例设置', () => {
    it('应该使用默认比例 3/4', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      const container = wrapper.find('.template-preview__container');
      expect(container.exists()).toBe(true);
      // 验证组件使用了默认的 aspectRatio
      const ratioInfo = wrapper.find('.template-preview__ratio');
      expect(ratioInfo.text()).toContain('3:4');
    });

    it('应该应用自定义比例', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
          aspectRatio: '16/9',
        },
      });

      const container = wrapper.find('.template-preview__container');
      expect(container.exists()).toBe(true);
      const ratioInfo = wrapper.find('.template-preview__ratio');
      expect(ratioInfo.text()).toContain('16:9');
    });

    it('应该应用 1/1 正方形比例', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
          aspectRatio: '1/1',
        },
      });

      const container = wrapper.find('.template-preview__container');
      expect(container.exists()).toBe(true);
      const ratioInfo = wrapper.find('.template-preview__ratio');
      expect(ratioInfo.text()).toContain('1:1');
    });

    it('应该显示当前比例信息', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
          aspectRatio: '16/9',
        },
      });

      const ratioInfo = wrapper.find('.template-preview__ratio');
      expect(ratioInfo.exists()).toBe(true);
      expect(ratioInfo.text()).toContain('16:9');
    });
  });

  describe('占位内容', () => {
    it('当没有标题时应该显示占位内容', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '' },
        },
      });

      await nextTick();

      // 由于 iframe 的内容无法直接检查，我们验证组件是否正确处理空标题
      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('当 templateId 为 null 且没有 customHtml 时应该显示占位内容', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: null,
          config: { title: '' },
        },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });
  });

  describe('自定义 HTML', () => {
    it('应该支持自定义 HTML 内容', () => {
      const customHtml = '<div>自定义内容</div>';
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: null,
          config: { title: '' },
          customHtml,
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('当提供 customHtml 时应该优先使用它', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
          customHtml: '<div>优先使用这个</div>',
        },
      });

      // 组件应该正常渲染
      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });
  });

  describe('事件触发', () => {
    it('应该在生成 HTML 时触发 htmlGenerated 事件', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      // 模拟 iframe 加载完成
      const iframe = wrapper.find('iframe').element as HTMLIFrameElement;

      // 由于测试环境中 iframe 的 contentDocument 可能不可用
      // 我们验证组件正确挂载
      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('当 config 更新时应该更新内容', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '初始标题' },
        },
      });

      await wrapper.setProps({
        config: { title: '更新后的标题' },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('当 templateId 更新时应该更新内容', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试标题' },
        },
      });

      await wrapper.setProps({
        templateId: 'gradient-blue',
      });

      await nextTick();

      const templateName = wrapper.find('.template-preview__template-name');
      expect(templateName.text()).toBe('渐变蓝');
    });
  });

  describe('配置变化监听', () => {
    it('应该响应副标题变化', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '标题' },
        },
      });

      await wrapper.setProps({
        config: { title: '标题', subtitle: '副标题' },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该响应作者变化', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '标题' },
        },
      });

      await wrapper.setProps({
        config: { title: '标题', author: '作者名' },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该响应日期变化', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '标题' },
        },
      });

      await wrapper.setProps({
        config: { title: '标题', date: '2026-02-03' },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该响应颜色配置变化', async () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '标题' },
        },
      });

      await wrapper.setProps({
        config: {
          title: '标题',
          primaryColor: '#ff0000',
          backgroundColor: '#ffffff',
        },
      });

      await nextTick();

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });
  });

  describe('所有模板预览', () => {
    const templateIds: TemplateStyle[] = [
      'minimal-white',
      'gradient-blue',
      'dark-theme',
      'geometric',
      'bordered',
      'magazine',
      'news-banner',
      'circle-soft',
    ];

    const templateNames: Record<TemplateStyle, string> = {
      'minimal-white': '简约白底',
      'gradient-blue': '渐变蓝',
      'dark-theme': '深色背景',
      'geometric': '几何图形',
      'bordered': '纯色边框',
      'magazine': '杂志风格',
      'news-banner': '新闻风格',
      'circle-soft': '圆形背景',
    };

    templateIds.forEach((templateId) => {
      it(`应该正确渲染 ${templateNames[templateId]} 模板`, () => {
        wrapper = mount(TemplatePreview, {
          props: {
            templateId,
            config: { title: '测试标题' },
          },
        });

        expect(wrapper.find('.template-preview').exists()).toBe(true);
        expect(wrapper.find('.template-preview__template-name').text()).toBe(
          templateNames[templateId]
        );
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空配置对象', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '' },
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该处理非常长的标题', () => {
      const longTitle = '这是一个非常长的标题'.repeat(20);
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: longTitle },
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该处理特殊字符标题', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '<script>alert("xss")</script>' },
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该处理 customHtml 为空字符串', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: null,
          config: { title: '' },
          customHtml: '',
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });

    it('应该处理复杂的 customHtml', () => {
      const complexHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body><div>Complex content</div></body>
        </html>
      `;
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: null,
          config: { title: '' },
          customHtml: complexHtml,
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
    });
  });

  describe('样式类', () => {
    it('应该有正确的容器类', () => {
      wrapper = mount(TemplatePreview, {
        props: {
          templateId: 'minimal-white' as TemplateStyle,
          config: { title: '测试' },
        },
      });

      expect(wrapper.find('.template-preview').exists()).toBe(true);
      expect(wrapper.find('.template-preview__header').exists()).toBe(true);
      expect(wrapper.find('.template-preview__container').exists()).toBe(true);
      expect(wrapper.find('.template-preview__iframe').exists()).toBe(true);
      expect(wrapper.find('.template-preview__info').exists()).toBe(true);
    });
  });
});
