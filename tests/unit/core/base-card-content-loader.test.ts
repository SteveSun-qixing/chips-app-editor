import { describe, expect, it, vi } from 'vitest';
import {
  createBaseCardContentDocument,
  loadBaseCardConfigsFromContent,
  parseBaseCardContentYaml,
  stringifyBaseCardContentYaml,
} from '@/core/base-card-content-loader';

describe('base-card-content-loader', () => {
  describe('parseBaseCardContentYaml', () => {
    it('parses modern content format with data field', () => {
      const parsed = parseBaseCardContentYaml(
        [
          'type: RichTextCard',
          'data:',
          '  content_source: inline',
          '  content_text: hello',
        ].join('\n')
      );

      expect(parsed).toEqual({
        type: 'RichTextCard',
        data: {
          content_source: 'inline',
          content_text: 'hello',
        },
      });
    });

    it('rejects non-standard content format', () => {
      const parsed = parseBaseCardContentYaml(
        [
          'type: ImageCard',
          'images:',
          '  - id: img-1',
          '    source: file',
          '    file_path: assets/demo.png',
        ].join('\n')
      );

      expect(parsed).toBeNull();
    });

    it('returns null for invalid yaml', () => {
      expect(parseBaseCardContentYaml('data: [')).toBeNull();
    });
  });

  describe('create/stringifyBaseCardContentYaml', () => {
    it('creates normalized standard document', () => {
      expect(createBaseCardContentDocument('  RichTextCard  ', { content_text: 'abc' })).toEqual({
        type: 'RichTextCard',
        data: {
          content_text: 'abc',
        },
      });
    });

    it('throws when type is empty', () => {
      expect(() => createBaseCardContentDocument('  ', {})).toThrow(
        'Base card content requires a non-empty "type"'
      );
    });

    it('stringifies into standard yaml format only', () => {
      const yaml = stringifyBaseCardContentYaml('ImageCard', {
        images: [{ id: 'img-1' }],
      });

      expect(yaml).toContain('type: ImageCard');
      expect(yaml).toContain('data:');
      expect(yaml).toContain('- id: img-1');
    });
  });

  describe('loadBaseCardConfigsFromContent', () => {
    it('hydrates base card config and fallback type from content files', async () => {
      const baseCards = [
        {
          id: 'base-1',
          type: 'UnknownCard',
          config: {},
        },
        {
          id: 'base-2',
          type: 'ImageCard',
          config: {
            keep: true,
          },
        },
        {
          id: 'base-3',
          type: 'UnknownCard',
          config: {},
        },
      ];

      const readText = vi.fn(async (path: string) => {
        if (path.endsWith('/content/base-1.yaml')) {
          return ['type: RichTextCard', 'data:', '  content_text: from-file'].join('\n');
        }
        if (path.endsWith('/content/base-3.yaml')) {
          return ['type: NestedCard', 'data:', '  card_id: child-1', '  card_path: child-1.card'].join('\n');
        }
        throw new Error('File not found');
      });

      await loadBaseCardConfigsFromContent(baseCards, 'TestWorkspace/demo.card', readText);

      expect(baseCards[0]).toEqual({
        id: 'base-1',
        type: 'RichTextCard',
        config: {
          content_text: 'from-file',
        },
      });
      expect(baseCards[1]).toEqual({
        id: 'base-2',
        type: 'ImageCard',
        config: {
          keep: true,
        },
      });
      expect(baseCards[2]).toEqual({
        id: 'base-3',
        type: 'NestedCard',
        config: {
          card_id: 'child-1',
          card_path: 'child-1.card',
        },
      });
      expect(readText).toHaveBeenCalledTimes(2);
    });
  });
});
