/**
 * 测试环境设置
 */

import { beforeAll, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { resourceServiceMock, resetResourceServiceMock } from './helpers/resource-service-mock';
import { installMockBridge, resetMockBridge } from './helpers/mock-bridge';
import { initializeEditorI18n } from '@/services/i18n-service';

type ProgressCallback = (progress: { percent: number }) => void;

const mockCards = new Map<string, any>();
const mockBoxes = new Map<string, any>();
let idCounter = 1;

function createId(prefix: string): string {
  const id = `${prefix}-${idCounter}`;
  idCounter += 1;
  return id;
}

async function ensureDir(targetPath: string): Promise<void> {
  const dir = path.extname(targetPath) ? path.dirname(targetPath) : targetPath;
  await fs.mkdir(dir, { recursive: true });
}

async function writePdf(outputPath: string): Promise<void> {
  const header = '%PDF-1.4\n%Mock PDF\n';
  await fs.writeFile(outputPath, header);
}

async function writePng(outputPath: string): Promise<void> {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await fs.writeFile(outputPath, header);
}

async function writeJpg(outputPath: string): Promise<void> {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
  await fs.writeFile(outputPath, header);
}

async function writeHtml(outputPath: string): Promise<void> {
  await fs.mkdir(outputPath, { recursive: true });
  await fs.mkdir(path.join(outputPath, 'cards'), { recursive: true });
  await fs.writeFile(path.join(outputPath, 'index.html'), '<!doctype html><html><body>Mock</body></html>');
}

async function writeCardZip(outputPath: string, card: any): Promise<void> {
  const zip = new JSZip();
  zip.file('.card/metadata.yaml', `card_id: ${card.id}\nname: ${card.metadata.name}\n`);
  zip.file('.card/structure.yaml', 'structure: []\nmanifest:\n  card_count: 0\n  resource_count: 0\n  resources: []\n');
  zip.file('.card/cover.html', '<html><body>Mock Cover</body></html>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(outputPath, buffer);
}

function runProgress(onProgress?: ProgressCallback): void {
  if (!onProgress) return;
  onProgress({ percent: 0 });
  onProgress({ percent: 100 });
}

const {
  MockCoreConnector,
  MockConnectionError,
  MockLogger,
  MockConfigManager,
  MockEventBus,
  MockResourceManager,
  MockConversionAPI,
} = vi.hoisted(() => {
  class MockCoreConnector {
    private _connected = false;
    constructor(public options: Record<string, any> = {}) {}
    async connect(): Promise<void> {
      this._connected = true;
    }
    disconnect(): void {
      this._connected = false;
    }
    get isConnected(): boolean {
      return this._connected;
    }
    async request<T = unknown>(_params: any): Promise<{ success: boolean; data?: T; error?: string }> {
      return { success: true };
    }
  }

  class MockConnectionError extends Error {}

  class MockLogger {
    constructor(_name: string) {}
    info(): void {}
    warn(): void {}
    error(): void {}
    debug(): void {}
    setLevel(): void {}
  }

  class MockConfigManager {
    async initialize(): Promise<void> {}
    set(): void {}
    get(): void {
      return undefined;
    }
  }

  class MockEventBus {
    async emit(): Promise<void> {}
    on(): void {}
    off(): void {}
  }

  class MockResourceManager {
    constructor(_connector: any, _logger: any, _eventBus: any) {}
    destroy(): void {}
  }

  class MockConversionAPI {
    constructor(_connector: any, _logger: any, _config: any) {}
    async convertToHTML(_source: any, options: any) {
      return { success: true, outputPath: options.outputPath, taskId: 'mock-html' };
    }
    async convertToPDF(_source: any, options: any) {
      return { success: true, outputPath: options.outputPath, taskId: 'mock-pdf' };
    }
    async convertToImage(_source: any, options: any) {
      return { success: true, outputPath: options.outputPath, taskId: 'mock-image', width: 800, height: 600 };
    }
    async exportAsCard(_cardId: string, options: any) {
      return { success: true, outputPath: options.outputPath, taskId: 'mock-card' };
    }
  }

  return {
    MockCoreConnector,
    MockConnectionError,
    MockLogger,
    MockConfigManager,
    MockEventBus,
    MockResourceManager,
    MockConversionAPI,
  };
});

// 全局 mock 设置

// Mock @chips/sdk
vi.mock('@chips/sdk', () => {
  class ChipsSDK {
    version = '1.0.0';
    connector: MockCoreConnector;
    private events = new Map<string, Map<string, (...args: any[]) => void>>();
    private eventId = 0;
    private translations = new Map<string, Record<string, any>>();
    private locale = 'zh-CN';
    card: any;
    box: any;
    i18n: { addTranslation: (locale: string, messages: Record<string, any>) => void };

    constructor(options: any = {}) {
      this.connector = options.connectorInstance ?? new MockCoreConnector(options.connector);
      this.i18n = {
        addTranslation: (locale: string, messages: Record<string, any>) => {
          this.translations.set(locale, messages);
        },
      };

      this.card = {
        create: async (payload: any) => {
          const id = createId('card');
          const card = {
            id,
            metadata: {
              card_id: id,
              name: payload?.name ?? 'Untitled',
              tags: payload?.tags ?? [],
              created_at: new Date().toISOString(),
              modified_at: new Date().toISOString(),
            },
            structure: {
              structure: [],
              manifest: {
                card_count: 0,
                resource_count: 0,
                resources: [],
              },
            },
            resources: new Map(),
          };
          mockCards.set(id, card);
          return card;
        },
        get: async (id: string) => {
          return mockCards.get(id) ?? {
            id,
            metadata: { card_id: id, name: 'Mock Card', tags: [] },
            structure: { structure: [], manifest: { card_count: 0, resource_count: 0, resources: [] } },
            resources: new Map(),
          };
        },
        save: async (_filePath: string, _card: any) => {
          return;
        },
        delete: async (id: string) => {
          mockCards.delete(id);
        },
        export: async (cardId: string, format: 'card' | 'html' | 'pdf' | 'image', options: any = {}) => {
          const card = mockCards.get(cardId);
          if (!card) {
            return { success: false, error: 'Card not found' };
          }

          const outputPath = options.outputPath;
          if (!outputPath) {
            return { success: false, error: 'Output path required' };
          }

          try {
            runProgress(options.onProgress);
            await ensureDir(outputPath);

            if (format === 'card') {
              await writeCardZip(outputPath, card);
              return {
                success: true,
                outputPath,
                taskId: 'mock-card',
                stats: { duration: 1, fileCount: 3 },
              };
            }

            if (format === 'html') {
              await writeHtml(outputPath);
              return { success: true, outputPath, taskId: 'mock-html' };
            }

            if (format === 'pdf') {
              await writePdf(outputPath);
              return { success: true, outputPath, taskId: 'mock-pdf' };
            }

            if (format === 'image') {
              if (options.format === 'jpg') {
                await writeJpg(outputPath);
              } else {
                await writePng(outputPath);
              }
              const scale = options.scale ?? 1;
              return { success: true, outputPath, taskId: 'mock-image', width: 800 * scale, height: 600 * scale };
            }

            return { success: false, error: 'Unsupported format' };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        },
      };

      this.box = {
        create: async (payload: any) => {
          const id = createId('box');
          const box = {
            id,
            metadata: {
              box_id: id,
              name: payload?.name ?? 'Untitled Box',
              created_at: new Date().toISOString(),
              modified_at: new Date().toISOString(),
            },
          };
          mockBoxes.set(id, box);
          return box;
        },
        get: async (id: string) => {
          return mockBoxes.get(id) ?? { id, metadata: { box_id: id, name: 'Mock Box' } };
        },
      };
    }

    async initialize(): Promise<void> {
      await this.connector.connect();
    }

    destroy(): void {
      this.connector.disconnect();
    }

    setLocale(locale: string): void {
      this.locale = locale;
    }

    t(key: string, params?: Record<string, string | number>): string {
      const template = this.resolveTranslation(key) ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
        const value = params[name];
        return value === undefined ? `{${name}}` : String(value);
      });
    }

    on(event: string, handler: (...args: any[]) => void): string {
      if (!this.events.has(event)) {
        this.events.set(event, new Map());
      }
      const id = `evt-${++this.eventId}`;
      this.events.get(event)!.set(id, handler);
      return id;
    }

    off(event: string, id: string): void {
      this.events.get(event)?.delete(id);
    }

    private resolveTranslation(key: string): string | undefined {
      const messages = this.translations.get(this.locale);
      if (!messages) return undefined;
      const segments = key.split('.');
      let current: any = messages;
      for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
          return undefined;
        }
        current = current[segment];
      }
      return typeof current === 'string' ? current : undefined;
    }
  }

  return {
    ChipsSDK,
    createSDK: vi.fn().mockResolvedValue(new ChipsSDK()),
    CoreConnector: MockCoreConnector,
    ConnectionError: MockConnectionError,
    Logger: MockLogger,
    ConfigManager: MockConfigManager,
    EventBus: MockEventBus,
    ResourceManager: MockResourceManager,
    ConversionAPI: MockConversionAPI,
  };
});

vi.stubGlobal('__RESOURCE_SERVICE_MOCK__', resourceServiceMock);

// Mock @chips/components
vi.mock('@chips/components', () => {
  const createWrapperComponent = (tag: string, name: string, options?: { inputType?: string }) =>
    defineComponent({
      name,
      inheritAttrs: false,
      props: {
        modelValue: {
          type: [String, Number, Boolean],
          default: '',
        },
        htmlType: {
          type: String,
          default: 'button',
        },
        type: {
          type: String,
          default: options?.inputType ?? undefined,
        },
        checked: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['click', 'update:modelValue', 'input', 'change', 'blur', 'focus', 'keydown', 'keyup'],
      setup(props, { attrs, slots, emit }) {
        const onInput = (event: Event) => {
          const target = event.target as HTMLInputElement | HTMLTextAreaElement;
          const value =
            target instanceof HTMLInputElement && target.type === 'checkbox'
              ? target.checked
              : target.value;
          emit('update:modelValue', value);
          emit('input', event);
        };

        const onChange = (event: Event) => {
          const target = event.target as HTMLInputElement | HTMLSelectElement;
          if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            emit('update:modelValue', target.checked);
          }
          emit('change', event);
        };

        return () => {
          const isCheckbox = tag === 'input' && props.type === 'checkbox';
          const checkedValue =
            props.checked || (typeof props.modelValue === 'boolean' ? props.modelValue : undefined);

          return h(
            tag,
            {
              ...attrs,
              type: tag === 'button' ? props.htmlType : props.type,
              value: tag !== 'button' ? props.modelValue : undefined,
              checked: isCheckbox ? checkedValue : undefined,
              onClick: (event: Event) => emit('click', event),
              onInput,
              onChange,
              onBlur: (event: Event) => emit('blur', event),
              onFocus: (event: Event) => emit('focus', event),
              onKeydown: (event: Event) => emit('keydown', event),
              onKeyup: (event: Event) => emit('keyup', event),
            },
            slots.default ? slots.default() : []
          );
        };
      },
    });

  const ButtonStub = createWrapperComponent('button', 'ChipsButton');

  const InputStub = defineComponent({
    name: 'ChipsInput',
    inheritAttrs: false,
    props: {
      modelValue: {
        type: [String, Number, Boolean],
        default: '',
      },
      htmlType: {
        type: String,
        default: 'text',
      },
      type: {
        type: String,
        default: 'text',
      },
      checked: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['click', 'update:modelValue', 'input', 'change', 'blur', 'focus', 'keydown', 'keyup'],
    setup(props, { attrs, emit, expose }) {
      const inputRef = ref<HTMLInputElement | null>(null);

      const onInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        emit('update:modelValue', value);
        emit('input', event);
      };

      const onChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.type === 'checkbox') {
          emit('update:modelValue', target.checked);
        }
        emit('change', event);
      };

      expose({
        focus: () => inputRef.value?.focus(),
        select: () => inputRef.value?.select(),
      });

      return () =>
        h('input', {
          ...attrs,
          ref: inputRef,
          type: props.type,
          value: props.modelValue,
          checked: props.type === 'checkbox' ? props.checked : undefined,
          onClick: (event: Event) => emit('click', event),
          onInput,
          onChange,
          onBlur: (event: Event) => emit('blur', event),
          onFocus: (event: Event) => emit('focus', event),
          onKeydown: (event: Event) => emit('keydown', event),
          onKeyup: (event: Event) => emit('keyup', event),
        });
    },
  });

  const SelectStub = defineComponent({
    name: 'ChipsSelect',
    inheritAttrs: false,
    props: {
      modelValue: {
        type: [String, Number],
        default: '',
      },
      options: {
        type: Array as () => Array<{ value: string | number; label?: string }>,
        default: () => [],
      },
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { attrs, slots, emit }) {
      const onChange = (event: Event) => {
        const target = event.target as HTMLSelectElement;
        emit('update:modelValue', target.value);
        emit('change', event);
      };
      const optionNodes =
        slots.default?.() ??
        props.options.map((option) =>
          h('option', { value: option.value }, option.label ?? option.value)
        );
      return () =>
        h(
          'select',
          {
            ...attrs,
            value: props.modelValue,
            onChange,
          },
          optionNodes
        );
    },
  });

  const CheckboxStub = createWrapperComponent('input', 'ChipsCheckbox', { inputType: 'checkbox' });
  const RadioStub = createWrapperComponent('input', 'ChipsRadio', { inputType: 'radio' });
  const SwitchStub = createWrapperComponent('input', 'ChipsSwitch', { inputType: 'checkbox' });
  const TextareaStub = createWrapperComponent('textarea', 'ChipsTextarea');
  const SliderStub = createWrapperComponent('input', 'ChipsSlider', { inputType: 'range' });
  const ProgressStub = defineComponent({
    name: 'ChipsProgress',
    inheritAttrs: false,
    props: {
      percent: {
        type: Number,
        default: 0,
      },
    },
    setup(props, { attrs }) {
      return () =>
        h('div', { ...attrs, 'data-percent': String(props.percent) }, String(props.percent));
    },
  });
  const TextStub = defineComponent({
    name: 'ChipsText',
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => h('span', { ...attrs }, slots.default ? slots.default() : []);
    },
  });
  const ProviderStub = defineComponent({
    name: 'ChipsProviderStub',
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      return () => h('div', { ...attrs }, slots.default ? slots.default() : []);
    },
  });

  const ModalStub = defineComponent({
    name: 'ChipsModal',
    inheritAttrs: false,
    props: {
      visible: { type: Boolean, default: false },
      title: { type: String, default: '' },
    },
    emits: ['update:visible', 'close'],
    setup(props, { attrs, slots, emit }) {
      return () =>
        props.visible
          ? h('div', { ...attrs, class: 'chips-modal' }, slots.default ? slots.default() : [])
          : null;
    },
  });

  const TabsStub = defineComponent({
    name: 'ChipsTabs',
    inheritAttrs: false,
    props: {
      modelValue: { type: String, default: '' },
    },
    emits: ['update:modelValue', 'change'],
    setup(_props, { attrs, slots }) {
      return () => h('div', { ...attrs, class: 'chips-tabs' }, slots.default ? slots.default() : []);
    },
  });

  const TabPaneStub = defineComponent({
    name: 'ChipsTabPane',
    inheritAttrs: false,
    props: {
      name: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    setup(_props, { attrs, slots }) {
      return () => h('div', { ...attrs, class: 'chips-tab-pane' }, slots.default ? slots.default() : []);
    },
  });

  const LoadingStub = defineComponent({
    name: 'ChipsLoading',
    inheritAttrs: false,
    props: {
      loading: { type: Boolean, default: false },
      size: { type: String, default: 'default' },
    },
    setup(props, { attrs, slots }) {
      return () =>
        h('div', { ...attrs, class: 'chips-loading' }, [
          props.loading ? h('span', 'Loading...') : null,
          slots.default ? slots.default() : [],
        ]);
    },
  });

  const AlertStub = defineComponent({
    name: 'ChipsAlert',
    inheritAttrs: false,
    props: {
      type: { type: String, default: 'info' },
      message: { type: String, default: '' },
    },
    emits: ['close'],
    setup(props, { attrs, slots }) {
      return () =>
        h('div', { ...attrs, class: 'chips-alert' }, [
          h('span', props.message),
          slots.default ? slots.default() : [],
        ]);
    },
  });

  return {
    version: '0.1.0',
    Button: ButtonStub,
    Input: InputStub,
    Select: SelectStub,
    Checkbox: CheckboxStub,
    CheckboxGroup: ProviderStub,
    Radio: RadioStub,
    RadioGroup: ProviderStub,
    Switch: SwitchStub,
    Textarea: TextareaStub,
    Slider: SliderStub,
    Progress: ProgressStub,
    Text: TextStub,
    ChipsProvider: ProviderStub,
    ThemeProvider: ProviderStub,
    Modal: ModalStub,
    Tabs: TabsStub,
    TabPane: TabPaneStub,
    Loading: LoadingStub,
    Alert: AlertStub,
  };
});

// Mock @chips/foundation
vi.mock('@chips/foundation', () => ({
  version: '1.0.0',
}));

// 全局测试配置
beforeAll(async () => {
  installMockBridge();
  await initializeEditorI18n('zh-CN');
});

beforeEach(() => {
  // 每个测试前重置 mock
  vi.clearAllMocks();
  resetResourceServiceMock();
  resetMockBridge();
});

afterEach(() => {
  // 每个测试后清理
});

// 全局测试辅助函数
export function createMockEditor() {
  return {
    config: {
      layout: 'infinite-canvas' as const,
      debug: true,
    },
    state: 'ready' as const,
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    use: vi.fn().mockResolvedValue(undefined),
  };
}
