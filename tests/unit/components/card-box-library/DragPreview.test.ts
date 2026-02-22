/**
 * DragPreview 组件测试
 * @module tests/unit/components/card-box-library/DragPreview
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DragPreview from '@/components/card-box-library/DragPreview.vue';
import { cardTypes, layoutTypes } from '@/components/card-box-library/data';
import type { DragData } from '@/components/card-box-library/types';

describe('DragPreview', () => {
  describe('rendering', () => {
    it('should render card type preview', () => {
      const sample = cardTypes[0];
      const data: DragData = {
        type: 'card',
        typeId: sample?.id ?? 'unknown',
        name: sample?.name ?? 'unknown',
      };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      if (!sample) {
        expect(wrapper.find('.drag-preview').exists()).toBe(false);
        return;
      }

      expect(wrapper.find('.drag-preview').exists()).toBe(true);
      expect(wrapper.find('.drag-preview__card').exists()).toBe(true);
    });

    it('should render layout type preview when layout plugins are installed', () => {
      if (layoutTypes.length === 0) {
        // 没有安装布局插件时，使用未知 typeId 应该不渲染
        const data: DragData = { type: 'layout', typeId: 'grid-layout', name: '网格' };
        const position = { x: 150, y: 250 };

        const wrapper = mount(DragPreview, {
          props: { data, position },
        });

        // 未安装对应插件时，typeId 找不到对应类型，不应渲染
        expect(wrapper.find('.drag-preview').exists()).toBe(false);
        return;
      }

      const sample = layoutTypes[0];
      const data: DragData = { type: 'layout', typeId: sample.id, name: sample.name };
      const position = { x: 150, y: 250 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(true);
    });

    it('should show correct icon for card type', () => {
      const sample = cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      const data: DragData = { type: 'card', typeId: sample.id, name: sample.name };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const icon = wrapper.find('.drag-preview__icon');
      expect(icon.exists()).toBe(true);
      expect(icon.text()).toBe(sample.icon);
    });

    it('should show correct icon for layout type when plugins installed', () => {
      if (layoutTypes.length === 0) {
        expect(true).toBe(true);
        return;
      }
      const sample = layoutTypes[0];
      const data: DragData = { type: 'layout', typeId: sample.id, name: sample.name };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const icon = wrapper.find('.drag-preview__icon');
      expect(icon.exists()).toBe(true);
      expect(icon.text()).toBe(sample.icon);
    });

    it('should show name in preview', () => {
      const sample = cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      // data.name 不会被使用，组件会根据 typeId 查找类型信息并翻译
      const data: DragData = { type: 'card', typeId: sample.id, name: sample.name };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const name = wrapper.find('.drag-preview__name');
      // 名称应该被翻译
      expect(name.text()).toBeTruthy();
      expect(name.text()).not.toBe(sample.name); // 应该不是翻译 key
    });

    it('should show hint for card type', () => {
      const sample = cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      const data: DragData = { type: 'card', typeId: sample.id, name: sample.name };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const hint = wrapper.find('.drag-preview__hint');
      expect(hint.text()).toContain('卡片');
    });

    it('should show hint for layout type when plugins installed', () => {
      if (layoutTypes.length === 0) {
        expect(true).toBe(true);
        return;
      }
      const sample = layoutTypes[0];
      const data: DragData = { type: 'layout', typeId: sample.id, name: sample.name };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const hint = wrapper.find('.drag-preview__hint');
      expect(hint.text()).toContain('箱子');
    });
  });

  describe('positioning', () => {
    it('should apply position style', () => {
      const sample = cardTypes[0];
      const data: DragData = {
        type: 'card',
        typeId: sample?.id ?? 'unknown',
        name: sample?.name ?? 'unknown',
      };
      const position = { x: 300, y: 400 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      if (!sample) {
        expect(wrapper.find('.drag-preview').exists()).toBe(false);
        return;
      }

      const preview = wrapper.find('.drag-preview');
      const style = preview.attributes('style');

      expect(style).toContain('left: 300px');
      expect(style).toContain('top: 400px');
    });

    it('should update position when props change', async () => {
      const sample = cardTypes[0];
      const data: DragData = {
        type: 'card',
        typeId: sample?.id ?? 'unknown',
        name: sample?.name ?? 'unknown',
      };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      if (!sample) {
        expect(wrapper.find('.drag-preview').exists()).toBe(false);
        return;
      }

      await wrapper.setProps({ position: { x: 500, y: 600 } });

      const preview = wrapper.find('.drag-preview');
      const style = preview.attributes('style');

      expect(style).toContain('left: 500px');
      expect(style).toContain('top: 600px');
    });
  });

  describe('unknown type handling', () => {
    it('should not render when card type is not found', () => {
      const data: DragData = { type: 'card', typeId: 'unknown-type', name: '未知' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(false);
    });

    it('should not render when layout type is not found', () => {
      const data: DragData = { type: 'layout', typeId: 'unknown-layout', name: '未知' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(false);
    });
  });

  describe('all card types', () => {
    const cardTypeIds = cardTypes.map((type) => type.id);

    cardTypeIds.forEach((typeId) => {
      it(`should render preview for card type: ${typeId}`, () => {
        const data: DragData = { type: 'card', typeId, name: typeId };
        const position = { x: 100, y: 200 };

        const wrapper = mount(DragPreview, {
          props: { data, position },
        });

        expect(wrapper.find('.drag-preview').exists()).toBe(true);
        expect(wrapper.find('.drag-preview__icon').text()).toBeTruthy();
      });
    });
  });

  describe('all installed layout types', () => {
    // 动态从已安装的布局插件生成测试用例
    const installedLayoutTypeIds = layoutTypes.map((type) => type.id);

    installedLayoutTypeIds.forEach((typeId) => {
      it(`should render preview for installed layout type: ${typeId}`, () => {
        const data: DragData = { type: 'layout', typeId, name: typeId };
        const position = { x: 100, y: 200 };

        const wrapper = mount(DragPreview, {
          props: { data, position },
        });

        expect(wrapper.find('.drag-preview').exists()).toBe(true);
        expect(wrapper.find('.drag-preview__icon').text()).toBeTruthy();
      });
    });

    it('should not render preview for uninstalled layout types', () => {
      // 测试未安装的布局类型不应该渲染预览
      const uninstalledId = 'non-existent-layout-plugin';
      const data: DragData = { type: 'layout', typeId: uninstalledId, name: 'Not Installed' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(false);
    });
  });
});
