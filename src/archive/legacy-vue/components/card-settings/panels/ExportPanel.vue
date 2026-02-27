<script setup lang="ts">
/**
 * ExportPanel 导出面板组件
 * @module components/card-settings/panels/ExportPanel
 *
 * 负责卡片导出为各种格式（.card / HTML / PDF / 图片）
 * 使用薯片组件库，遵循主题系统规范
 */

import { ref, computed, watch } from 'vue';
import type { CardInfo } from '@/core/state';
import { resolveCardPath as resolveWorkspaceCardPath } from '@/services/card-path-service';
import { saveCardToWorkspace } from '@/services/card-persistence-service';
import { resourceService } from '@/services/resource-service';
import { t } from '@/services/i18n-service';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** 卡片信息 */
  cardInfo?: CardInfo;
}

const props = defineProps<Props>();

// 导出状态
const exportProgress = ref(0);
const exportStatus = ref<'idle' | 'exporting' | 'success' | 'error'>('idle');
const exportMessage = ref('');

const ROOT_PREFIX = resourceService.workspaceRoot.split('/').slice(0, -1).join('/');

function toRootRelative(path: string): string {
  if (path.startsWith(ROOT_PREFIX + '/')) {
    return path.slice(ROOT_PREFIX.length + 1);
  }
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
}

const externalRootRelative = toRootRelative(resourceService.externalRoot);

/**
 * 清理文件名中的非法字符
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/:*?"<>|]/g, '_')
    .replace(/[ -]/g, '')
    .trim();
}

/**
 * 生成唯一文件名
 */
async function generateUniqueFileName(
  baseName: string,
  extension: string
): Promise<{ fileName: string; fullPath: string }> {
  const cleanBaseName = sanitizeFileName(baseName) || t('card_settings.untitled');
  const separator = '_';
  const maxAttempts = 1000;

  const originalFileName = `${cleanBaseName}${extension}`;
  const originalPath = `${externalRootRelative}/${originalFileName}`;

  const exists = await resourceService.exists(originalPath);
  if (!exists) {
    return { fileName: originalFileName, fullPath: originalPath };
  }

  for (let i = 1; i <= maxAttempts; i += 1) {
    const numberedFileName = `${cleanBaseName}${separator}${i}${extension}`;
    const numberedPath = `${externalRootRelative}/${numberedFileName}`;
    const numberedExists = await resourceService.exists(numberedPath);
    if (!numberedExists) {
      return { fileName: numberedFileName, fullPath: numberedPath };
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fallbackFileName = `${cleanBaseName}${separator}${timestamp}${extension}`;
  return { fileName: fallbackFileName, fullPath: `${externalRootRelative}/${fallbackFileName}` };
}

/**
 * 生成唯一目录名
 */
async function generateUniqueDirectoryName(
  baseName: string
): Promise<{ directoryName: string; fullPath: string }> {
  const cleanBaseName = sanitizeFileName(baseName) || t('card_settings.untitled');
  const separator = '_';
  const maxAttempts = 1000;

  const originalPath = `${externalRootRelative}/${cleanBaseName}`;
  const exists = await resourceService.exists(originalPath);
  if (!exists) {
    return { directoryName: cleanBaseName, fullPath: originalPath };
  }

  for (let i = 1; i <= maxAttempts; i += 1) {
    const numberedName = `${cleanBaseName}${separator}${i}`;
    const numberedPath = `${externalRootRelative}/${numberedName}`;
    const numberedExists = await resourceService.exists(numberedPath);
    if (!numberedExists) {
      return { directoryName: numberedName, fullPath: numberedPath };
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fallbackName = `${cleanBaseName}${separator}${timestamp}`;
  return { directoryName: fallbackName, fullPath: `${externalRootRelative}/${fallbackName}` };
}

// 导出格式配置
const exportFormats = computed(() => [
  {
    key: 'card' as const,
    icon: '📦',
    label: t('card_settings.export_card'),
    desc: '.card',
  },
  {
    key: 'html' as const,
    icon: '🌐',
    label: t('card_settings.export_html'),
    desc: 'HTML',
  },
  {
    key: 'pdf' as const,
    icon: '📄',
    label: t('card_settings.export_pdf'),
    desc: 'PDF',
  },
  {
    key: 'image' as const,
    icon: '🖼️',
    label: t('card_settings.export_image'),
    desc: 'PNG',
  },
]);

/**
 * 执行导出操作
 */
async function handleExport(format: 'card' | 'html' | 'pdf' | 'image'): Promise<void> {
  if (exportStatus.value === 'exporting') return;
  if (!props.cardInfo) {
    exportStatus.value = 'error';
    exportMessage.value = t('card_settings.export_no_card');
    return;
  }

  exportStatus.value = 'exporting';
  exportProgress.value = 0;
  exportMessage.value = t('card_settings.export_start', { format: format.toUpperCase() });

  try {
    exportProgress.value = 10;

    const cardName = props.cardInfo.metadata.name || t('card_settings.untitled_card');
    const cardId = props.cardId;
    const cardPath = resolveWorkspaceCardPath(cardId, props.cardInfo.filePath, resourceService.workspaceRoot);

    // 所有格式导出前，先将卡片（含基础卡片内容）保存到工作区
    // 确保磁盘上的文件与编辑器内存状态一致
    exportMessage.value = t('card_settings.export_save_card');
    exportProgress.value = 15;
    await saveCardToWorkspace(props.cardInfo, cardPath);

    if (format === 'card') {
      exportMessage.value = t('card_settings.export_create_package');
      exportProgress.value = 35;

      const { fileName, fullPath } = await generateUniqueFileName(cardName, '.card');
      const result = await resourceService.exportCard(cardId, fullPath);
      if (!result.success) {
        throw new Error(result.error?.message || t('card_settings.export_package_failed'));
      }

      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = t('card_settings.export_done', {
        path: `${externalRootRelative}/${fileName}`,
      });
    } else if (format === 'html') {
      exportMessage.value = t('card_settings.export_convert');
      exportProgress.value = 35;

      const { directoryName, fullPath } = await generateUniqueDirectoryName(cardName);
      const result = await resourceService.convertToHTML(cardPath, fullPath, {
        includeAssets: true,
        themeId: props.cardInfo.metadata.theme,
      });

      if (!result.success) {
        throw new Error(result.error?.message || t('card_settings.export_html_failed'));
      }

      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = t('card_settings.export_done', {
        path: `${externalRootRelative}/${directoryName}/`,
      });
    } else if (format === 'pdf') {
      exportMessage.value = t('card_settings.export_convert');
      exportProgress.value = 35;

      const { fileName, fullPath } = await generateUniqueFileName(cardName, '.pdf');
      const result = await resourceService.convertToPDF(cardPath, fullPath, {
        themeId: props.cardInfo.metadata.theme,
      });

      if (!result.success) {
        throw new Error(result.error?.message || t('card_settings.export_pdf_failed'));
      }

      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = t('card_settings.export_done', {
        path: `${externalRootRelative}/${fileName}`,
      });
    } else if (format === 'image') {
      exportMessage.value = t('card_settings.export_convert');
      exportProgress.value = 35;

      const { fileName, fullPath } = await generateUniqueFileName(cardName, '.png');
      const result = await resourceService.convertToImage(cardPath, fullPath, {
        format: 'png',
        themeId: props.cardInfo.metadata.theme,
      });

      if (!result.success) {
        throw new Error(result.error?.message || t('card_settings.export_image_failed'));
      }

      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = t('card_settings.export_done', {
        path: `${externalRootRelative}/${fileName}`,
      });
    }

    if (exportStatus.value === 'success') {
      setTimeout(() => {
        if (exportStatus.value === 'success') {
          exportStatus.value = 'idle';
          exportProgress.value = 0;
          exportMessage.value = '';
        }
      }, 5000);
    }
  } catch (error) {
    exportStatus.value = 'error';
    exportMessage.value = t('card_settings.export_failed', {
      error: error instanceof Error ? error.message : t('card_settings.export_unknown_error'),
    });
  }
}

// 当面板可见时重置导出状态
watch(
  () => props.cardId,
  () => {
    exportProgress.value = 0;
    exportStatus.value = 'idle';
    exportMessage.value = '';
  }
);
</script>

<template>
  <div class="export-panel">
    <!-- 导出格式选项 -->
    <div class="export-panel__field">
      <label class="export-panel__label">
        {{ t('card_settings.export_format') }}
      </label>
      <div class="export-panel__grid">
        <button
          v-for="fmt in exportFormats"
          :key="fmt.key"
          type="button"
          class="export-panel__format-card"
          :disabled="exportStatus === 'exporting'"
          @click="handleExport(fmt.key)"
        >
          <span class="export-panel__format-icon" aria-hidden="true">{{ fmt.icon }}</span>
          <div class="export-panel__format-text">
            <span class="export-panel__format-title">{{ fmt.label }}</span>
            <span class="export-panel__format-desc">{{ fmt.desc }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 导出进度 -->
    <div v-if="exportStatus !== 'idle'" class="export-panel__progress">
      <progress
        class="export-panel__progress-bar"
        :class="{
          'export-panel__progress-bar--success': exportStatus === 'success',
          'export-panel__progress-bar--error': exportStatus === 'error',
        }"
        :value="exportProgress"
        max="100"
      />
      <p
        class="export-panel__message"
        :class="{
          'export-panel__message--success': exportStatus === 'success',
          'export-panel__message--error': exportStatus === 'error',
        }"
      >
        {{ exportMessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-lg, 20px);
}

.export-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.export-panel__label {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

/* 导出格式网格 - 2x2 */
.export-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--chips-spacing-md, 16px);
}

.export-panel__format-card {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-md, 16px);
  border: 2px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--chips-transition-fast, 150ms ease),
    background-color var(--chips-transition-fast, 150ms ease);
}

.export-panel__format-card:hover:not(:disabled) {
  border-color: var(--chips-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--chips-color-primary) 3%, transparent);
}

.export-panel__format-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-panel__format-icon {
  font-size: 28px;
  flex-shrink: 0;
  line-height: 1;
}

.export-panel__format-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.export-panel__format-title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text, #111827);
}

.export-panel__format-desc {
  font-size: 12px;
  color: var(--chips-color-text-secondary, #6b7280);
}

/* 进度区域 */
.export-panel__progress {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-md, 16px);
  background: color-mix(in srgb, var(--chips-color-text) 3%, transparent);
  border-radius: var(--chips-radius-md, 8px);
}

.export-panel__progress-bar {
  width: 100%;
  height: 6px;
  border: none;
  border-radius: 999px;
  appearance: none;
  overflow: hidden;
  background: var(--chips-color-border, #e5e7eb);
}

.export-panel__progress-bar::-webkit-progress-bar {
  background: var(--chips-color-border, #e5e7eb);
  border-radius: 999px;
}

.export-panel__progress-bar::-webkit-progress-value {
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.export-panel__progress-bar::-moz-progress-bar {
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 999px;
}

.export-panel__progress-bar--success::-webkit-progress-value {
  background: var(--chips-color-success, #10b981);
}

.export-panel__progress-bar--success::-moz-progress-bar {
  background: var(--chips-color-success, #10b981);
}

.export-panel__progress-bar--error::-webkit-progress-value {
  background: var(--chips-color-error, #ef4444);
}

.export-panel__progress-bar--error::-moz-progress-bar {
  background: var(--chips-color-error, #ef4444);
}

.export-panel__message {
  margin: 0;
  font-size: 13px;
  color: var(--chips-color-text-secondary, #6b7280);
  text-align: center;
  line-height: 1.5;
}

.export-panel__message--success {
  color: var(--chips-color-success, #10b981);
}

.export-panel__message--error {
  color: var(--chips-color-error, #ef4444);
}
</style>
