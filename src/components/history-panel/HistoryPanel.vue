<script setup lang="ts">
/**
 * 历史面板组件
 * @component HistoryPanel
 * @description 显示撤销/重做操作历史列表，支持点击跳转到特定状态
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Button } from '@chips/components';
import { useCommandManager } from '@/core/command-manager';
import { useEditorStore } from '@/core/state';
import type { CommandHistory } from '@/core/command-manager';
import { t } from '@/services/i18n-service';

/** 组件属性 */
interface Props {
  /** 最大显示数量 */
  maxItems?: number;
  /** 是否显示时间 */
  showTime?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
}

/** 组件事件 */
interface Emits {
  /** 跳转到历史记录 */
  (e: 'goto', historyId: string): void;
  /** 撤销操作 */
  (e: 'undo'): void;
  /** 重做操作 */
  (e: 'redo'): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 50,
  showTime: true,
  compact: false,
});

const emit = defineEmits<Emits>();

const commandManager = useCommandManager();
const editorStore = useEditorStore();

// 状态
const undoHistory = ref<CommandHistory[]>([]);
const redoHistory = ref<CommandHistory[]>([]);
const isLoading = ref(false);
const currentIndex = computed(() => (undoHistory.value.length > 0 ? undoHistory.value.length - 1 : -1));

// 计算属性
const canUndo = computed(() => commandManager.canUndo());
const canRedo = computed(() => commandManager.canRedo());

const displayHistory = computed(() => {
  // 合并历史记录：重做记录（未来）+ 撤销记录（过去）
  const redo = redoHistory.value.map((h, i) => ({
    ...h,
    type: 'redo' as const,
    index: i,
  }));
  
  const undo = undoHistory.value.map((h, i) => ({
    ...h,
    type: 'undo' as const,
    index: i,
  }));
  
  return [...redo.reverse(), ...undo].slice(0, props.maxItems);
});

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(editorStore.locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化相对时间
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return t('history_panel.just_now');
  } else if (diff < 3600000) {
    return t('history_panel.minutes_ago', { count: Math.floor(diff / 60000) });
  } else if (diff < 86400000) {
    return t('history_panel.hours_ago', { count: Math.floor(diff / 3600000) });
  } else {
    return formatTime(timestamp);
  }
};

// 获取操作描述（模拟 i18n）
const getDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    'command.add_base_card': 'history_panel.command_add_base_card',
    'command.remove_base_card': 'history_panel.command_remove_base_card',
    'command.move_base_card': 'history_panel.command_move_base_card',
    'command.update_base_card_config': 'history_panel.command_update_base_card_config',
    'command.batch_operation': 'history_panel.command_batch_operation',
    'command.create_window': 'history_panel.command_create_window',
    'command.close_window': 'history_panel.command_close_window',
    'command.move_window': 'history_panel.command_move_window',
    'command.resize_window': 'history_panel.command_resize_window',
    'command.set_window_state': 'history_panel.command_set_window_state',
    'command.batch_window_operation': 'history_panel.command_batch_window_operation',
  };

  const translationKey = descriptions[key];
  return translationKey ? t(translationKey) : key;
};

// 更新历史记录
const updateHistory = () => {
  undoHistory.value = commandManager.getHistory(props.maxItems);
  redoHistory.value = commandManager.getRedoHistory();
};

// 撤销操作
const handleUndo = async () => {
  if (!canUndo.value || isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.undo();
    emit('undo');
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 重做操作
const handleRedo = async () => {
  if (!canRedo.value || isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.redo();
    emit('redo');
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 跳转到特定历史记录
const handleGoto = async (historyId: string) => {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.goToHistory(historyId);
    emit('goto', historyId);
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 清空历史
const handleClear = () => {
  commandManager.clear();
  updateHistory();
};

// 监听状态变化
const handleStateChange = () => {
  updateHistory();
};

onMounted(() => {
  updateHistory();
  
  // 订阅命令管理器事件
  commandManager.on('state:changed', handleStateChange);
  commandManager.on('command:executed', handleStateChange);
  commandManager.on('command:undone', handleStateChange);
  commandManager.on('command:redone', handleStateChange);
  commandManager.on('history:cleared', handleStateChange);
});

onUnmounted(() => {
  // 取消订阅
  commandManager.off('state:changed', handleStateChange);
  commandManager.off('command:executed', handleStateChange);
  commandManager.off('command:undone', handleStateChange);
  commandManager.off('command:redone', handleStateChange);
  commandManager.off('history:cleared', handleStateChange);
});

// 监听 maxItems 变化
watch(() => props.maxItems, () => {
  updateHistory();
});
</script>

<template>
  <div class="history-panel" :class="{ compact }">
    <!-- 工具栏 -->
    <div class="history-toolbar">
      <Button
        class="history-btn"
        :disabled="!canUndo || isLoading"
        :title="t('history_panel.undo_title')"
        html-type="button"
        type="text"
        @click="handleUndo"
      >
        <span class="history-btn-icon">↶</span>
        <span v-if="!compact" class="history-btn-text">{{ t('history_panel.undo') }}</span>
      </Button>
      
      <Button
        class="history-btn"
        :disabled="!canRedo || isLoading"
        :title="t('history_panel.redo_title')"
        html-type="button"
        type="text"
        @click="handleRedo"
      >
        <span class="history-btn-icon">↷</span>
        <span v-if="!compact" class="history-btn-text">{{ t('history_panel.redo') }}</span>
      </Button>
      
      <div class="history-toolbar-spacer"></div>
      
      <Button
        class="history-btn history-btn-clear"
        :disabled="displayHistory.length === 0"
        :title="t('history_panel.clear')"
        html-type="button"
        type="text"
        @click="handleClear"
      >
        <span class="history-btn-icon">🗑</span>
      </Button>
    </div>
    
    <!-- 历史列表 -->
    <div v-if="displayHistory.length > 0" class="history-list">
      <div
        v-for="item in displayHistory"
        :key="item.id"
        class="history-item"
        :class="{
          'history-item--current': item.type === 'undo' && item.index === currentIndex,
          'history-item--redo': item.type === 'redo',
          'history-item--undo': item.type === 'undo',
        }"
        @click="handleGoto(item.id)"
      >
        <div class="history-item-indicator">
          <span v-if="item.type === 'undo' && item.index === currentIndex" class="current-marker">●</span>
          <span v-else class="history-marker">○</span>
        </div>
        
        <div class="history-item-content">
          <div class="history-item-description">
            {{ getDescription(item.description) }}
          </div>
          <div v-if="showTime && !compact" class="history-item-time">
            {{ formatRelativeTime(item.timestamp) }}
          </div>
        </div>
        
        <div v-if="item.type === 'redo'" class="history-item-badge">
          {{ t('history_panel.badge_redo') }}
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="history-empty">
      <div class="history-empty-icon">📋</div>
      <div class="history-empty-text">{{ t('history_panel.empty') }}</div>
    </div>
    
    <!-- 状态栏 -->
    <div class="history-status">
      <span>{{ t('history_panel.status_undo') }}: {{ undoHistory.length }}</span>
      <span class="history-status-divider">|</span>
      <span>{{ t('history_panel.status_redo') }}: {{ redoHistory.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--chips-color-surface, #ffffff);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-md, 8px);
  overflow: hidden;
}

.history-panel.compact {
  font-size: var(--chips-font-size-sm, 12px);
}

/* 工具栏 */
.history-toolbar {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px);
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
  background: var(--chips-color-background, #f5f5f5);
}

.history-btn {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface, #ffffff);
  color: var(--chips-color-text, #333333);
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.history-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--chips-color-text) 6%, transparent);
}

.history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-btn-icon {
  font-size: var(--chips-font-size-sm, 14px);
}

.history-btn-text {
  font-size: var(--chips-font-size-sm, 12px);
}

.history-btn-clear {
  background: transparent;
}

.history-btn-clear:hover:not(:disabled) {
  background: color-mix(in srgb, var(--chips-color-error) 15%, transparent);
  color: var(--chips-color-error, #f44336);
}

.history-toolbar-spacer {
  flex: 1;
}

/* 历史列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--chips-spacing-xs, 4px);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px);
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: color-mix(in srgb, var(--chips-color-text) 4%, transparent);
}

.history-item--current {
  background: color-mix(in srgb, var(--chips-color-primary) 12%, transparent);
}

.history-item--current:hover {
  background: color-mix(in srgb, var(--chips-color-primary) 12%, transparent);
}

.history-item--redo {
  opacity: 0.6;
}

.history-item-indicator {
  width: 16px;
  text-align: center;
  color: var(--chips-color-text-secondary, #666666);
}

.current-marker {
  color: var(--chips-color-primary, #2196f3);
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-item-description {
  font-size: var(--chips-font-size-sm, 12px);
  color: var(--chips-color-text, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: 10px;
  color: var(--chips-color-text-disabled, #999999);
  margin-top: 2px;
}

.history-item-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: color-mix(in srgb, var(--chips-color-warning) 18%, transparent);
  color: var(--chips-color-warning, #ff9800);
  border-radius: var(--chips-radius-sm, 4px);
}

/* 空状态 */
.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--chips-color-text-disabled, #999999);
}

.history-empty-icon {
  font-size: 48px;
  margin-bottom: var(--chips-spacing-sm, 8px);
}

.history-empty-text {
  font-size: var(--chips-font-size-sm, 12px);
}

/* 状态栏 */
.history-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  border-top: 1px solid var(--chips-color-border, #e0e0e0);
  background: var(--chips-color-background, #f5f5f5);
  font-size: 10px;
  color: var(--chips-color-text-disabled, #999999);
}

.history-status-divider {
  color: var(--chips-color-border, #e0e0e0);
}

/* 紧凑模式调整 */
.compact .history-toolbar {
  padding: var(--chips-spacing-xs, 4px);
}

.compact .history-btn {
  padding: 2px 6px;
}

.compact .history-item {
  padding: var(--chips-spacing-xs, 4px);
}

.compact .history-status {
  padding: 2px var(--chips-spacing-xs, 4px);
}
</style>
