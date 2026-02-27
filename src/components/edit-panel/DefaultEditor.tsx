import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ChipsButton as Button, ChipsCheckbox as Checkbox, ChipsInput as Input, ChipsSelect as Select, ChipsTextarea as Textarea } from '@chips/component-library';
import type { BaseCardInfo } from '@/core/state/stores/card';
import type { FormField } from './types';
import { t } from '@/services/i18n-service';
import './DefaultEditor.css';

// ==================== Props ====================
export interface DefaultEditorProps {
    /** 基础卡片信息 */
    baseCard: BaseCardInfo;
    /** 配置 Schema */
    schema?: Record<string, unknown>;
    /** 编辑模式 */
    mode?: 'json' | 'form';
    /** 配置变更 */
    onConfigChange?: (config: Record<string, unknown>) => void;
    /** 验证结果 */
    onValidation?: (valid: boolean, errors: string[]) => void;
}

export interface DefaultEditorRef {
    currentMode: 'json' | 'form';
    localConfig: Record<string, unknown>;
    hasErrors: boolean;
    validateAll: () => boolean;
    resetConfig: () => void;
    formatJson: () => void;
}

export const DefaultEditor = forwardRef<DefaultEditorRef, DefaultEditorProps>((props, ref) => {
    const {
        baseCard,
        schema,
        mode = 'form',
        onConfigChange,
        onValidation,
    } = props;

    // ==================== State ====================
    const [currentMode, setCurrentMode] = useState<'json' | 'form'>(mode);
    const [jsonContent, setJsonContent] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());

    // ==================== Computed ====================
    const isJsonMode = currentMode === 'json';
    const isFormMode = currentMode === 'form';

    const hasErrors = useMemo(() => {
        if (isJsonMode) {
            return jsonError !== null;
        }
        return validationErrors.size > 0;
    }, [isJsonMode, jsonError, validationErrors]);

    const formattedJson = useMemo(() => {
        try {
            return JSON.stringify(localConfig, null, 2);
        } catch {
            return '{}';
        }
    }, [localConfig]);

    const cardTypeName = useMemo(() => {
        const typeNames: Record<string, string> = {
            RichTextCard: t('card_window.type_rich_text'),
            MarkdownCard: t('card_window.type_markdown'),
            ImageCard: t('card_window.type_image'),
            VideoCard: t('card_window.type_video'),
            AudioCard: t('card_window.type_audio'),
            CodeBlockCard: t('card_window.type_code'),
            ListCard: t('card_window.type_list'),
        };

        return typeNames[baseCard.type] || baseCard.type;
    }, [baseCard.type]);

    // ==================== Methods ====================

    /**
     * 映射 Schema 类型到表单字段类型
     */
    const mapSchemaType = useCallback((type: string): FormField['type'] => {
        const typeMap: Record<string, FormField['type']> = {
            string: 'string',
            number: 'number',
            integer: 'number',
            boolean: 'boolean',
        };
        return typeMap[type] ?? 'string';
    }, []);

    /**
     * 从 Schema 生成表单字段
     */
    const generateFieldsFromSchema = useCallback((schemaObj: Record<string, unknown>): FormField[] => {
        const fields: FormField[] = [];
        const properties = (schemaObj.properties as Record<string, unknown>) ?? {};
        const required = (schemaObj.required as string[]) ?? [];

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
    }, [mapSchemaType]);

    /**
     * 格式化字段标签
     */
    const formatFieldLabel = useCallback((key: string): string => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
            .trim();
    }, []);

    /**
     * 推断字段类型
     */
    const inferFieldType = useCallback((value: unknown): FormField['type'] => {
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'string') {
            if (value.startsWith('#') || value.startsWith('rgb')) return 'color';
            if (value.length > 100) return 'textarea';
        }
        return 'string';
    }, []);

    /**
     * 从配置推断表单字段
     */
    const generateFieldsFromConfig = useCallback((config: Record<string, unknown>): FormField[] => {
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
    }, [formatFieldLabel, inferFieldType]);

    const initializeFormFields = useCallback((config: Record<string, unknown>) => {
        if (schema) {
            setFormFields(generateFieldsFromSchema(schema));
        } else {
            setFormFields(generateFieldsFromConfig(config));
        }
    }, [schema, generateFieldsFromSchema, generateFieldsFromConfig]);

    const initializeEditor = useCallback(() => {
        const config = { ...baseCard.config };
        setLocalConfig(config);
        setJsonContent(JSON.stringify(config, null, 2));
        initializeFormFields(config);
    }, [baseCard.config, initializeFormFields]);

    /**
     * 发送配置变更
     */
    const emitConfigChange = useCallback((config: Record<string, unknown>) => {
        onConfigChange?.({ ...config });
    }, [onConfigChange]);

    /**
     * 解析 JSON 内容
     */
    const parseJsonContent = useCallback((content: string): boolean => {
        try {
            const parsed = JSON.parse(content);
            setLocalConfig(parsed);
            setJsonError(null);
            return true;
        } catch (error) {
            setJsonError(error instanceof Error ? error.message : t('default_editor.json_parse_error'));
            return false;
        }
    }, []);

    const toggleMode = useCallback(() => {
        if (currentMode === 'json') {
            if (!parseJsonContent(jsonContent)) {
                return;
            }
            setCurrentMode('form');
        } else {
            setJsonContent(formattedJson);
            setCurrentMode('json');
        }
    }, [currentMode, jsonContent, parseJsonContent, formattedJson]);

    const handleJsonChange = useCallback((value: string) => {
        setJsonContent(value);
        try {
            const parsed = JSON.parse(value);
            setLocalConfig(parsed);
            setJsonError(null);
            emitConfigChange(parsed);
        } catch (error) {
            setJsonError(error instanceof Error ? error.message : t('default_editor.json_parse_error'));
        }
    }, [emitConfigChange]);

    const validateField = useCallback((key: string, value: unknown, currentFields: FormField[]): Map<string, string> => {
        const field = currentFields.find(f => f.key === key);
        const newErrors = new Map(validationErrors);

        if (!field) return newErrors;

        newErrors.delete(key);

        if (field.required && (value === undefined || value === null || value === '')) {
            newErrors.set(key, t('default_editor.validation_required', { field: t(field.label) }));
            return newErrors;
        }

        if (field.validation) {
            if (typeof value === 'number') {
                if (field.validation.min !== undefined && value < field.validation.min) {
                    newErrors.set(key, t('default_editor.validation_min', { field: t(field.label), min: field.validation.min }));
                    return newErrors;
                }
                if (field.validation.max !== undefined && value > field.validation.max) {
                    newErrors.set(key, t('default_editor.validation_max', { field: t(field.label), max: field.validation.max }));
                    return newErrors;
                }
            }

            if (typeof value === 'string' && field.validation.pattern) {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                    newErrors.set(
                        key,
                        field.validation.message ?? t('default_editor.validation_pattern', { field: t(field.label) })
                    );
                    return newErrors;
                }
            }
        }

        return newErrors;
    }, [validationErrors]);

    const handleFieldChange = useCallback((key: string, value: unknown) => {
        setLocalConfig(prev => {
            const newConfig = { ...prev, [key]: value };
            const newErrors = validateField(key, value, formFields);
            setValidationErrors(newErrors);
            emitConfigChange(newConfig);
            return newConfig;
        });
    }, [formFields, validateField, emitConfigChange]);

    const validateAll = useCallback(() => {
        let newErrors = new Map<string, string>();
        for (const field of formFields) {
            newErrors = validateField(field.key, localConfig[field.key], formFields);
            // merge errors (simplistic here, could accumulate)
            // validateField above initializes from current validationErrors so doing it iteratively requires care
            // actually validateField from state would be better rewritten.
        }

        // Better full validation:
        const tempErrors = new Map<string, string>();
        for (const field of formFields) {
            const value = localConfig[field.key];
            if (field.required && (value === undefined || value === null || value === '')) {
                tempErrors.set(field.key, t('default_editor.validation_required', { field: t(field.label) }));
                continue;
            }
            if (field.validation) {
                if (typeof value === 'number') {
                    if (field.validation.min !== undefined && value < field.validation.min) {
                        tempErrors.set(field.key, t('default_editor.validation_min', { field: t(field.label), min: field.validation.min }));
                        continue;
                    }
                    if (field.validation.max !== undefined && value > field.validation.max) {
                        tempErrors.set(field.key, t('default_editor.validation_max', { field: t(field.label), max: field.validation.max }));
                        continue;
                    }
                }
                if (typeof value === 'string' && field.validation.pattern) {
                    const regex = new RegExp(field.validation.pattern);
                    if (!regex.test(value)) {
                        tempErrors.set(
                            field.key,
                            field.validation.message ?? t('default_editor.validation_pattern', { field: t(field.label) })
                        );
                        continue;
                    }
                }
            }
        }

        setValidationErrors(tempErrors);
        const isValid = tempErrors.size === 0;
        onValidation?.(isValid, Array.from(tempErrors.values()));
        return isValid;
    }, [formFields, localConfig, onValidation]);

    const formatJson = useCallback(() => {
        if (parseJsonContent(jsonContent)) {
            setJsonContent(formattedJson);
        }
    }, [jsonContent, parseJsonContent, formattedJson]);

    const resetConfig = useCallback(() => {
        const config = { ...baseCard.config };
        setLocalConfig(config);
        setJsonContent(JSON.stringify(config, null, 2));
        setJsonError(null);
        setValidationErrors(new Map());
        emitConfigChange(config);
    }, [baseCard.config, emitConfigChange]);

    const handleStringFieldUpdate = (key: string, value: unknown) => handleFieldChange(key, String(value ?? ''));
    const handleNumberFieldUpdate = (key: string, value: unknown) => handleFieldChange(key, Number(value));
    const handleBooleanFieldUpdate = (key: string, value: unknown) => handleFieldChange(key, Boolean(value));

    const getFieldValue = useCallback((key: string): unknown => {
        return localConfig[key] ?? '';
    }, [localConfig]);

    const getFieldError = useCallback((key: string): string | undefined => {
        return validationErrors.get(key);
    }, [validationErrors]);

    // ==================== Watchers ====================
    useEffect(() => {
        initializeEditor();
    }, [baseCard, initializeEditor]);

    useEffect(() => {
        setCurrentMode(mode);
    }, [mode]);

    // ==================== Lifecycle ====================
    useEffect(() => {
        initializeEditor();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==================== Expose ====================
    useImperativeHandle(ref, () => ({
        currentMode,
        localConfig,
        hasErrors,
        validateAll,
        resetConfig,
        formatJson,
    }), [currentMode, localConfig, hasErrors, validateAll, resetConfig, formatJson]);

    return (
        <div className="default-editor">
            {/* 工具栏 */}
            <div className="default-editor__toolbar">
                <div className="default-editor__info">
                    <span className="default-editor__type">{cardTypeName}</span>
                    <span className="default-editor__id">{baseCard.id}</span>
                </div>

                <div className="default-editor__actions">
                    <Button
                        className="default-editor__btn default-editor__btn--mode"
                        htmlType="button"
                        type="text"
                        title={isJsonMode ? t('default_editor.switch_to_form') : t('default_editor.switch_to_json')}
                        onClick={toggleMode}
                    >
                        {isJsonMode ? '📝' : '{ }'}
                    </Button>
                    {isJsonMode && (
                        <Button
                            className="default-editor__btn"
                            htmlType="button"
                            type="text"
                            title={t('default_editor.format_json')}
                            onClick={formatJson}
                        >
                            ✨
                        </Button>
                    )}
                    <Button
                        className="default-editor__btn"
                        htmlType="button"
                        type="text"
                        title={t('default_editor.reset_config')}
                        onClick={resetConfig}
                    >
                        ↺
                    </Button>
                </div>
            </div>

            {/* JSON 编辑器模式 */}
            {isJsonMode && (
                <div className="default-editor__json">
                    <Textarea
                        className={`default-editor__json-input ${jsonError ? 'default-editor__json-input--error' : ''}`}
                        modelValue={jsonContent}
                        status={jsonError ? 'error' : undefined}
                        onUpdate:modelValue={handleJsonChange}
                    />
                    {jsonError && (
                        <div className="default-editor__json-error default-editor-fade-enter-active">
                            {jsonError}
                        </div>
                    )}
                </div>
            )}

            {/* 表单编辑器模式 */}
            {isFormMode && (
                <div className="default-editor__form">
                    {formFields.length === 0 && (
                        <div className="default-editor__empty">
                            <p>{t('default_editor.empty')}</p>
                        </div>
                    )}

                    {formFields.map(field => (
                        <div
                            key={field.key}
                            className={`default-editor__field ${getFieldError(field.key) ? 'default-editor__field--error' : ''}`}
                        >
                            <label
                                className="default-editor__label"
                                htmlFor={`field-${field.key}`}
                            >
                                {t(field.label)}
                                {field.required && <span className="default-editor__required">*</span>}
                            </label>

                            {/* 字符串输入 */}
                            {field.type === 'string' && (
                                <Input
                                    id={`field-${field.key}`}
                                    type="text"
                                    className="default-editor__input"
                                    modelValue={String(getFieldValue(field.key) ?? '')}
                                    placeholder={field.placeholder ? t(field.placeholder) : undefined}
                                    onUpdate:modelValue={(val: string) => handleStringFieldUpdate(field.key, val)}
                                />
                            )}

                            {/* 数字输入 */}
                            {field.type === 'number' && (
                                <Input
                                    id={`field-${field.key}`}
                                    type="number"
                                    className="default-editor__input"
                                    modelValue={String(getFieldValue(field.key) ?? '')}
                                    min={field.validation?.min}
                                    max={field.validation?.max}
                                    placeholder={field.placeholder ? t(field.placeholder) : undefined}
                                    onUpdate:modelValue={(val: string | number) => handleNumberFieldUpdate(field.key, val)}
                                />
                            )}

                            {/* 布尔输入 */}
                            {field.type === 'boolean' && (
                                <Checkbox
                                    className="default-editor__checkbox"
                                    modelValue={!!getFieldValue(field.key)}
                                    onUpdate:modelValue={(val: boolean) => handleBooleanFieldUpdate(field.key, val)}
                                >
                                    {t('default_editor.checkbox_enable')}
                                </Checkbox>
                            )}

                            {/* 下拉选择 */}
                            {field.type === 'select' && (
                                <Select
                                    id={`field-${field.key}`}
                                    className="default-editor__select"
                                    options={field.options ?? []}
                                    modelValue={getFieldValue(field.key) ?? ''}
                                    onUpdate:modelValue={(val: string) => handleStringFieldUpdate(field.key, val)}
                                />
                            )}

                            {/* 多行文本 */}
                            {field.type === 'textarea' && (
                                <Textarea
                                    id={`field-${field.key}`}
                                    className="default-editor__textarea"
                                    modelValue={String(getFieldValue(field.key) ?? '')}
                                    placeholder={field.placeholder ? t(field.placeholder) : undefined}
                                    rows={3}
                                    onUpdate:modelValue={(val: string) => handleStringFieldUpdate(field.key, val)}
                                />
                            )}

                            {/* 颜色选择 */}
                            {field.type === 'color' && (
                                <div className="default-editor__color-wrapper">
                                    <Input
                                        id={`field-${field.key}`}
                                        type="color"
                                        className="default-editor__color"
                                        modelValue={String(getFieldValue(field.key) ?? '#000000')}
                                        onUpdate:modelValue={(val: string) => handleStringFieldUpdate(field.key, val)}
                                    />
                                    <Input
                                        type="text"
                                        className="default-editor__color-text"
                                        modelValue={String(getFieldValue(field.key) ?? '')}
                                        onUpdate:modelValue={(val: string) => handleStringFieldUpdate(field.key, val)}
                                    />
                                </div>
                            )}

                            {/* 错误提示 */}
                            {getFieldError(field.key) && (
                                <span className="default-editor__error default-editor-fade-enter-active">
                                    {getFieldError(field.key)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

DefaultEditor.displayName = 'DefaultEditor';
