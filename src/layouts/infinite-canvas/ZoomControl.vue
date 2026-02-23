<script setup lang="ts">
/**
 * 缩放控制器组件
 * @module layouts/infinite-canvas/ZoomControl
 * @description 提供缩放控制功能，点击更多按钮展开选项
 * 
 * 设计说明：
 * - 默认只显示：滑块 + 加减号 + 更多按钮（三个点）
 * - 点击更多按钮时展开：百分比选择框 + 重置按钮 + 适应按钮
 * - 鼠标移出整个控制条后收起展开内容
 */

import { ref, computed } from 'vue';
import { Button, Select } from '@chips/components';
import { t } from '@/services/i18n-service';

interface Props {
  /** 当前缩放值 */
  zoom: number;
  /** 最小缩放值 */
  minZoom?: number;
  /** 最大缩放值 */
  maxZoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minZoom: 0.1,
  maxZoom: 5,
});

const emit = defineEmits<{
  /** 放大事件 */
  zoomIn: [];
  /** 缩小事件 */
  zoomOut: [];
  /** 缩放到指定值事件 */
  zoomTo: [value: number];
  /** 重置视图事件 */
  reset: [];
  /** 适应内容事件 */
  fit: [];
}>();

/** 是否展开更多选项 */
const isExpanded = ref(false);

/** 缩放百分比 */
const zoomPercent = computed(() => Math.round(props.zoom * 100));

/** 预设缩放值 */
const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300];

/** 下拉选项 */
const zoomOptions = computed(() => {
  const options = zoomPresets.map((preset) => ({
    label: `${preset}%`,
    value: preset,
  }));
  if (!zoomPresets.includes(zoomPercent.value)) {
    options.push({ label: `${zoomPercent.value}%`, value: zoomPercent.value });
  }
  return options;
});

/** 是否可以放大 */
const canZoomIn = computed(() => props.zoom < props.maxZoom);

/** 是否可以缩小 */
const canZoomOut = computed(() => props.zoom > props.minZoom);

/**
 * 处理滑块变化
 */
function handleSliderChange(value: number | [number, number]): void {
  const nextValue = Array.isArray(value) ? value[0] : value;
  emit('zoomTo', nextValue / 100);
}

/**
 * 选择预设值
 */
function handlePresetSelect(value: number | string): void {
  const nextValue = typeof value === 'number' ? value : Number(value);
  emit('zoomTo', nextValue / 100);
}

/**
 * 切换展开状态
 */
function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}

/**
 * 鼠标离开 - 收起更多选项
 */
function handleMouseLeave(): void {
  isExpanded.value = false;
}
</script>

<template>
  <div
    class="zoom-control"
    @mouseleave="handleMouseLeave"
  >
    <!-- 基础控件：缩小按钮 -->
    <Button
      class="zoom-control__button"
      :disabled="!canZoomOut"
      :title="t('zoom_control.zoom_out')"
      type="text"
      html-type="button"
      @click="emit('zoomOut')"
    >
      −
    </Button>

    <!-- 基础控件：缩放滑块 -->
    <div class="zoom-control__slider-container">
      <input
        type="range"
        class="zoom-control__slider"
        :min="(minZoom ?? 0.1) * 100"
        :max="(maxZoom ?? 5) * 100"
        :step="5"
        :value="zoomPercent"
        @input="handleSliderChange(Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- 基础控件：放大按钮 -->
    <Button
      class="zoom-control__button"
      :disabled="!canZoomIn"
      :title="t('zoom_control.zoom_in')"
      type="text"
      html-type="button"
      @click="emit('zoomIn')"
    >
      +
    </Button>

    <!-- 更多按钮 -->
    <Button
      class="zoom-control__button zoom-control__more"
      :class="{ 'zoom-control__more--active': isExpanded }"
      :title="t('zoom_control.more')"
      type="text"
      html-type="button"
      @click="toggleExpanded"
    >
      ⋯
    </Button>

    <!-- 展开内容 -->
    <Transition name="expand">
      <div v-if="isExpanded" class="zoom-control__expanded">
        <!-- 缩放百分比选择 -->
        <div class="zoom-control__value">
          <Select
            class="zoom-control__select"
            :options="zoomOptions"
            :model-value="zoomPercent"
            @update:model-value="handlePresetSelect"
          />
        </div>

        <!-- 重置按钮 -->
        <Button
          class="zoom-control__button zoom-control__button--text"
          :title="t('zoom_control.reset')"
          type="text"
          html-type="button"
          @click="emit('reset')"
        >
          {{ t('zoom_control.reset_label') }}
        </Button>

        <!-- 适应内容按钮 -->
        <Button
          class="zoom-control__button zoom-control__button--text"
          :title="t('zoom_control.fit')"
          type="text"
          html-type="button"
          @click="emit('fit')"
        >
          {{ t('zoom_control.fit_label') }}
        </Button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.zoom-control {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--chips-color-surface, rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--chips-color-border-light, rgba(255, 255, 255, 0.6));
  border-radius: var(--chips-radius-lg, 8px);
  box-shadow: var(--chips-shadow-float, 0 6px 16px -2px rgba(0, 0, 0, 0.14));
  z-index: 1000;
}

.zoom-control__button {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface-variant, #f0f2f5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--chips-color-text, #0f172a);
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.zoom-control__button:hover:not(:disabled) {
  background: var(--chips-color-primary-subtle, rgba(37, 99, 235, 0.1));
  color: var(--chips-color-primary, #2563eb);
}

.zoom-control__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-control__button--text {
  width: auto;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
}

/* 更多按钮样式 */
.zoom-control__more {
  font-size: 16px;
  letter-spacing: 1px;
}

.zoom-control__more--active {
  background: var(--chips-color-primary-subtle, rgba(37, 99, 235, 0.1));
  color: var(--chips-color-primary, #2563eb);
}

.zoom-control__slider-container {
  width: 100px;
  min-width: 100px;
  flex-shrink: 0;
}

.zoom-control__slider {
  width: 100%;
  height: 20px;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.zoom-control__slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  background: var(--chips-color-border, #e0e0e0);
  border-radius: 2px;
}

.zoom-control__slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--chips-color-primary, #3b82f6);
  border: 2px solid var(--chips-color-surface, #ffffff);
  border-radius: 50%;
  margin-top: -5px;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.zoom-control__slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.zoom-control__slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.15);
}

.zoom-control__slider::-moz-range-track {
  width: 100%;
  height: 4px;
  background: var(--chips-color-border, #e0e0e0);
  border-radius: 2px;
  border: none;
}

.zoom-control__slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--chips-color-primary, #3b82f6);
  border: 2px solid var(--chips-color-surface, #ffffff);
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.zoom-control__slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

/* 展开区域 */
.zoom-control__expanded {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--chips-color-border, #e0e0e0);
}

.zoom-control__value {
  min-width: 56px;
}

.zoom-control__select {
  width: 100%;
}

.zoom-control__select .chips-select__selector {
  padding: 3px 6px;
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface, #ffffff);
  font-size: 11px;
  cursor: pointer;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.zoom-control__select .chips-select__selector:focus-within {
  border-color: var(--chips-color-primary, #3b82f6);
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
