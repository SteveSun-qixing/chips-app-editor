/**
 * 封面模板测试
 * @module tests/unit/components/cover-maker/templates
 * @description 测试模板定义、获取和HTML生成功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  templates,
  getTemplateById,
  generateCoverHtml,
  generateImageCoverHtml,
  generateDefaultCoverHtml,
} from '@/components/cover-maker/templates';
import type { TemplateStyle, TemplateConfig } from '@/components/cover-maker/types';

// Mock document.createElement for escapeHtml function
const mockDiv = {
  textContent: '',
  innerHTML: '',
};

Object.defineProperty(mockDiv, 'innerHTML', {
  get() {
    // 模拟 HTML 转义
    return this.textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  set(val) {
    this._innerHTML = val;
  },
});

vi.spyOn(document, 'createElement').mockReturnValue(mockDiv as unknown as HTMLElement);

describe('封面模板模块', () => {
  describe('templates 模板列表', () => {
    it('应该包含8种预设模板', () => {
      expect(templates).toHaveLength(8);
    });

    it('应该包含所有预期的模板ID', () => {
      const expectedIds: TemplateStyle[] = [
        'minimal-white',
        'gradient-blue',
        'dark-theme',
        'geometric',
        'bordered',
        'magazine',
        'news-banner',
        'circle-soft',
      ];

      const actualIds = templates.map((t) => t.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('每个模板应该具有完整的属性', () => {
      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('previewStyle');
        expect(template).toHaveProperty('generateHtml');
        expect(typeof template.generateHtml).toBe('function');
      });
    });

    it('每个模板的名称应该是非空字符串', () => {
      templates.forEach((template) => {
        expect(typeof template.name).toBe('string');
        expect(template.name.length).toBeGreaterThan(0);
      });
    });

    it('每个模板的描述应该是非空字符串', () => {
      templates.forEach((template) => {
        expect(typeof template.description).toBe('string');
        expect(template.description.length).toBeGreaterThan(0);
      });
    });

    it('每个模板的预览样式应该是有效的CSS', () => {
      templates.forEach((template) => {
        expect(typeof template.previewStyle).toBe('string');
        expect(template.previewStyle).toContain('background');
      });
    });
  });

  describe('getTemplateById', () => {
    it('应该根据ID返回正确的模板', () => {
      const template = getTemplateById('minimal-white');
      expect(template).toBeDefined();
      expect(template?.id).toBe('minimal-white');
      expect(template?.name).toBe('简约白底');
    });

    it('应该返回渐变蓝模板', () => {
      const template = getTemplateById('gradient-blue');
      expect(template).toBeDefined();
      expect(template?.id).toBe('gradient-blue');
      expect(template?.name).toBe('渐变蓝');
    });

    it('应该返回深色背景模板', () => {
      const template = getTemplateById('dark-theme');
      expect(template).toBeDefined();
      expect(template?.id).toBe('dark-theme');
      expect(template?.name).toBe('深色背景');
    });

    it('应该返回几何图形模板', () => {
      const template = getTemplateById('geometric');
      expect(template).toBeDefined();
      expect(template?.id).toBe('geometric');
      expect(template?.name).toBe('几何图形');
    });

    it('应该返回纯色边框模板', () => {
      const template = getTemplateById('bordered');
      expect(template).toBeDefined();
      expect(template?.id).toBe('bordered');
      expect(template?.name).toBe('纯色边框');
    });

    it('应该返回杂志风格模板', () => {
      const template = getTemplateById('magazine');
      expect(template).toBeDefined();
      expect(template?.id).toBe('magazine');
      expect(template?.name).toBe('杂志风格');
    });

    it('应该返回新闻风格模板', () => {
      const template = getTemplateById('news-banner');
      expect(template).toBeDefined();
      expect(template?.id).toBe('news-banner');
      expect(template?.name).toBe('新闻风格');
    });

    it('应该返回圆形背景模板', () => {
      const template = getTemplateById('circle-soft');
      expect(template).toBeDefined();
      expect(template?.id).toBe('circle-soft');
      expect(template?.name).toBe('圆形背景');
    });

    it('应该对不存在的ID返回undefined', () => {
      const template = getTemplateById('non-existent' as TemplateStyle);
      expect(template).toBeUndefined();
    });
  });

  describe('generateCoverHtml', () => {
    const baseConfig: TemplateConfig = {
      title: '测试标题',
    };

    const fullConfig: TemplateConfig = {
      title: '完整测试标题',
      subtitle: '副标题内容',
      author: '测试作者',
      date: '2026-02-03',
    };

    const customColorConfig: TemplateConfig = {
      title: '自定义颜色标题',
      primaryColor: '#ff0000',
      backgroundColor: '#00ff00',
    };

    it('应该为所有模板生成有效的HTML', () => {
      templates.forEach((template) => {
        const html = generateCoverHtml(template.id, baseConfig);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html');
        expect(html).toContain('</html>');
        expect(html).toContain(baseConfig.title);
      });
    });

    it('应该在HTML中包含标题', () => {
      const html = generateCoverHtml('minimal-white', baseConfig);
      expect(html).toContain('测试标题');
    });

    it('应该在HTML中包含副标题（如果提供）', () => {
      const html = generateCoverHtml('minimal-white', fullConfig);
      expect(html).toContain('副标题内容');
    });

    it('应该在HTML中包含作者（如果提供）', () => {
      const html = generateCoverHtml('minimal-white', fullConfig);
      expect(html).toContain('测试作者');
    });

    it('应该在HTML中包含日期（如果提供）', () => {
      const html = generateCoverHtml('minimal-white', fullConfig);
      expect(html).toContain('2026-02-03');
    });

    it('应该对不存在的模板抛出错误', () => {
      expect(() => {
        generateCoverHtml('invalid-template' as TemplateStyle, baseConfig);
      }).toThrow('Template not found: invalid-template');
    });

    it('应该支持自定义主色', () => {
      const html = generateCoverHtml('minimal-white', customColorConfig);
      expect(html).toContain('#ff0000');
    });

    it('应该支持自定义背景色', () => {
      const html = generateCoverHtml('minimal-white', customColorConfig);
      expect(html).toContain('#00ff00');
    });

    describe('简约白底模板 (minimal-white)', () => {
      it('应该生成白色背景的HTML', () => {
        const html = generateCoverHtml('minimal-white', baseConfig);
        expect(html).toContain('#ffffff');
      });

      it('应该包含居中布局样式', () => {
        const html = generateCoverHtml('minimal-white', baseConfig);
        expect(html).toContain('align-items: center');
        expect(html).toContain('justify-content: center');
      });
    });

    describe('渐变蓝模板 (gradient-blue)', () => {
      it('应该生成渐变背景', () => {
        const html = generateCoverHtml('gradient-blue', baseConfig);
        expect(html).toContain('linear-gradient');
      });

      it('应该包含白色文字样式', () => {
        const html = generateCoverHtml('gradient-blue', baseConfig);
        expect(html).toContain('color: #ffffff');
      });
    });

    describe('深色背景模板 (dark-theme)', () => {
      it('应该生成深色背景', () => {
        const html = generateCoverHtml('dark-theme', baseConfig);
        expect(html).toContain('#1a1a2e');
      });

      it('应该包含亮色文字样式', () => {
        const html = generateCoverHtml('dark-theme', baseConfig);
        expect(html).toContain('#eaeaea');
      });
    });

    describe('几何图形模板 (geometric)', () => {
      it('应该包含几何背景元素', () => {
        const html = generateCoverHtml('geometric', baseConfig);
        expect(html).toContain('geometric-bg');
      });

      it('应该包含旋转变换', () => {
        const html = generateCoverHtml('geometric', baseConfig);
        expect(html).toContain('transform: rotate');
      });
    });

    describe('纯色边框模板 (bordered)', () => {
      it('应该包含边框元素', () => {
        const html = generateCoverHtml('bordered', baseConfig);
        expect(html).toContain('frame');
        expect(html).toContain('border:');
      });

      it('应该包含分隔线元素', () => {
        const html = generateCoverHtml('bordered', baseConfig);
        expect(html).toContain('divider');
      });
    });

    describe('杂志风格模板 (magazine)', () => {
      it('应该使用衬线字体', () => {
        const html = generateCoverHtml('magazine', baseConfig);
        expect(html).toContain('Georgia');
      });

      it('应该包含强调色条', () => {
        const html = generateCoverHtml('magazine', baseConfig);
        expect(html).toContain('accent');
      });

      it('应该使用底部对齐布局', () => {
        const html = generateCoverHtml('magazine', baseConfig);
        expect(html).toContain('justify-content: flex-end');
      });
    });

    describe('新闻风格模板 (news-banner)', () => {
      it('应该包含横幅元素', () => {
        const html = generateCoverHtml('news-banner', baseConfig);
        expect(html).toContain('banner');
      });

      it('应该包含内容区域', () => {
        const html = generateCoverHtml('news-banner', baseConfig);
        expect(html).toContain('content-area');
      });
    });

    describe('圆形背景模板 (circle-soft)', () => {
      it('应该包含圆形背景元素', () => {
        const html = generateCoverHtml('circle-soft', baseConfig);
        expect(html).toContain('circle-bg');
      });

      it('应该使用圆角样式', () => {
        const html = generateCoverHtml('circle-soft', baseConfig);
        expect(html).toContain('border-radius: 50%');
      });
    });
  });

  describe('generateImageCoverHtml', () => {
    it('应该生成包含图片路径的HTML', () => {
      const imagePath = 'cover.jpg';
      const html = generateImageCoverHtml(imagePath);
      expect(html).toContain('cover.jpg');
    });

    it('应该生成有效的HTML结构', () => {
      const html = generateImageCoverHtml('test.png');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<img');
      expect(html).toContain('</html>');
    });

    it('应该包含图片标签', () => {
      const html = generateImageCoverHtml('image.jpg');
      expect(html).toContain('<img');
      expect(html).toContain('src="image.jpg"');
    });

    it('应该包含图片自适应样式', () => {
      const html = generateImageCoverHtml('test.jpg');
      expect(html).toContain('max-width: 100%');
      expect(html).toContain('max-height: 100%');
      expect(html).toContain('object-fit: contain');
    });

    it('应该包含居中布局', () => {
      const html = generateImageCoverHtml('test.jpg');
      expect(html).toContain('display: flex');
      expect(html).toContain('align-items: center');
      expect(html).toContain('justify-content: center');
    });

    it('应该处理包含特殊字符的路径', () => {
      const imagePath = 'path/to/image with spaces.jpg';
      const html = generateImageCoverHtml(imagePath);
      expect(html).toContain('path/to/image with spaces.jpg');
    });

    it('应该包含alt属性', () => {
      const html = generateImageCoverHtml('test.jpg');
      expect(html).toContain('alt="Cover"');
    });
  });

  describe('generateDefaultCoverHtml', () => {
    it('应该使用minimal-white模板', () => {
      const html = generateDefaultCoverHtml('默认标题');
      // 检查是否包含 minimal-white 模板的特征
      expect(html).toContain('#ffffff');
    });

    it('应该包含传入的标题', () => {
      const title = '我的封面标题';
      const html = generateDefaultCoverHtml(title);
      expect(html).toContain(title);
    });

    it('应该生成有效的HTML结构', () => {
      const html = generateDefaultCoverHtml('测试');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('应该处理空字符串标题', () => {
      const html = generateDefaultCoverHtml('');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('应该处理长标题', () => {
      const longTitle = '这是一个非常长的标题'.repeat(10);
      const html = generateDefaultCoverHtml(longTitle);
      expect(html).toContain(longTitle);
    });

    it('应该处理包含特殊字符的标题', () => {
      const html = generateDefaultCoverHtml('测试 <script>alert("xss")</script>');
      // HTML转义后不应该包含原始的script标签
      expect(html).not.toContain('<script>alert');
    });
  });

  describe('模板HTML安全性', () => {
    it('应该转义HTML特殊字符', () => {
      const maliciousConfig: TemplateConfig = {
        title: '<script>alert("xss")</script>',
        subtitle: '<img src=x onerror=alert(1)>',
        author: '"><script>',
      };

      templates.forEach((template) => {
        const html = generateCoverHtml(template.id, maliciousConfig);
        // 检查是否进行了HTML转义
        expect(html).not.toContain('<script>alert("xss")</script>');
      });
    });
  });

  describe('模板配置默认值', () => {
    it('应该在没有副标题时不渲染副标题元素', () => {
      const config: TemplateConfig = { title: '仅标题' };
      const html = generateCoverHtml('minimal-white', config);
      // 检查没有空的subtitle class元素
      expect(html).not.toContain('class="subtitle"></p>');
    });

    it('应该在没有作者和日期时不渲染meta元素', () => {
      const config: TemplateConfig = { title: '仅标题' };
      const html = generateCoverHtml('minimal-white', config);
      // 检查没有空的meta元素
      expect(html).not.toContain('class="meta"></p>');
    });
  });
});
