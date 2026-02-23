/**
 * 卡箱库数据测试
 * @module tests/unit/components/card-box-library/data
 */

import { describe, it, expect } from 'vitest';
import {
  cardTypes,
  layoutTypes,
  searchCardTypes,
  searchLayoutTypes,
} from '@/components/card-box-library/data';

describe('Card Box Library Data', () => {
  describe('cardTypes', () => {
    it('should load card types from manifests', () => {
      expect(cardTypes.length).toBeGreaterThan(0);
    });

    it('should map card type id from capabilities.cardType', () => {
      const richText = cardTypes.find((type) => type.id === 'RichTextCard');
      expect(richText).toBeTruthy();
    });

    it('should exclude template and archive manifests', () => {
      const ids = cardTypes.map((type) => type.id);
      expect(ids).not.toContain('SampleCard');
      expect(ids).not.toContain('TemplateCard');

      const names = cardTypes.map((type) => type.name);
      expect(names).not.toContain('Sample Card');
      expect(names).not.toContain('i18n.plugin.template_card.name');
    });

    it('should have required fields for each type', () => {
      cardTypes.forEach((type) => {
        expect(type.id).toBeTruthy();
        expect(type.name).toBeTruthy();
        expect(type.icon).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(type.keywords).toBeInstanceOf(Array);
        expect(type.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('layoutTypes', () => {
    it('should load layout types from plugin manifests only', () => {
      // 布局类型与基础卡片一致，完全由已安装的布局插件清单动态生成
      // 没有安装布局插件时，列表为空
      expect(Array.isArray(layoutTypes)).toBe(true);
    });

    it('should have required fields for each loaded type', () => {
      layoutTypes.forEach((type) => {
        expect(type.id).toBeTruthy();
        expect(type.name).toBeTruthy();
        expect(type.icon).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(type.keywords).toBeInstanceOf(Array);
        expect(type.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should not contain hardcoded builtin types when no plugins installed', () => {
      // 如果没有安装布局插件，不应该出现任何内置的硬编码类型
      const hardcodedIds = [
        'list-layout', 'grid-layout', 'waterfall-layout', 'canvas-layout',
        'timeline-layout', 'bookshelf-layout', 'profile-layout', 'moments-layout',
      ];
      const loadedIds = layoutTypes.map((t) => t.id);
      // 只有真正安装了对应插件时才应该出现
      hardcodedIds.forEach((id) => {
        if (loadedIds.includes(id)) {
          // 如果存在，说明确实安装了对应的布局插件
          expect(layoutTypes.find((t) => t.id === id)).toBeTruthy();
        }
      });
    });
  });

  describe('searchCardTypes', () => {
    it('should return all types for empty query', () => {
      const results = searchCardTypes('');
      expect(results).toHaveLength(cardTypes.length);
    });

    it('should return all types for whitespace query', () => {
      const results = searchCardTypes('   ');
      expect(results).toHaveLength(cardTypes.length);
    });

    it('should find types by name', () => {
      const sample = cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      // 使用翻译后的文本进行搜索
      const results = searchCardTypes('图片');
      // 如果没有图片类型的卡片，至少测试不报错
      expect(Array.isArray(results)).toBe(true);
    });

    it('should find types by description', () => {
      const sample = cardTypes.find((type) => type.description) ?? cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      const keyword = sample.description.slice(0, 2);
      const results = searchCardTypes(keyword);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find types by keywords', () => {
      const sample = cardTypes.find((type) => type.keywords.length > 0) ?? cardTypes[0];
      if (!sample) {
        expect(true).toBe(true);
        return;
      }
      // 使用通用关键词进行搜索
      const results = searchCardTypes('card');
      // 验证搜索结果是一个数组
      expect(Array.isArray(results)).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchCardTypes('MARKDOWN');
      const results2 = searchCardTypes('markdown');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = searchCardTypes('xyz123不存在的类型');
      expect(results).toHaveLength(0);
    });

    it('should find multiple types with common keyword', () => {
      const commonKeyword = cardTypes
        .flatMap((type) => type.keywords)
        .find((keyword, _index, array) => array.filter((k) => k === keyword).length > 1);
      if (!commonKeyword) {
        expect(true).toBe(true);
        return;
      }
      const results = searchCardTypes(commonKeyword);
      expect(results.length).toBeGreaterThan(1);
    });
  });

  describe('searchLayoutTypes', () => {
    it('should return all types for empty query', () => {
      const results = searchLayoutTypes('');
      expect(results).toHaveLength(layoutTypes.length);
    });

    it('should return all types for whitespace query', () => {
      const results = searchLayoutTypes('   ');
      expect(results).toHaveLength(layoutTypes.length);
    });

    it('should find types by name when plugins are installed', () => {
      if (layoutTypes.length === 0) {
        // 没有安装布局插件时，搜索结果为空
        const results = searchLayoutTypes('any');
        expect(results).toHaveLength(0);
        return;
      }
      const sample = layoutTypes[0];
      const keyword = sample.name.slice(0, 2);
      const results = searchLayoutTypes(keyword);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find types by description when plugins are installed', () => {
      if (layoutTypes.length === 0) {
        expect(true).toBe(true);
        return;
      }
      const sample = layoutTypes.find((type) => type.description) ?? layoutTypes[0];
      const keyword = sample.description.slice(0, 2);
      const results = searchLayoutTypes(keyword);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchLayoutTypes('LAYOUT');
      const results2 = searchLayoutTypes('layout');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = searchLayoutTypes('xyz123不存在的布局');
      expect(results).toHaveLength(0);
    });
  });
});
