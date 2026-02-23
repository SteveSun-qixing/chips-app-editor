import { describe, expect, it } from 'vitest';
import {
  isBaseCardRuntimeType,
  resolveBaseCardRuntimeType,
} from '@/components/window/base-card-runtime-type';

describe('base-card-runtime-type', () => {
  it('keeps canonical type when base card already uses PascalCase card type', () => {
    const runtimeType = resolveBaseCardRuntimeType({
      type: 'RichTextCard',
      config: {},
    });

    expect(runtimeType).toBe('RichTextCard');
  });

  it('resolves runtime type from config.card_type for legacy plugin-id cards', () => {
    const runtimeType = resolveBaseCardRuntimeType({
      type: 'chips-official.rich-text-card',
      config: { card_type: 'RichTextCard' },
    });

    expect(runtimeType).toBe('RichTextCard');
    expect(
      isBaseCardRuntimeType(
        { type: 'chips-official.rich-text-card', config: { card_type: 'RichTextCard' } },
        'RichTextCard'
      )
    ).toBe(true);
  });

  it('resolves runtime type from local manifest alias when config.card_type is missing', () => {
    const runtimeType = resolveBaseCardRuntimeType({
      type: 'chips-official.rich-text-card',
      config: { content_source: 'inline' },
    });

    expect(runtimeType).toBe('RichTextCard');
    expect(
      isBaseCardRuntimeType(
        { type: 'chips-official.rich-text-card', config: { content_source: 'inline' } },
        'RichTextCard'
      )
    ).toBe(true);
  });

  it('falls back to original type when config.card_type is unavailable', () => {
    const runtimeType = resolveBaseCardRuntimeType({
      type: 'chips-official.unknown-card',
      config: {},
    });

    expect(runtimeType).toBe('chips-official.unknown-card');
    expect(
      isBaseCardRuntimeType(
        { type: 'chips-official.unknown-card', config: {} },
        'RichTextCard'
      )
    ).toBe(false);
  });
});
