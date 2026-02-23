import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizeRichTextHtml } from '@/components/window/rich-text-sanitizer';

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sanitizeRichTextHtml', () => {
  it('空输入返回空字符串', () => {
    expect(sanitizeRichTextHtml('')).toBe('');
  });

  it('移除 script 与事件处理器', () => {
    const result = sanitizeRichTextHtml(
      '<p onclick="alert(1)">safe</p><script>alert(2)</script><img onerror="alert(3)" src="x.png">'
    );

    expect(result).toContain('<p>safe</p>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
  });

  it('移除 javascript 协议 URL', () => {
    const result = sanitizeRichTextHtml(
      '<a href="javascript:alert(1)">link</a><img src="javascript:alert(2)">'
    );

    expect(result).not.toContain('javascript:');
    expect(result).toContain('>link</a>');
  });

  it('保留白名单标签与安全样式', () => {
    const result = sanitizeRichTextHtml(
      '<h2 style="color: red; position: fixed">title</h2><p style="font-size: 16px">text</p>'
    );

    expect(result).toContain('<h2');
    expect(result).toContain('color: red');
    expect(result).not.toContain('position');
    expect(result).toContain('font-size: 16px');
  });
});
