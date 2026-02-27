<script setup lang="ts">
/**
 * 模板预览组件
 * @module components/cover-maker/TemplatePreview
 * @description 实时预览生成的封面效果
 */

import { ref, computed, watch, onMounted } from 'vue';
import type { TemplateStyle, TemplateConfig } from './types';
import { generateCoverHtml, getTemplateById } from './templates';
import { t } from '@/services/i18n-service';

interface Props {
  /** 模板 ID */
  templateId: TemplateStyle | null;
  /** 模板配置 */
  config: TemplateConfig;
  /** 封面比例 */
  aspectRatio?: string;
  /** 自定义 HTML 内容（用于 HTML 模式） */
  customHtml?: string;
}

const props = withDefaults(defineProps<Props>(), {
  aspectRatio: '3/4',
});

const emit = defineEmits<{
  /** HTML 内容更新 */
  htmlGenerated: [html: string];
}>();

/** 预览 iframe 引用 */
const iframeRef = ref<HTMLIFrameElement | null>(null);

/** 生成的 HTML 内容 */
const generatedHtml = computed(() => {
  if (props.customHtml) {
    return props.customHtml;
  }
  
  if (!props.templateId || !props.config.title) {
    return getPlaceholderHtml();
  }
  
  try {
    return generateCoverHtml(props.templateId, props.config);
  } catch {
    return getPlaceholderHtml();
  }
});

/** 当前模板信息 */
const currentTemplate = computed(() => {
  if (!props.templateId) return null;
  return getTemplateById(props.templateId);
});

/**
 * 获取默认预览 HTML
 */
function getPlaceholderHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <span>${t('cover_maker.preview_empty')}</span>
</body>
</html>`;
}

/**
 * 更新 iframe 内容
 */
function updateIframeContent(): void {
  if (!iframeRef.value) return;
  
  const doc = iframeRef.value.contentDocument;
  if (!doc) return;
  
  doc.open();
  doc.write(generatedHtml.value);
  doc.close();
  
  // 触发 HTML 生成事件
  if (props.templateId && props.config.title) {
    emit('htmlGenerated', generatedHtml.value);
  }
}

// 监听内容变化
watch(
  () => [props.templateId, props.config, props.customHtml],
  () => {
    updateIframeContent();
  },
  { deep: true }
);

// 初始化
onMounted(() => {
  updateIframeContent();
});
</script>

<template>
  <div class="template-preview">
    <div class="template-preview__header">
      <span class="template-preview__label">{{ t('cover_maker.preview_label') }}</span>
      <span v-if="currentTemplate" class="template-preview__template-name">
        {{ t(currentTemplate.name) }}
      </span>
    </div>
    
    <div
      class="template-preview__container"
      :style="{ aspectRatio: aspectRatio }"
    >
      <iframe
        ref="iframeRef"
        class="template-preview__iframe"
        sandbox="allow-same-origin"
        :title="t('cover_maker.preview_label')"
      />
    </div>
    
    <div class="template-preview__info">
      <span class="template-preview__ratio">
        {{ t('cover_maker.preview_ratio', { ratio: aspectRatio.replace('/', ':') }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.template-preview {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.template-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-preview__label {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.template-preview__template-name {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-primary, #3b82f6);
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
  padding: 2px 8px;
  border-radius: var(--chips-radius-full, 9999px);
}

.template-preview__container {
  width: 100%;
  max-width: 300px;
  border: 1px solid var(--chips-color-border, #e5e5e5);
  border-radius: var(--chips-radius-md, 8px);
  overflow: hidden;
  background: var(--chips-color-surface-secondary, #f9f9f9);
}

.template-preview__iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
}

.template-preview__info {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
}

.template-preview__ratio {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
}
</style>
