/**
 * useCardExport Hook
 *
 * 封装卡片导出逻辑，提供统一的导出接口
 * 通过 SDK 调用导出功能，完全遵循中心路由原则
 *
 * @module composables/useCardExport
 */

import { useState, useCallback, useRef } from 'react';
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
  status: ExportStatus;
  /** 导出进度 (0-100) */
  progress: number;
  /** 导出消息 */
  message: string;
  /** 当前任务ID */
  taskId: string | null;
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
 * 卡片导出 Hook
 *
 * @param sdk - ChipsSDK 实例
 * @returns 导出状态和方法
 *
 * @example
 * ```tsx
 * import { useCardExport } from '@/composables/useCardExport';
 * import { ChipsSDK } from '@chips/sdk';
 *
 * const sdk = createSdk();
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
 * ```
 */
export function useCardExport(sdk: ChipsSDK): UseCardExportReturn {
  // 响应式状态
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const taskIdRef = useRef<string | null>(null);

  /**
   * 执行导出操作
   */
  const executeExport = useCallback(async (
    cardId: string,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> => {
    // 重置状态
    setStatus('exporting');
    setProgress(0);
    setMessage(t('export_panel.status_preparing'));
    setTaskId(null);
    taskIdRef.current = null;

    try {
      // 通过 SDK 的 CardAPI.export() 方法执行导出
      // SDK 内部会通过桥接层路由到 Foundation
      const result = await sdk.card.export(cardId, format, {
        ...options,
        onProgress: (progressInfo: ExportProgressInfo) => {
          setProgress(progressInfo.percent || 0);
          setMessage(progressInfo.currentStep || t('export_panel.status_processing'));
          if (!taskIdRef.current && progressInfo.taskId) {
            setTaskId(progressInfo.taskId);
            taskIdRef.current = progressInfo.taskId;
          }
        },
      });

      // 处理结果
      if (result.success) {
        setStatus('success');
        setProgress(100);
        setMessage(t('export_panel.status_success', {
          path: result.outputPath || t('export_panel.status_done'),
        }));

        // 5秒后自动重置状态
        setTimeout(() => {
          setStatus((currentStatus) => {
            if (currentStatus === 'success') {
              setStatus('idle');
              setProgress(0);
              setMessage('');
              setTaskId(null);
              taskIdRef.current = null;
            }
            return currentStatus;
          });
        }, 5000);

        return {
          success: true,
          outputPath: result.outputPath,
          stats: result.stats,
        };
      } else {
        setStatus('error');
        setMessage(t('export_panel.status_failed', {
          error: result.error?.message || t('export_panel.status_unknown_error'),
        }));

        return {
          success: false,
          error: result.error,
          warnings: result.warnings,
        };
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : t('export_panel.status_unknown_error');
      setMessage(t('export_panel.status_failed', { error: errorMessage }));

      return {
        success: false,
        error: {
          code: 'EXPORT_EXCEPTION',
          message: errorMessage,
        },
      };
    }
  }, [sdk]);

  /**
   * 取消导出操作
   */
  const cancelExport = useCallback(async (): Promise<boolean> => {
    if (status !== 'exporting' || !taskIdRef.current) {
      return false;
    }

    try {
      // 通过 SDK 取消转换任务
      const cancelled = await sdk.conversion.cancelConversion(taskIdRef.current);

      if (cancelled) {
        setStatus('cancelled');
        setMessage(t('export_panel.status_cancelled'));
        setProgress(0);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to cancel export:', error);
      return false;
    }
  }, [sdk, status]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setTaskId(null);
    taskIdRef.current = null;
  }, []);

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
