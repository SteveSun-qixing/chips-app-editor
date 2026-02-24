import { describe, expect, it } from 'vitest';

import {
  collectBaseCardPreviewResourcePaths,
  resolveBaseCardPreviewConfig,
} from '@/components/window/base-card-preview-processor';

const isDirectResourceUrl = (path: string): boolean => (
  path.startsWith('http://')
  || path.startsWith('https://')
  || path.startsWith('blob:')
  || path.startsWith('data:')
);

describe('base-card-preview-processor', () => {
  it('resolves nested resource paths without cardType branching', () => {
    const resolved = resolveBaseCardPreviewConfig(
      {
        image_file: 'cover.png',
        images: [
          { file_path: 'gallery/photo-01.jpg', alt: 'first' },
          { url: 'https://example.com/photo-02.jpg' },
        ],
        nested: {
          poster: 'video/poster.webp',
          attachment: 'docs/readme.md',
        },
        previewAsset: 'assets/snapshot.jpeg?version=2',
        title: 'hello world',
      },
      {
        isDirectResourceUrl,
        resolveResourcePath: (path) => `blob:${path}`,
      }
    );

    expect(resolved.image_file).toBe('blob:cover.png');
    expect((resolved.images as Array<Record<string, unknown>>)[0].file_path).toBe('blob:gallery/photo-01.jpg');
    expect((resolved.images as Array<Record<string, unknown>>)[1].url).toBe('https://example.com/photo-02.jpg');
    expect((resolved.nested as Record<string, unknown>).poster).toBe('blob:video/poster.webp');
    expect((resolved.nested as Record<string, unknown>).attachment).toBe('docs/readme.md');
    expect(resolved.previewAsset).toBe('blob:assets/snapshot.jpeg?version=2');
    expect(resolved.title).toBe('hello world');
  });

  it('collects active resource paths for cleanup', () => {
    const paths = collectBaseCardPreviewResourcePaths(
      {
        src: 'cover.png',
        images: [
          { file_path: 'gallery/photo-01.jpg' },
          { file_path: 'https://example.com/photo-02.jpg' },
        ],
        nested: {
          poster: 'video/poster.webp',
          notes: 'docs/readme.md',
        },
        previewAsset: 'assets/snapshot.jpeg',
      },
      {
        isDirectResourceUrl,
        toFullPath: (path) => `/full/${path}`,
      }
    );

    expect(paths).toEqual(new Set([
      '/full/cover.png',
      '/full/gallery/photo-01.jpg',
      '/full/video/poster.webp',
      '/full/assets/snapshot.jpeg',
    ]));
  });

  it('handles empty config gracefully', () => {
    expect(resolveBaseCardPreviewConfig(undefined, {
      isDirectResourceUrl,
      resolveResourcePath: (path) => `blob:${path}`,
    })).toEqual({});

    expect(collectBaseCardPreviewResourcePaths(undefined, {
      isDirectResourceUrl,
      toFullPath: (path) => path,
    })).toEqual(new Set());
  });
});
