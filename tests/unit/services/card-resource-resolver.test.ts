import { describe, expect, it } from 'vitest';

import {
  buildCardResourceFullPath,
  isDirectResourceUrl,
} from '@/services/card-resource-resolver';

describe('card-resource-resolver', () => {
  it('returns true for http urls', () => {
    expect(isDirectResourceUrl('http://example.com/image.png')).toBe(true);
  });

  it('returns true for https urls', () => {
    expect(isDirectResourceUrl('https://example.com/image.png')).toBe(true);
  });

  it('returns true for blob urls', () => {
    expect(isDirectResourceUrl('blob:https://example.com/abc')).toBe(true);
  });

  it('returns true for data urls', () => {
    expect(isDirectResourceUrl('data:image/png;base64,AAAA')).toBe(true);
  });

  it('returns false for relative file paths', () => {
    expect(isDirectResourceUrl('photo.png')).toBe(false);
  });

  it('keeps absolute card path leading slash when building full path', () => {
    expect(
      buildCardResourceFullPath(
        '/ProductFinishedProductTestingSpace/TestWorkspace/card-001',
        'photo.png',
      ),
    ).toBe('/ProductFinishedProductTestingSpace/TestWorkspace/card-001/photo.png');
  });

  it('normalizes windows path separators when building full path', () => {
    expect(buildCardResourceFullPath('C:\\workspace\\card-001', 'images\\photo.png')).toBe(
      'C:/workspace/card-001/images/photo.png',
    );
  });

  it('normalizes duplicated separators and trims resource leading slash', () => {
    expect(buildCardResourceFullPath('/workspace//card-001//', '/images//photo.png')).toBe(
      '/workspace/card-001/images/photo.png',
    );
  });

  it('returns normalized resource path when card path is empty', () => {
    expect(buildCardResourceFullPath('', '/images/photo.png')).toBe('images/photo.png');
  });

  it('returns normalized card path when resource path is empty', () => {
    expect(buildCardResourceFullPath('/workspace/card-001//', '')).toBe('/workspace/card-001');
  });
});
