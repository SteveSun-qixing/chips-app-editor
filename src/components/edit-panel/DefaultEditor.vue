<script setup lang="ts">
/**
 * 默认编辑器组件
 * @module components/edit-panel/DefaultEditor
 * @description 为没有专用插件的基础卡片提供默认编辑器，支持 JSON 编辑和表单模式
 */

import { ref, computed, watch, onMounted } from 'vue';
import { Button, Checkbox, Input, Select, Textarea } from '@chips/components';
import type { BaseCardInfo } from '@/core/state/stores/card';
import type { FormField } from './types';
import { t } from '@/services/i18n-service';

// ==================== Props ====================
interface Props {
  /** 基础卡片信息 */
  baseCard: BaseCardInfo;
  /** 配置 Schema */
  schema?: Record<string, unknown>;
  /** 编辑模式 */
  mode?: 'json' | 'form';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'form',
});

// ==================== Emits ====================
const emit = defineEmits<{
  /** 配置变更 */
  'config-change': [config: Record<string, unknown>];
  /** 验证结果 */
  'validation': [valid: boolean, errors: string[]];
}>();

// ==================== State ====================
/** 当前编辑模式 */
const currentMode = ref(props.mode);

/** JSON 编辑器内容 */
const jsonContent = ref('');

/** JSON 解析错误 */
const jsonError = ref<string | null>(null);

/** 本地配置副本 */
const localConfig = ref<Record<string, unknown>>({});

/** 表单字段列表 */
const formFields = ref<FormField[]>([]);

/** 表单验证错误 */
const validationErrors = ref<Map<string, string>>(new Map());

// ==================== Computed ====================
/** 是否为 JSON 模式 */
const isJsonMode = computed(() => currentMode.value === 'json');

/** 是否为表单模式 */
const isFormMode = computed(() => currentMode.value === 'form');

/** 是否有验证错误 */
const hasErrors = computed(() => {
  if (isJsonMode.value) {
    return jsonError.value !== null;
  }
  return validationErrors.value.size > 0;
});

/** 格式化的 JSON 内容 */
const formattedJson = computed(() => {
  try {
    return JSON.stringify(localConfig.value, null, 2);
  } catch {
    return '{}';
  }
});

/** 卡片类型显示名称 */
/** 卡片类型显示名称，统一使用 PascalCase（卡片文件格式规范标准） */
const cardTypeName = computed(() => {
  const typeNames: Record<string, string> = {
    RichTextCard: t('card_window.type_rich_text'),
    MarkdownCard: t('card_window.type_markdown'),
    ImageCard: t('card_window.type_image'),
    VideoCard: t('card_window.type_video'),
    AudioCard: t('card_window.type_audio'),
    CodeBlockCard: t('card_window.type_code'),
    ListCard: t('card_window.type_list'),
  };

  return typeNames[props.baseCard.type] || props.baseCard.type;
});

// ==================== Methods ====================
/**
 * 初始化编辑器
 */
function initializeEditor(): void {
  // 初始化本地配置
  localConfig.value = { ...props.baseCard.config };
  
  // 初始化 JSON 内容
  jsonContent.value = formattedJson.value;
  
  // 初始化表单字段
  initializeFormFields();
}

/**
 * 初始化表单字段
 */
function initializeFormFields(): void {
  // 如果有 schema，从 schema 生成字段
  if (props.schema) {
    formFields.value = generateFieldsFromSchema(props.schema);
  } else {
    // 否则从当前配置推断字段
    formFields.value = generateFieldsFromConfig(localConfig.value);
  }
}

/**
 * 从 Schema 生成表单字段
 */
function generateFieldsFromSchema(schema: Record<string, unknown>): FormField[] {
  const fields: FormField[] = [];
  const properties = (schema.properties as Record<string, unknown>) ?? {};
  const required = (schema.required as string[]) ?? [];
  
  for (const [key, value] of Object.entries(properties)) {
    const propSchema = value as Record<string, unknown>;
    const title = propSchema.title as string | undefined;
    const description = propSchema.description as string | undefined;
    const label = title ?? description ?? key;
    const placeholder = title ? description : undefined;

    const field: FormField = {
      key,
      label,
      type: mapSchemaType(propSchema.type as string),
      default: propSchema.default,
      required: required.includes(key),
      placeholder,
    };
    
    // 处理枚举值
    if (propSchema.enum) {
      field.type = 'select';
      field.options = (propSchema.enum as unknown[]).map(v => ({
        label: String(v),
        value: v,
      }));
    }
    
    // 处理验证规则
    if (propSchema.minimum !== undefined || propSchema.maximum !== undefined) {
      field.validation = {
        min: propSchema.minimum as number,
        max: propSchema.maximum as number,
      };
    }
    
    if (propSchema.pattern) {
      field.validation = {
        ...field.validation,
        pattern: propSchema.pattern as string,
      };
    }
    
    fields.push(field);
  }
  
  return fields;
}

/**
 * 从配置推断表单字段
 */
function generateFieldsFromConfig(config: Record<string, unknown>): FormField[] {
  const fields: FormField[] = [];
  
  for (const [key, value] of Object.entries(config)) {
    const field: FormField = {
      key,
      label: formatFieldLabel(key),
      type: inferFieldType(value),
      default: value,
      required: false,
    };
    
    fields.push(field);
  }
  
  return fields;
}

/**
 * 映射 Schema 类型到表单字段类型
 */
function mapSchemaType(type: string): FormField['type'] {
  const typeMap: Record<string, FormField['type']> = {
    string: 'string',
    number: 'number',
    integer: 'number',
    boolean: 'boolean',
  };
  return typeMap[type] ?? 'string';
}

/**
 * 推断字段类型
 */
function inferFieldType(value: unknown): FormField['type'] {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb')) return 'color';
    if (value.length > 100) return 'textarea';
  }
  return 'string';
}

/**
 * 格式化字段标签
 */
function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/**
 * 切换编辑模式
 */
function toggleMode(): void {
  if (currentMode.value === 'json') {
    // 从 JSON 模式切换到表单模式
    if (!parseJsonContent()) {
      return; // JSON 解析失败，不切换
    }
    currentMode.value = 'form';
  } else {
    // 从表单模式切换到 JSON 模式
    jsonContent.value = formattedJson.value;
    currentMode.value = 'json';
  }
}

/**
 * 解析 JSON 内容
 */
function parseJsonContent(): boolean {
  try {
    const parsed = JSON.parse(jsonContent.value);
    localConfig.value = parsed;
    jsonError.value = null;
    return true;
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : t('default_editor.json_parse_error');
    return false;
  }
}

/**
 * 处理 JSON 内容变更
 */
function handleJsonChange(value: string): void {
  jsonContent.value = value;
  
  // 尝试解析并更新配置
  if (parseJsonContent()) {
    emitConfigChange();
  }
}

/**
 * 处理表单字段变更
 */
function handleFieldChange(key: string, value: unknown): void {
  localConfig.value = {
    ...localConfig.value,
    [key]: value,
  };
  
  // 验证字段
  validateField(key, value);
  
  // 发送变更
  emitConfigChange();
}

/**
 * 验证单个字段
 */
function validateField(key: string, value: unknown): void {
  const field = formFields.value.find(f => f.key === key);
  if (!field) return;
  
  validationErrors.value.delete(key);
  
  // 必填验证
    if (field.required && (value === undefined || value === null || value === '')) {
      validationErrors.value.set(
        key,
        t('default_editor.validation_required', { field: t(field.label) })
      );
      return;
    }
  
  // 自定义验证规则
  if (field.validation) {
    if (typeof value === 'number') {
      if (field.validation.min !== undefined && value < field.validation.min) {
        validationErrors.value.set(
          key,
          t('default_editor.validation_min', { field: t(field.label), min: field.validation.min })
        );
        return;
      }
      if (field.validation.max !== undefined && value > field.validation.max) {
        validationErrors.value.set(
          key,
          t('default_editor.validation_max', { field: t(field.label), max: field.validation.max })
        );
        return;
      }
    }
    
    if (typeof value === 'string' && field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        validationErrors.value.set(
          key,
          field.validation.message ??
            t('default_editor.validation_pattern', { field: t(field.label) })
        );
        return;
      }
    }
  }
}

/**
 * 验证所有字段
 */
function validateAll(): boolean {
  validationErrors.value.clear();
  
  for (const field of formFields.value) {
    validateField(field.key, localConfig.value[field.key]);
  }
  
  const isValid = validationErrors.value.size === 0;
  emit('validation', isValid, Array.from(validationErrors.value.values()));
  return isValid;
}

/**
 * 发送配置变更
 */
function emitConfigChange(): void {
  emit('config-change', { ...localConfig.value });
}

/**
 * 格式化 JSON
 */
function formatJson(): void {
  if (parseJsonContent()) {
    jsonContent.value = formattedJson.value;
  }
}

/**
 * 重置配置
 */
function resetConfig(): void {
  localConfig.value = { ...props.baseCard.config };
  jsonContent.value = formattedJson.value;
  jsonError.value = null;
  validationErrors.value.clear();
  emitConfigChange();
}

function handleStringFieldUpdate(key: string, value: unknown): void {
  handleFieldChange(key, String(value ?? ''));
}

function handleNumberFieldUpdate(key: string, value: unknown): void {
  handleFieldChange(key, Number(value));
}

function handleBooleanFieldUpdate(key: string, value: unknown): void {
  handleFieldChange(key, Boolean(value));
}

/**
 * 获取字段值
 */
function getFieldValue(key: string): unknown {
  return localConfig.value[key] ?? '';
}

/**
 * 获取字段错误
 */
function getFieldError(key: string): string | undefined {
  return validationErrors.value.get(key);
}

// ==================== Watchers ====================
// 监听基础卡片变化
watch(() => props.baseCard, () => {
  initializeEditor();
}, { deep: true });

// 监听模式变化
watch(() => props.mode, (newMode) => {
  currentMode.value = newMode;
});

// ==================== Lifecycle ====================
onMounted(() => {
  initializeEditor();
});

// ==================== Expose ====================
defineExpose({
  currentMode,
  localConfig,
  hasErrors,
  validateAll,
  resetConfig,
  formatJson,
});
</script>

<template>
  <div class="default-editor">
    <!-- 工具栏 -->
    <div class="default-editor__toolbar">
      <div class="default-editor__info">
        <span class="default-editor__type">{{ cardTypeName }}</span>
        <span class="default-editor__id">{{ baseCard.id }}</span>
      </div>
      
      <div class="default-editor__actions">
        <Button
          class="default-editor__btn default-editor__btn--mode"
          html-type="button"
          type="text"
          :title="isJsonMode ? t('default_editor.switch_to_form') : t('default_editor.switch_to_json')"
          @click="toggleMode"
        >
          {{ isJsonMode ? '📝' : '{ }' }}
        </Button>
        <Button
          v-if="isJsonMode"
          class="default-editor__btn"
          html-type="button"
          type="text"
          :title="t('default_editor.format_json')"
          @click="formatJson"
        >
          ✨
        </Button>
        <Button
          class="default-editor__btn"
          html-type="button"
          type="text"
          :title="t('default_editor.reset_config')"
          @click="resetConfig"
        >
          ↺
        </Button>
      </div>
    </div>

    <!-- JSON 编辑器模式 -->
    <div
      v-if="isJsonMode"
      class="default-editor__json"
    >
      <Textarea
        class="default-editor__json-input"
        :class="{ 'default-editor__json-input--error': jsonError }"
        :model-value="jsonContent"
        :status="jsonError ? 'error' : undefined"
        @update:model-value="handleJsonChange"
      />
      <Transition name="default-editor-fade">
        <div
          v-if="jsonError"
          class="default-editor__json-error"
        >
          {{ jsonError }}
        </div>
      </Transition>
    </div>

    <!-- 表单编辑器模式 -->
    <div
      v-if="isFormMode"
      class="default-editor__form"
    >
      <div
        v-if="formFields.length === 0"
        class="default-editor__empty"
      >
        <p>{{ t('default_editor.empty') }}</p>
      </div>
      
      <div
        v-for="field in formFields"
        :key="field.key"
        class="default-editor__field"
        :class="{ 'default-editor__field--error': getFieldError(field.key) }"
      >
        <label
          class="default-editor__label"
          :for="`field-${field.key}`"
        >
          {{ t(field.label) }}
          <span
            v-if="field.required"
            class="default-editor__required"
          >*</span>
        </label>
        
        <!-- 字符串输入 -->
        <Input
          v-if="field.type === 'string'"
          :id="`field-${field.key}`"
          type="text"
          class="default-editor__input"
          :model-value="String(getFieldValue(field.key) ?? '')"
          :placeholder="field.placeholder ? t(field.placeholder) : undefined"
          @update:model-value="handleStringFieldUpdate(field.key, $event)"
        />
        
        <!-- 数字输入 -->
        <Input
          v-if="field.type === 'number'"
          :id="`field-${field.key}`"
          type="number"
          class="default-editor__input"
          :model-value="String(getFieldValue(field.key) ?? '')"
          :min="field.validation?.min"
          :max="field.validation?.max"
          :placeholder="field.placeholder ? t(field.placeholder) : undefined"
          @update:model-value="handleNumberFieldUpdate(field.key, $event)"
        />
        
        <!-- 布尔输入 -->
        <Checkbox
          v-if="field.type === 'boolean'"
          class="default-editor__checkbox"
          :model-value="!!getFieldValue(field.key)"
          @update:model-value="handleBooleanFieldUpdate(field.key, $event)"
        >
          {{ t('default_editor.checkbox_enable') }}
        </Checkbox>
        
        <!-- 下拉选择 -->
        <Select
          v-if="field.type === 'select'"
          :id="`field-${field.key}`"
          class="default-editor__select"
          :options="field.options ?? []"
          :model-value="getFieldValue(field.key) ?? ''"
          @update:model-value="handleStringFieldUpdate(field.key, $event)"
        />
        
        <!-- 多行文本 -->
        <Textarea
          v-if="field.type === 'textarea'"
          :id="`field-${field.key}`"
          class="default-editor__textarea"
          :model-value="String(getFieldValue(field.key) ?? '')"
          :placeholder="field.placeholder ? t(field.placeholder) : undefined"
          rows="3"
          @update:model-value="handleStringFieldUpdate(field.key, $event)"
        />
        
        <!-- 颜色选择 -->
        <div
          v-if="field.type === 'color'"
          class="default-editor__color-wrapper"
        >
          <Input
            :id="`field-${field.key}`"
            type="color"
            class="default-editor__color"
            :model-value="String(getFieldValue(field.key) ?? '#000000')"
            @update:model-value="handleStringFieldUpdate(field.key, $event)"
          />
          <Input
            type="text"
            class="default-editor__color-text"
            :model-value="String(getFieldValue(field.key) ?? '')"
            @update:model-value="handleStringFieldUpdate(field.key, $event)"
          />
        </div>
        
        <!-- 错误提示 -->
        <Transition name="default-editor-fade">
          <span
            v-if="getFieldError(field.key)"
            class="default-editor__error"
          >
            {{ getFieldError(field.key) }}
          </span>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 容器 ==================== */
.default-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ==================== 工具栏 ==================== */
.default-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-sm, 8px);
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
  background: var(--chips-color-surface-variant, #f5f5f5);
  flex-shrink: 0;
}

.default-editor__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.default-editor__type {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.default-editor__id {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666666);
  font-family: var(--chips-font-mono, monospace);
}

.default-editor__actions {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
}

.default-editor__btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--chips-font-size-sm, 14px);
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
}

.default-editor__btn:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.default-editor__btn--mode {
  font-family: var(--chips-font-mono, monospace);
}

/* ==================== JSON 编辑器 ==================== */
.default-editor__json {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.default-editor__json-input {
  flex: 1;
  width: 100%;
}

.default-editor__json-input .chips-textarea__inner {
  padding: var(--chips-spacing-md, 12px);
  font-family: var(--chips-font-mono, monospace);
  font-size: var(--chips-font-size-sm, 14px);
  line-height: 1.5;
  color: var(--chips-color-text-primary, #1a1a1a);
  background: var(--chips-color-surface, #ffffff);
  border: none;
  resize: none;
  outline: none;
}

.default-editor__json-input--error .chips-textarea__inner {
  background: var(--chips-color-error-bg, #fef2f2);
}

.default-editor__json-error {
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-error, #ef4444);
  background: var(--chips-color-error-bg, #fef2f2);
  border-top: 1px solid var(--chips-color-error, #ef4444);
}

/* ==================== 表单编辑器 ==================== */
.default-editor__form {
  flex: 1;
  padding: var(--chips-spacing-md, 12px);
  overflow: auto;
}

.default-editor__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--chips-color-text-secondary, #666666);
}

.default-editor__field {
  margin-bottom: var(--chips-spacing-md, 12px);
}

.default-editor__field--error .default-editor__input .chips-input__inner,
.default-editor__field--error .default-editor__select .chips-select__selector,
.default-editor__field--error .default-editor__textarea .chips-textarea__inner {
  border-color: var(--chips-color-error, #ef4444);
}

.default-editor__label {
  display: block;
  margin-bottom: var(--chips-spacing-xs, 4px);
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.default-editor__required {
  color: var(--chips-color-error, #ef4444);
  margin-left: 2px;
}

.default-editor__input,
.default-editor__select,
.default-editor__textarea {
  width: 100%;
}

.default-editor__input .chips-input__inner,
.default-editor__select .chips-select__selector,
.default-editor__textarea .chips-textarea__inner {
  width: 100%;
  padding: var(--chips-spacing-sm, 8px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  background: var(--chips-color-surface, #ffffff);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 4px);
  outline: none;
  transition: border-color var(--chips-transition-fast, 0.15s) ease,
              box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.default-editor__input .chips-input__inner:focus,
.default-editor__select .chips-select__selector:focus-within,
.default-editor__textarea .chips-textarea__inner:focus {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px var(--chips-color-primary-alpha, rgba(59, 130, 246, 0.1));
}

.default-editor__textarea .chips-textarea__inner {
  min-height: 80px;
  resize: vertical;
}

/* 复选框 */
.default-editor__checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
}

.default-editor__checkbox .chips-checkbox__label {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* 颜色选择 */
.default-editor__color-wrapper {
  display: flex;
  gap: var(--chips-spacing-sm, 8px);
}

.default-editor__color {
  width: 40px;
  height: 34px;
}

.default-editor__color .chips-input__inner {
  padding: 2px;
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
}

.default-editor__color-text {
  flex: 1;
}

.default-editor__color-text .chips-input__inner {
  width: 100%;
}

/* 错误提示 */
.default-editor__error {
  display: block;
  margin-top: var(--chips-spacing-xs, 4px);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-error, #ef4444);
}

/* ==================== 过渡动画 ==================== */
.default-editor-fade-enter-active,
.default-editor-fade-leave-active {
  transition: opacity var(--chips-transition-fast, 0.15s) ease;
}

.default-editor-fade-enter-from,
.default-editor-fade-leave-to {
  opacity: 0;
}
</style>
