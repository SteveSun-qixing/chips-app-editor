/**
 * CoverMaker 封面制作器组件测试
 * @module tests/unit/components/cover-maker/CoverMaker
 * @description 测试封面制作器的主要功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { nextTick, Teleport } from 'vue';
import CoverMaker from '@/components/cover-maker/CoverMaker.vue';
import TemplateGrid from '@/components/cover-maker/TemplateGrid.vue';
import TemplatePreview from '@/components/cover-maker/TemplatePreview.vue';
import type { CoverCreationMode, CoverData } from '@/components/cover-maker/types';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectUrl = 'blob:mock-url-123';
global.URL.createObjectURL = vi.fn(() => mockObjectUrl);
global.URL.revokeObjectURL = vi.fn();

describe('CoverMaker 封面制作器组件', () => {
  let wrapper: VueWrapper;

  const mountComponent = (props = {}) => {
    return mount(CoverMaker, {
      props: {
        cardId: 'test-card-123',
        visible: true,
        ...props,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('渲染', () => {
    it('当 visible 为 false 时不应该渲染', () => {
      wrapper = mountComponent({ visible: false });

      expect(wrapper.find('.cover-maker-overlay').exists()).toBe(false);
    });

    it('当 visible 为 true 时应该渲染', () => {
      wrapper = mountComponent({ visible: true });

      expect(wrapper.find('.cover-maker-overlay').exists()).toBe(true);
    });

    it('应该渲染标题 "封面制作器"', () => {
      wrapper = mountComponent();

      expect(wrapper.find('.cover-maker__title').text()).toBe('封面制作器');
    });

    it('应该渲染关闭按钮', () => {
      wrapper = mountComponent();

      expect(wrapper.find('.cover-maker__close').exists()).toBe(true);
    });

    it('应该渲染取消和保存按钮', () => {
      wrapper = mountComponent();

      const buttons = wrapper.findAll('.cover-maker__btn');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      expect(wrapper.find('.cover-maker__btn--secondary').text()).toBe('取消');
      expect(wrapper.find('.cover-maker__btn--primary').text()).toBe('保存封面');
    });
  });

  describe('模式选择', () => {
    it('应该渲染4个模式按钮', () => {
      wrapper = mountComponent();

      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      expect(modeButtons).toHaveLength(4);
    });

    it('应该包含正确的模式选项', () => {
      wrapper = mountComponent();

      const modeNames = wrapper.findAll('.cover-maker__mode-name');
      const names = modeNames.map((el) => el.text());

      expect(names).toContain('选择图片');
      expect(names).toContain('粘贴代码');
      expect(names).toContain('上传压缩包');
      expect(names).toContain('快速制作');
    });

    it('默认应该选中模板模式', () => {
      wrapper = mountComponent();

      const activeButton = wrapper.find('.cover-maker__mode-btn--active');
      expect(activeButton.exists()).toBe(true);
      expect(activeButton.find('.cover-maker__mode-name').text()).toBe('快速制作');
    });

    it('应该能切换到图片模式', async () => {
      wrapper = mountComponent();

      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      const imageButton = modeButtons[0]; // 第一个是图片模式
      await imageButton.trigger('click');

      expect(imageButton.classes()).toContain('cover-maker__mode-btn--active');
    });

    it('应该能切换到 HTML 模式', async () => {
      wrapper = mountComponent();

      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      const htmlButton = modeButtons[1]; // 第二个是 HTML 模式
      await htmlButton.trigger('click');

      expect(htmlButton.classes()).toContain('cover-maker__mode-btn--active');
    });

    it('应该能切换到 ZIP 模式', async () => {
      wrapper = mountComponent();

      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      const zipButton = modeButtons[2]; // 第三个是 ZIP 模式
      await zipButton.trigger('click');

      expect(zipButton.classes()).toContain('cover-maker__mode-btn--active');
    });

    it('应该能切换到模板模式', async () => {
      wrapper = mountComponent();

      // 先切换到其他模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[0].trigger('click');

      // 再切换回模板模式
      const templateButton = modeButtons[3];
      await templateButton.trigger('click');

      expect(templateButton.classes()).toContain('cover-maker__mode-btn--active');
    });
  });

  describe('图片模式', () => {
    beforeEach(async () => {
      wrapper = mountComponent();

      // 切换到图片模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[0].trigger('click');
    });

    it('应该显示图片上传区域', () => {
      expect(wrapper.find('.cover-maker__upload-area').exists()).toBe(true);
    });

    it('应该显示文件输入框', () => {
      const fileInput = wrapper.find('input[type="file"][accept="image/*"]');
      expect(fileInput.exists()).toBe(true);
    });

    it('应该显示上传提示文字', () => {
      expect(wrapper.find('.cover-maker__upload-text').text()).toContain('点击或拖放图片到此处');
    });

    it('应该显示支持的格式提示', () => {
      expect(wrapper.find('.cover-maker__upload-hint').text()).toContain('JPG');
      expect(wrapper.find('.cover-maker__upload-hint').text()).toContain('PNG');
    });

    it('选择图片前保存按钮应该被禁用', () => {
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('HTML 模式', () => {
    beforeEach(async () => {
      wrapper = mountComponent();

      // 切换到 HTML 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[1].trigger('click');
    });

    it('应该显示代码输入区域', () => {
      expect(wrapper.find('.cover-maker__code-input').exists()).toBe(true);
    });

    it('应该显示 HTML 模式描述', () => {
      const description = wrapper.find('.cover-maker__description');
      expect(description.text()).toContain('HTML 代码');
    });

    it('空代码时保存按钮应该被禁用', () => {
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('输入代码后保存按钮应该启用', async () => {
      const textarea = wrapper.find('.cover-maker__code-input');
      await textarea.setValue('<div>Test</div>');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeUndefined();
    });

    it('应该能输入 HTML 代码', async () => {
      const textarea = wrapper.find('.cover-maker__code-input');
      const testHtml = '<html><body>Test</body></html>';
      await textarea.setValue(testHtml);

      expect((textarea.element as HTMLTextAreaElement).value).toBe(testHtml);
    });
  });

  describe('ZIP 模式', () => {
    beforeEach(async () => {
      wrapper = mountComponent();

      // 切换到 ZIP 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[2].trigger('click');
    });

    it('应该显示 ZIP 上传区域', () => {
      expect(wrapper.find('.cover-maker__upload-area').exists()).toBe(true);
    });

    it('应该显示 ZIP 文件输入框', () => {
      const fileInput = wrapper.find('input[type="file"][accept=".zip,application/zip"]');
      expect(fileInput.exists()).toBe(true);
    });

    it('应该显示 ZIP 上传提示', () => {
      expect(wrapper.find('.cover-maker__upload-text').text()).toContain('ZIP');
    });

    it('应该显示 index.html 要求提示', () => {
      expect(wrapper.find('.cover-maker__notice-text').text()).toContain('index.html');
    });

    it('选择 ZIP 前保存按钮应该被禁用', () => {
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('模板模式', () => {
    beforeEach(() => {
      wrapper = mountComponent();
    });

    it('应该默认显示模板模式内容', () => {
      expect(wrapper.find('.cover-maker__description').text()).toContain('预设模板');
    });

    it('应该渲染 TemplateGrid 组件', () => {
      expect(wrapper.findComponent(TemplateGrid).exists()).toBe(true);
    });

    it('应该渲染 TemplatePreview 组件', () => {
      expect(wrapper.findComponent(TemplatePreview).exists()).toBe(true);
    });

    it('应该显示标题输入框', () => {
      const titleInput = wrapper.find('input[placeholder="输入封面主标题"]');
      expect(titleInput.exists()).toBe(true);
    });

    it('应该显示副标题输入框', () => {
      const subtitleInput = wrapper.find('input[placeholder="输入副标题（可选）"]');
      expect(subtitleInput.exists()).toBe(true);
    });

    it('应该显示作者输入框', () => {
      const authorInput = wrapper.find('input[placeholder="作者名称"]');
      expect(authorInput.exists()).toBe(true);
    });

    it('应该显示日期输入框', () => {
      const dateInput = wrapper.find('input[placeholder*="2026"]');
      expect(dateInput.exists()).toBe(true);
    });

    it('标题为必填项，应该有必填标记', () => {
      expect(wrapper.find('.cover-maker__required').exists()).toBe(true);
    });

    it('没有标题时保存按钮应该被禁用', () => {
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('输入标题后保存按钮应该启用', async () => {
      const titleInput = wrapper.find('input[placeholder="输入封面主标题"]');
      await titleInput.setValue('我的封面标题');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeUndefined();
    });

    it('应该能选择不同的模板', async () => {
      const templateGrid = wrapper.findComponent(TemplateGrid);
      await templateGrid.vm.$emit('update:modelValue', 'gradient-blue');

      await nextTick();

      // 验证模板已更新（通过 TemplatePreview 组件的 props）
      const templatePreview = wrapper.findComponent(TemplatePreview);
      expect(templatePreview.props('templateId')).toBe('gradient-blue');
    });
  });

  describe('封面比例选择', () => {
    beforeEach(() => {
      wrapper = mountComponent();
    });

    it('应该显示比例选择器', () => {
      expect(wrapper.find('.cover-maker__select').exists()).toBe(true);
    });

    it('应该有多个比例选项', () => {
      const options = wrapper.findAll('.cover-maker__select option');
      expect(options.length).toBeGreaterThan(1);
    });

    it('应该包含常见比例选项', () => {
      const select = wrapper.find('.cover-maker__select');
      const html = select.html();

      expect(html).toContain('1:1');
      expect(html).toContain('3:4');
      expect(html).toContain('16:9');
    });

    it('应该能更改比例', async () => {
      const select = wrapper.find('.cover-maker__select');
      await select.setValue('16/9');

      expect((select.element as HTMLSelectElement).value).toBe('16/9');
    });
  });

  describe('关闭功能', () => {
    beforeEach(() => {
      wrapper = mountComponent();
    });

    it('点击关闭按钮应该触发 close 事件', async () => {
      const closeButton = wrapper.find('.cover-maker__close');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('点击取消按钮应该触发 close 事件', async () => {
      const cancelButton = wrapper.find('.cover-maker__btn--secondary');
      await cancelButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('点击遮罩层应该触发 close 事件', async () => {
      const overlay = wrapper.find('.cover-maker-overlay');
      await overlay.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('点击内部内容不应该触发 close 事件', async () => {
      const content = wrapper.find('.cover-maker');
      await content.trigger('click');

      // close 事件不应该被触发（或者如果有其他点击也触发了，数量应该为 0）
      const closeEvents = wrapper.emitted('close');
      expect(closeEvents).toBeFalsy();
    });
  });

  describe('保存功能 - HTML 模式', () => {
    it('应该在保存 HTML 模式时发出正确的数据', async () => {
      wrapper = mountComponent();

      // 切换到 HTML 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[1].trigger('click');

      // 输入 HTML 代码
      const textarea = wrapper.find('.cover-maker__code-input');
      const testHtml = '<div>Test HTML</div>';
      await textarea.setValue(testHtml);

      // 点击保存
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      await saveButton.trigger('click');

      const saveEvents = wrapper.emitted('save') as CoverData[][];
      expect(saveEvents).toBeTruthy();
      expect(saveEvents[0][0]).toEqual({
        mode: 'html',
        htmlContent: testHtml,
      });
    });
  });

  describe('保存功能 - 模板模式', () => {
    it('应该在保存模板模式时发出正确的数据', async () => {
      wrapper = mountComponent();

      // 输入标题
      const titleInput = wrapper.find('input[placeholder="输入封面主标题"]');
      await titleInput.setValue('测试封面');

      // 模拟 HTML 生成事件
      const templatePreview = wrapper.findComponent(TemplatePreview);
      await templatePreview.vm.$emit('htmlGenerated', '<html>Generated HTML</html>');

      await nextTick();

      // 点击保存
      const saveButton = wrapper.find('.cover-maker__btn--primary');
      await saveButton.trigger('click');

      const saveEvents = wrapper.emitted('save') as CoverData[][];
      expect(saveEvents).toBeTruthy();
      expect(saveEvents[0][0].mode).toBe('template');
      expect(saveEvents[0][0].templateConfig).toBeDefined();
      expect(saveEvents[0][0].templateConfig?.config.title).toBe('测试封面');
    });
  });

  describe('键盘事件', () => {
    it('按下 Escape 键应该关闭组件', async () => {
      wrapper = mountComponent();

      // 模拟按下 Escape 键
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      await nextTick();

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('props', () => {
    it('应该接收 cardId prop', () => {
      wrapper = mountComponent({ cardId: 'my-card-id' });

      expect(wrapper.props('cardId')).toBe('my-card-id');
    });

    it('应该接收 currentCoverHtml prop', () => {
      const coverHtml = '<div>Existing cover</div>';
      wrapper = mountComponent({ currentCoverHtml: coverHtml });

      expect(wrapper.props('currentCoverHtml')).toBe(coverHtml);
    });

    it('应该接收 visible prop', () => {
      wrapper = mountComponent({ visible: false });

      expect(wrapper.props('visible')).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理空 cardId', () => {
      wrapper = mountComponent({ cardId: '' });

      expect(wrapper.find('.cover-maker').exists()).toBe(true);
    });

    it('应该在多次切换模式后正确显示内容', async () => {
      wrapper = mountComponent();

      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');

      // 切换到各个模式
      await modeButtons[0].trigger('click'); // 图片
      await modeButtons[1].trigger('click'); // HTML
      await modeButtons[2].trigger('click'); // ZIP
      await modeButtons[3].trigger('click'); // 模板

      // 验证最终显示的是模板模式
      expect(wrapper.findComponent(TemplateGrid).exists()).toBe(true);
    });

    it('应该在 visible 变化时正确响应', async () => {
      wrapper = mountComponent({ visible: false });

      expect(wrapper.find('.cover-maker-overlay').exists()).toBe(false);

      await wrapper.setProps({ visible: true });
      expect(wrapper.find('.cover-maker-overlay').exists()).toBe(true);

      await wrapper.setProps({ visible: false });
      expect(wrapper.find('.cover-maker-overlay').exists()).toBe(false);
    });
  });

  describe('canSave 计算属性', () => {
    it('图片模式：无图片时应该返回 false', async () => {
      wrapper = mountComponent();

      // 切换到图片模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[0].trigger('click');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('HTML 模式：空代码时应该返回 false', async () => {
      wrapper = mountComponent();

      // 切换到 HTML 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[1].trigger('click');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('HTML 模式：仅空格时应该返回 false', async () => {
      wrapper = mountComponent();

      // 切换到 HTML 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[1].trigger('click');

      const textarea = wrapper.find('.cover-maker__code-input');
      await textarea.setValue('   ');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('ZIP 模式：无文件时应该返回 false', async () => {
      wrapper = mountComponent();

      // 切换到 ZIP 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[2].trigger('click');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('模板模式：无标题时应该返回 false', async () => {
      wrapper = mountComponent();

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('模板模式：仅空格标题时应该返回 false', async () => {
      wrapper = mountComponent();

      const titleInput = wrapper.find('input[placeholder="输入封面主标题"]');
      await titleInput.setValue('   ');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeDefined();
    });

    it('模板模式：有标题时应该返回 true', async () => {
      wrapper = mountComponent();

      const titleInput = wrapper.find('input[placeholder="输入封面主标题"]');
      await titleInput.setValue('有效的标题');

      const saveButton = wrapper.find('.cover-maker__btn--primary');
      expect(saveButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('预览功能', () => {
    it('HTML 模式应该显示预览', async () => {
      wrapper = mountComponent();

      // 切换到 HTML 模式
      const modeButtons = wrapper.findAll('.cover-maker__mode-btn');
      await modeButtons[1].trigger('click');

      await nextTick();

      // HTML 模式下也应该有 TemplatePreview 组件用于预览
      expect(wrapper.findComponent(TemplatePreview).exists()).toBe(true);
    });

    it('模板模式应该显示预览', () => {
      wrapper = mountComponent();

      expect(wrapper.findComponent(TemplatePreview).exists()).toBe(true);
    });
  });
});
