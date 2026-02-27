/**
 * Vue adapter layer for @chips/component-library
 * @module adapters/component-library-vue
 * @description 提供与组件库契约对齐的 Vue 组件实现，使用原生 HTML 元素承载结构和交互。
 *
 * Chips-ComponentLibrary 是纯 React 库，无法在 Vue 应用中直接使用。
 * 该适配层导出同名 Vue 组件，并保持一致的 CSS class 命名以兼容主题系统。
 */

import {
  defineComponent,
  h,
  ref,
  type PropType,
  type SetupContext,
} from 'vue';

// ─── Button ───────────────────────────────────────────────

export const Button = defineComponent({
  name: 'ChipsButton',
  inheritAttrs: false,
  props: {
    type: { type: String, default: 'default' },
    htmlType: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }: SetupContext) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          type: props.htmlType,
          disabled: props.disabled,
          class: ['chips-button', `chips-button--${props.type}`, attrs.class],
          onClick: (e: Event) => emit('click', e),
        },
        slots.default?.()
      );
  },
});

// ─── Input ────────────────────────────────────────────────

export const Input = defineComponent({
  name: 'ChipsInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: '' },
    type: { type: String, default: 'text' },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'input', 'change', 'blur', 'focus', 'keydown', 'keyup'],
  setup(props, { attrs, emit, expose }: SetupContext) {
    const inputRef = ref<HTMLInputElement | null>(null);

    expose({
      focus: () => inputRef.value?.focus(),
      blur: () => inputRef.value?.blur(),
      select: () => inputRef.value?.select(),
      $el: inputRef,
    });

    return () =>
      h('input', {
        ...attrs,
        ref: inputRef,
        type: props.type,
        value: props.modelValue,
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: props.readonly,
        class: ['chips-input', attrs.class],
        onInput: (e: Event) => {
          const target = e.target as HTMLInputElement;
          emit('update:modelValue', target.value);
          emit('input', e);
        },
        onChange: (e: Event) => emit('change', e),
        onBlur: (e: Event) => emit('blur', e),
        onFocus: (e: Event) => emit('focus', e),
        onKeydown: (e: Event) => emit('keydown', e),
        onKeyup: (e: Event) => emit('keyup', e),
      });
  },
});

export type InputInstance = InstanceType<typeof Input>;

// ─── Textarea ─────────────────────────────────────────────

export const Textarea = defineComponent({
  name: 'ChipsTextarea',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: '' },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    rows: { type: Number, default: undefined },
  },
  emits: ['update:modelValue', 'input', 'change', 'blur', 'focus'],
  setup(props, { attrs, emit }: SetupContext) {
    return () =>
      h('textarea', {
        ...attrs,
        value: props.modelValue,
        placeholder: props.placeholder,
        disabled: props.disabled,
        rows: props.rows,
        class: ['chips-textarea', attrs.class],
        onInput: (e: Event) => {
          const target = e.target as HTMLTextAreaElement;
          emit('update:modelValue', target.value);
          emit('input', e);
        },
        onChange: (e: Event) => emit('change', e),
        onBlur: (e: Event) => emit('blur', e),
        onFocus: (e: Event) => emit('focus', e),
      });
  },
});

// ─── Select ───────────────────────────────────────────────

interface SelectOption {
  value: string | number;
  label?: string;
}

export const Select = defineComponent({
  name: 'ChipsSelect',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: {
      type: Array as PropType<SelectOption[]>,
      default: () => [],
    },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, slots, emit }: SetupContext) {
    return () => {
      const optionNodes =
        slots.default?.() ??
        props.options.map((opt) =>
          h('option', { value: opt.value, key: opt.value }, opt.label ?? String(opt.value))
        );
      return h(
        'select',
        {
          ...attrs,
          value: props.modelValue,
          disabled: props.disabled,
          class: ['chips-select', attrs.class],
          onChange: (e: Event) => {
            const target = e.target as HTMLSelectElement;
            emit('update:modelValue', target.value);
            emit('change', e);
          },
        },
        optionNodes
      );
    };
  },
});

// ─── Switch ───────────────────────────────────────────────

export const Switch = defineComponent({
  name: 'ChipsSwitch',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }: SetupContext) {
    return () =>
      h('label', { class: ['chips-switch', attrs.class] }, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          disabled: props.disabled,
          class: 'chips-switch__input',
          onChange: (e: Event) => {
            const target = e.target as HTMLInputElement;
            emit('update:modelValue', target.checked);
            emit('change', e);
          },
        }),
        h('span', { class: 'chips-switch__track' }),
      ]);
  },
});

// ─── Checkbox ─────────────────────────────────────────────

export const Checkbox = defineComponent({
  name: 'ChipsCheckbox',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, slots, emit }: SetupContext) {
    return () =>
      h('label', { class: ['chips-checkbox', attrs.class] }, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          disabled: props.disabled,
          class: 'chips-checkbox__input',
          onChange: (e: Event) => {
            const target = e.target as HTMLInputElement;
            emit('update:modelValue', target.checked);
            emit('change', e);
          },
        }),
        slots.default ? h('span', { class: 'chips-checkbox__label' }, slots.default()) : null,
      ]);
  },
});

// ─── ThemeProvider ─────────────────────────────────────────

export const ThemeProvider = defineComponent({
  name: 'ChipsThemeProvider',
  inheritAttrs: false,
  props: {
    theme: { type: String, default: undefined },
  },
  setup(props, { slots, attrs }: SetupContext) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-theme': props.theme,
          class: ['chips-theme-provider', attrs.class],
        },
        slots.default?.()
      );
  },
});
