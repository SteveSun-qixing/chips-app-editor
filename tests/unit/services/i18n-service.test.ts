import { describe, it, expect, vi } from 'vitest';
import { nextTick, watchEffect } from 'vue';

describe('i18n-service', () => {
  it('updates reactive translation result after locale change', async () => {
    vi.resetModules();
    const i18n = await import('@/services/i18n-service');

    i18n.setLocale('zh-CN');

    let rendered = '';
    const stop = watchEffect(() => {
      rendered = i18n.t('app.tool_edit_panel');
    });

    expect(rendered).toBe('编辑面板');

    i18n.setLocale('en-US');
    await nextTick();

    expect(rendered).toBe('Edit Panel');
    stop();
  });
});
