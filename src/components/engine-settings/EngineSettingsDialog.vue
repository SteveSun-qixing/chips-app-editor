<script setup lang="ts">
/**
 * 编辑引擎设置弹窗
 * @module components/engine-settings/EngineSettingsDialog
 *
 * 全屏模态弹窗，在引擎最上层显示。
 * 左侧菜单栏 + 右侧动态面板，完全零硬编码。
 *
 * 架构：
 * - 左侧菜单从 settingsStore.groupedCategories 动态渲染
 * - 右侧面板通过 <component :is> 动态渲染
 * - 主组件不引用任何具体面板组件
 * - 所有分类信息来自注册中心
 *
 * 使用薯片组件库，遵循主题系统规范，使用 --chips-* CSS 变量
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Button } from '@chips/components';
import { useSettingsStore } from '@/core/state';
import { t } from '@/services/i18n-service';
import type { SettingsCategoryId } from '@/types';

interface Props {
  /** 是否显示 */
  visible: boolean;
  /** 初始激活的分类 ID */
  initialCategory?: SettingsCategoryId;
}

const props = withDefaults(defineProps<Props>(), {
  initialCategory: undefined,
});

const emit = defineEmits<{
  /** 关闭弹窗 */
  close: [];
}>();

const settingsStore = useSettingsStore();

/** 当前选中的分类 ID */
const activeCategoryId = ref<SettingsCategoryId>('');

/** 按分组排列的分类列表 */
const groupedCategories = computed(() => settingsStore.groupedCategories);

/** 当前激活的面板组件 */
const activePanelComponent = computed(() => {
  if (!activeCategoryId.value) return undefined;
  return settingsStore.getPanelComponent(activeCategoryId.value);
});

/**
 * 设置默认激活分类
 */
function syncActiveCategory(): void {
  if (props.initialCategory && settingsStore.hasPanel(props.initialCategory)) {
    activeCategoryId.value = props.initialCategory;
  } else {
    const sorted = settingsStore.sortedCategories;
    activeCategoryId.value = sorted[0]?.id ?? '';
  }
}

/**
 * 弹窗打开时，重置分类选择
 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      syncActiveCategory();
    }
  },
  { immediate: true },
);

/**
 * 选择分类
 */
function handleSelectCategory(categoryId: SettingsCategoryId): void {
  activeCategoryId.value = categoryId;
}

/**
 * 关闭弹窗
 */
function handleClose(): void {
  emit('close');
}

/**
 * 遮罩点击关闭
 */
function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as HTMLElement).classList.contains('engine-settings-overlay')) {
    handleClose();
  }
}

/**
 * Escape 键关闭
 */
function handleGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.visible) {
    handleClose();
  }
}

/**
 * 重置当前分类设置
 */
function handleResetCategory(): void {
  if (activeCategoryId.value) {
    settingsStore.resetCategory(activeCategoryId.value);
  }
}

// 全局键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="engine-settings-fade">
      <div
        v-if="visible"
        class="engine-settings-overlay"
        @click="handleOverlayClick"
      >
        <div class="engine-settings-dialog">
          <!-- 头部 -->
          <div class="engine-settings-dialog__header">
            <h2 class="engine-settings-dialog__title">
              {{ t('engine_settings.title') }}
            </h2>
            <button
              type="button"
              class="engine-settings-dialog__close-btn"
              :aria-label="t('engine_settings.close')"
              @click="handleClose"
            >
              ✕
            </button>
          </div>

          <!-- 主体：左侧菜单 + 右侧面板 -->
          <div class="engine-settings-dialog__body">
            <!-- 左侧菜单栏 -->
            <nav class="engine-settings-dialog__nav">
              <template
                v-for="(group, groupIndex) in groupedCategories"
                :key="groupIndex"
              >
                <!-- 分组分隔线（非首组） -->
                <div
                  v-if="groupIndex > 0"
                  class="engine-settings-dialog__nav-divider"
                />
                <!-- 分组内的菜单项 -->
                <button
                  v-for="category in group"
                  :key="category.id"
                  type="button"
                  :class="[
                    'engine-settings-dialog__nav-item',
                    {
                      'engine-settings-dialog__nav-item--active':
                        activeCategoryId === category.id,
                    },
                  ]"
                  @click="handleSelectCategory(category.id)"
                >
                  <span
                    v-if="category.icon"
                    class="engine-settings-dialog__nav-icon"
                  >
                    {{ category.icon }}
                  </span>
                  <span class="engine-settings-dialog__nav-label">
                    {{ t(category.labelKey) }}
                  </span>
                </button>
              </template>
            </nav>

            <!-- 右侧面板内容 -->
            <div class="engine-settings-dialog__content">
              <!-- 动态面板渲染 -->
              <component
                :is="activePanelComponent"
                v-if="activePanelComponent"
                :key="activeCategoryId"
              />

              <!-- 未找到面板的回退 -->
              <div
                v-else
                class="engine-settings-dialog__empty"
              >
                <p class="engine-settings-dialog__empty-text">
                  {{ t('engine_settings.no_settings') }}
                </p>
              </div>
            </div>
          </div>

          <!-- 底部 -->
          <div class="engine-settings-dialog__footer">
            <Button
              html-type="button"
              type="default"
              class="engine-settings-dialog__btn engine-settings-dialog__btn--reset"
              @click="handleResetCategory"
            >
              {{ t('engine_settings.reset') }}
            </Button>
            <div class="engine-settings-dialog__footer-spacer" />
            <Button
              html-type="button"
              type="primary"
              class="engine-settings-dialog__btn engine-settings-dialog__btn--close"
              @click="handleClose"
            >
              {{ t('engine_settings.close') }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============================================================
 * 遮罩层
 * ============================================================ */
.engine-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* ============================================================
 * 对话框容器
 * ============================================================ */
.engine-settings-dialog {
  width: 800px;
  height: 600px;
  max-width: 90vw;
  max-height: 85vh;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: var(
    --chips-shadow-xl,
    0 20px 25px -5px rgb(0 0 0 / 0.1)
  );
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ============================================================
 * 头部
 * ============================================================ */
.engine-settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

.engine-settings-dialog__title {
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-bold, 600);
  color: var(--chips-color-text, #111827);
  margin: 0;
  line-height: 1.4;
}

.engine-settings-dialog__close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-md, 8px);
  cursor: pointer;
  font-size: 16px;
  color: var(--chips-color-text-secondary, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color var(--chips-duration-fast, 100ms) ease,
    color var(--chips-duration-fast, 100ms) ease;
}

.engine-settings-dialog__close-btn:hover {
  background: color-mix(
    in srgb,
    var(--chips-color-text, #111827) 6%,
    transparent
  );
  color: var(--chips-color-text, #111827);
}

/* ============================================================
 * 主体：左右分栏
 * ============================================================ */
.engine-settings-dialog__body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

/* 左侧菜单栏 */
.engine-settings-dialog__nav {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--chips-color-border, #e5e7eb);
  padding: var(--chips-spacing-sm, 8px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  background: color-mix(
    in srgb,
    var(--chips-color-surface, #ffffff) 50%,
    var(--chips-color-background, #fafafa)
  );
}

.engine-settings-dialog__nav-divider {
  height: 1px;
  background: var(--chips-color-border, #e5e7eb);
  margin: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
}

.engine-settings-dialog__nav-item {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: 10px 12px;
  border: none;
  border-radius: var(--chips-radius-md, 8px);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
  text-align: left;
  width: 100%;
  transition:
    background-color var(--chips-duration-fast, 100ms) ease,
    color var(--chips-duration-fast, 100ms) ease;
}

.engine-settings-dialog__nav-item:hover {
  background: color-mix(
    in srgb,
    var(--chips-color-text, #111827) 6%,
    transparent
  );
  color: var(--chips-color-text, #111827);
}

.engine-settings-dialog__nav-item--active {
  background: color-mix(
    in srgb,
    var(--chips-color-primary, #3b82f6) 10%,
    transparent
  );
  color: var(--chips-color-primary, #3b82f6);
  font-weight: var(--chips-font-weight-medium, 500);
}

.engine-settings-dialog__nav-item--active:hover {
  background: color-mix(
    in srgb,
    var(--chips-color-primary, #3b82f6) 15%,
    transparent
  );
  color: var(--chips-color-primary, #3b82f6);
}

.engine-settings-dialog__nav-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.engine-settings-dialog__nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧内容 */
.engine-settings-dialog__content {
  flex: 1;
  min-width: 0;
  padding: var(--chips-spacing-lg, 24px);
  overflow-y: auto;
}

/* 空状态 */
.engine-settings-dialog__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.engine-settings-dialog__empty-text {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #6b7280);
}

/* ============================================================
 * 底部按钮
 * ============================================================ */
.engine-settings-dialog__footer {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-md, 16px) var(--chips-spacing-lg, 24px);
  border-top: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

.engine-settings-dialog__footer-spacer {
  flex: 1;
}

.engine-settings-dialog__btn {
  padding: 8px var(--chips-spacing-lg, 24px);
  border: none;
  border-radius: var(--chips-radius-md, 8px);
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background-color var(--chips-duration-fast, 100ms) ease,
    color var(--chips-duration-fast, 100ms) ease;
}

.engine-settings-dialog__btn--reset {
  background: transparent;
  color: var(--chips-color-text-secondary, #6b7280);
  border: 1px solid var(--chips-color-border, #e5e7eb);
}

.engine-settings-dialog__btn--reset:hover {
  background: color-mix(
    in srgb,
    var(--chips-color-text, #111827) 4%,
    transparent
  );
  color: var(--chips-color-text, #111827);
}

.engine-settings-dialog__btn--close {
  background: var(--chips-color-primary, #3b82f6);
  color: #ffffff;
}

.engine-settings-dialog__btn--close:hover {
  background: color-mix(
    in srgb,
    var(--chips-color-primary, #3b82f6) 85%,
    #000000
  );
}

/* ============================================================
 * 过渡动画
 * ============================================================ */
.engine-settings-fade-enter-active,
.engine-settings-fade-leave-active {
  transition: opacity 0.2s ease;
}

.engine-settings-fade-enter-active .engine-settings-dialog,
.engine-settings-fade-leave-active .engine-settings-dialog {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.engine-settings-fade-enter-from,
.engine-settings-fade-leave-to {
  opacity: 0;
}

.engine-settings-fade-enter-from .engine-settings-dialog,
.engine-settings-fade-leave-to .engine-settings-dialog {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
