/**
 * useCardExport Composable
 * 
 * 封装卡片导出逻辑，提供统一的导出接口
 * 通过 SDK 调用导出功能，完全遵循中心路由原则
 * 
 * @module composables/useCardExport
 */

import { ref, type Ref } from 'vue';
import type { ChipsSDK } from '@chips/sdk';
import { t } from '@/services/i18n-service';

/**
 * 导出状态
 */
export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error' | 'cancelled';

/**
 * 导出格式
 */
export type ExportFormat = 'card' | 'html' | 'pdf' | 'image';

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 输出路径 */
  outputPath: string;
  /** 是否包含资源（card格式） */
  includeResources?: boolean;
  /** 是否压缩（card格式） */
  compress?: boolean;
  /** 主题ID */
  themeId?: string;
  /** 图片格式（image格式） */
  imageFormat?: 'png' | 'jpg';
  /** 图片质量（image格式） */
  imageQuality?: number;
  /** 缩放比例（image格式） */
  scale?: number;
  /** 页面格式（pdf格式） */
  pageFormat?: 'a4' | 'a5' | 'letter';
  /** 页面方向（pdf格式） */
  orientation?: 'portrait' | 'landscape';
  /** 是否包含资源（html格式） */
  includeAssets?: boolean;
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 输出路径 */
  outputPath?: string;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
  };
  /** 警告列表 */
  warnings?: string[];
  /** 统计信息 */
  stats?: {
    duration?: number;
    fileSize?: number;
    [key: string]: unknown;
  };
}

interface ExportProgressInfo {
  percent?: number;
  currentStep?: string;
  taskId?: string;
}

/**
 * useCardExport 返回值
 */
export interface UseCardExportReturn {
  /** 当前导出状态 */
  status: Ref<ExportStatus>;
  /** 导出进度 (0-100) */
  progress: Ref<number>;
  /** 导出消息 */
  message: Ref<string>;
  /** 当前任务ID */
  taskId: Ref<string | null>;
  /** 执行导出 */
  executeExport: (
    cardId: string,
    format: ExportFormat,
    options: ExportOptions
  ) => Promise<ExportResult>;
  /** 取消导出 */
  cancelExport: () => Promise<boolean>;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 卡片导出 Composable
 * 
 * @param sdk - ChipsSDK 实例
 * @returns 导出状态和方法
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useCardExport } from '@/composables/useCardExport';
 * import { ChipsSDK } from '@chips/sdk';
 * 
 * const sdk = new ChipsSDK();
 * await sdk.initialize();
 * 
 * const {
 *   status,
 *   progress,
 *   message,
 *   executeExport,
 *   cancelExport
 * } = useCardExport(sdk);
 * 
 * // 导出卡片
 * const result = await executeExport(cardId, 'html', {
 *   outputPath: '/exports/my-card'
 * });
 * 
 * if (result.success) {
 *   console.warn('导出成功', result.outputPath);
 * }
 * </script>
 * ```
 */
export function useCardExport(sdk: ChipsSDK): UseCardExportReturn {
  // 响应式状态
  const status = ref<ExportStatus>('idle');
  const progress = ref<number>(0);
  const message = ref<string>('');
  const taskId = ref<string | null>(null);

  /**
   * 执行导出操作
   */
  async function executeExport(
    cardId: string,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> {
    // 重置状态
    status.value = 'exporting';
    progress.value = 0;
    message.value = t('export_panel.status_preparing');
    taskId.value = null;

    try {
      // 通过 SDK 的 CardAPI.export() 方法执行导出
      // SDK 内部会通过 CoreConnector 路由到 Foundation
      const result = await sdk.card.export(cardId, format, {
        ...options,
        onProgress: (progressInfo: ExportProgressInfo) => {
          progress.value = progressInfo.percent || 0;
          message.value = progressInfo.currentStep || t('export_panel.status_processing');
          if (!taskId.value && progressInfo.taskId) {
            taskId.value = progressInfo.taskId;
          }
        },
      });

      // 处理结果
      if (result.success) {
        status.value = 'success';
        progress.value = 100;
        message.value = t('export_panel.status_success', {
          path: result.outputPath || t('export_panel.status_done'),
        });

        // 5秒后自动重置状态
        setTimeout(() => {
          if (status.value === 'success') {
            reset();
          }
        }, 5000);

        return {
          success: true,
          outputPath: result.outputPath,
          stats: result.stats,
        };
      } else {
        status.value = 'error';
        message.value = t('export_panel.status_failed', {
          error: result.error?.message || t('export_panel.status_unknown_error'),
        });

        return {
          success: false,
          error: result.error,
          warnings: result.warnings,
        };
      }
    } catch (error) {
      status.value = 'error';
      const errorMessage = error instanceof Error ? error.message : t('export_panel.status_unknown_error');
      message.value = t('export_panel.status_failed', { error: errorMessage });

      return {
        success: false,
        error: {
          code: 'EXPORT_EXCEPTION',
          message: errorMessage,
        },
      };
    }
  }

  /**
   * 取消导出操作
   */
  async function cancelExport(): Promise<boolean> {
    if (status.value !== 'exporting' || !taskId.value) {
      return false;
    }

    try {
      // 通过 SDK 取消转换任务
      const cancelled = await sdk.conversion.cancelConversion(taskId.value);

      if (cancelled) {
        status.value = 'cancelled';
        message.value = t('export_panel.status_cancelled');
        progress.value = 0;

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to cancel export:', error);
      return false;
    }
  }

  /**
   * 重置状态
   */
  function reset(): void {
    status.value = 'idle';
    progress.value = 0;
    message.value = '';
    taskId.value = null;
  }

  return {
    status,
    progress,
    message,
    taskId,
    executeExport,
    cancelExport,
    reset,
  };
}
