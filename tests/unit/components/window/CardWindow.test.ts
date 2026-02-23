import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import CardWindow from '@/components/window/CardWindow.vue';
import { useCardStore } from '@/core/state';

const { fetchRenderersSpy, renderSpy, clearCacheSpy } = vi.hoisted(() => ({
  fetchRenderersSpy: vi.fn(async (cardTypes: string[]) =>
    new Map(cardTypes.map((cardType) => [cardType, { html: '<!doctype html><html><body></body></html>', css: '' }]))
  ),
  renderSpy: vi.fn(),
  clearCacheSpy: vi.fn(),
}));

vi.mock('@chips/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chips/sdk')>();

  return {
    ...actual,
    RendererFetcher: class {
      fetchRenderers = fetchRenderersSpy;
      clearCache = clearCacheSpy;
    },
    CardRenderManager: class {
      render(cardData: { baseCards: Array<{ id: string }> }, _renderers: unknown, container: HTMLElement) {
        renderSpy(cardData);
        const cards = cardData.baseCards
          .map((baseCard) => `<section class="chips-base-card-wrapper" data-card-id="${baseCard.id}"></section>`)
          .join('');
        container.innerHTML = `<div class="chips-card-body">${cards}</div>`;

        return {
          success: true,
          destroy: () => {
            container.innerHTML = '';
          },
        };
      }
    },
  };
});

vi.mock('@/services/i18n-service', () => ({
  t: (key: string) => key,
}));

vi.mock('@/core/workspace-service', () => ({
  useWorkspaceService: () => ({
    renameFile: vi.fn(),
  }),
}));

describe('CardWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRenderersSpy.mockClear();
    renderSpy.mockClear();
    clearCacheSpy.mockClear();

    const cardStore = useCardStore();
    cardStore.addCard(
      {
        id: 'card-1',
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'card-1',
          name: '测试卡片',
          created_at: '2026-02-23T00:00:00.000Z',
          modified_at: '2026-02-23T00:00:00.000Z',
        },
        structure: {
          structure: [
            { id: 'base-1', type: 'RichTextCard', config: { content_text: '<p>hello</p>' } },
            { id: 'base-2', type: 'ImageCard', config: { images: [] } },
          ],
          manifest: {
            card_count: 2,
            resource_count: 0,
            resources: [],
          },
        },
        resources: new Map(),
      },
      '/workspace/card-1.card'
    );
  });

  async function waitForPreviewRender(): Promise<void> {
    await flushPromises();
    await nextTick();
    await flushPromises();
  }

  async function mountCardWindow() {
    const wrapper = mount(CardWindow, {
      props: {
        config: {
          id: 'window-1',
          type: 'card',
          cardId: 'card-1',
          title: '测试卡片',
          position: { x: 0, y: 0 },
          size: { width: 360, height: 500 },
          state: 'normal',
          zIndex: 10,
          isEditing: true,
          draggable: true,
          resizable: true,
          minimizable: true,
          closable: true,
        },
      },
      global: {
        stubs: {
          CardWindowBase: {
            template: '<div><slot name="header" /><slot name="default" /></div>',
          },
          WindowMenu: {
            template: '<div class="window-menu-stub" />',
          },
          CardSettingsDialog: {
            template: '<div class="card-settings-stub" />',
          },
        },
      },
    });

    const cardStore = useCardStore();
    const structure = cardStore.getCard('card-1')?.structure ?? [];
    cardStore.updateCardStructure('card-1', [...structure]);
    await waitForPreviewRender();

    return wrapper;
  }

  it('使用 SDK 渲染器管线渲染基础卡片', async () => {
    const wrapper = await mountCardWindow();

    expect(fetchRenderersSpy).toHaveBeenCalled();
    expect(fetchRenderersSpy).toHaveBeenLastCalledWith(['RichTextCard', 'ImageCard']);
    expect(renderSpy).toHaveBeenCalled();

    const renderArg = renderSpy.mock.calls.at(-1)?.[0];
    expect(renderArg?.baseCards).toHaveLength(2);
    expect(renderArg?.baseCards[0]?.id).toBe('base-1');
    expect(renderArg?.baseCards[1]?.id).toBe('base-2');

    wrapper.unmount();
  });

  it('为渲染后的基础卡片写入 data-base-card-id 与编辑态样式', async () => {
    const wrapper = await mountCardWindow();

    const baseCards = wrapper.findAll('.chips-base-card-wrapper');
    expect(baseCards).toHaveLength(2);
    expect(baseCards[0]?.attributes('data-base-card-id')).toBe('base-1');
    expect(baseCards[1]?.attributes('data-base-card-id')).toBe('base-2');
    expect(baseCards[0]?.classes()).toContain('chips-editor-base-card--editing');

    const cardStore = useCardStore();
    cardStore.setSelectedBaseCard('base-2');
    await waitForPreviewRender();

    const selected = wrapper.find('[data-base-card-id="base-2"]');
    expect(selected.classes()).toContain('chips-editor-base-card--selected');

    wrapper.unmount();
  });

  it('编辑模式点击渲染卡片时会选中对应基础卡片', async () => {
    const wrapper = await mountCardWindow();

    const cardStore = useCardStore();
    cardStore.setSelectedBaseCard(null);

    const firstBaseCard = wrapper.find('[data-base-card-id="base-1"]');
    await firstBaseCard.trigger('click');

    expect(cardStore.activeCardId).toBe('card-1');
    expect(cardStore.selectedBaseCardId).toBe('base-1');

    wrapper.unmount();
  });

  it('渲染前会净化富文本 HTML，阻断 XSS 载荷', async () => {
    const cardStore = useCardStore();
    const structure = cardStore.getCard('card-1')?.structure ?? [];
    const imageCard = structure[1] ?? { id: 'base-2', type: 'ImageCard', config: { images: [] } };

    cardStore.updateCardStructure('card-1', [
      {
        id: 'base-1',
        type: 'RichTextCard',
        config: {
          content_text:
            '<p onclick="alert(1)">safe</p><script>window.__chips_xss__ = true</script><img src="javascript:alert(3)" onerror="alert(4)">',
        },
      },
      imageCard,
    ]);

    const wrapper = await mountCardWindow();
    const renderArg = renderSpy.mock.calls.at(-1)?.[0];
    const richTextBaseCard = renderArg?.baseCards?.find(
      (baseCard: { id: string }) => baseCard.id === 'base-1'
    ) as { config?: { content_text?: string } } | undefined;
    const renderedHtml = richTextBaseCard?.config?.content_text ?? '';

    expect(renderedHtml).toBeTruthy();
    expect(renderedHtml).toContain('<p>safe</p>');
    expect(renderedHtml).not.toContain('<script');
    expect(renderedHtml).not.toContain('onclick');
    expect(renderedHtml).not.toContain('onerror');
    expect(renderedHtml).not.toContain('javascript:');

    wrapper.unmount();
  });
});
