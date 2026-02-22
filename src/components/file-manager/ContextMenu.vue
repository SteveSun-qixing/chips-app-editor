<script setup lang="ts">
/**
 * 上下文菜单组件
 * @module components/file-manager/ContextMenu
 * @description 右键上下文菜单，根据选择项显示不同的菜单选项
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { FileInfo } from '@/core/file-service';
import { t } from '@/services/i18n-service';

/**
 * 菜单项接口
 */
export interface MenuItem {
  /** 菜单项 ID */
  id: string;
  /** 显示文本（i18n key） */
  label: string;
  /** 图标 */
  icon?: string;
  /** 快捷键提示 */
  shortcut?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否为分隔线 */
  divider?: boolean;
  /** 子菜单 */
  children?: MenuItem[];
}

interface Props {
  /** 是否显示 */
  visible: boolean;
  /** 位置 X */
  x: number;
  /** 位置 Y */
  y: number;
  /** 当前选中的文件 */
  selectedFiles?: FileInfo[];
  /** 是否有剪贴板内容 */
  hasClipboard?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedFiles: () => [],
  hasClipboard: false,
});

const emit = defineEmits<{
  /** 关闭菜单 */
  close: [];
  /** 菜单项点击 */
  action: [actionId: string, files: FileInfo[]];
}>();

/** 菜单引用 */
const menuRef = ref<HTMLElement | null>(null);
/** 实际显示位置 */
const position = ref({ x: 0, y: 0 });
/** 展开的子菜单 ID */
const expandedSubmenu = ref<string | null>(null);

/** 是否选中了单个文件 */
const isSingleFile = computed(() => props.selectedFiles.length === 1);

/** 是否有选中项 */
const hasSelection = computed(() => props.selectedFiles.length > 0);

/**
 * 菜单项列表
 */
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];

  // 新建菜单（始终显示）
  items.push({
    id: 'new',
    label: 'file_manager.menu_new',
    icon: '➕',
    children: [
      { id: 'new-card', label: 'file_manager.new_card', icon: '🃏' },
      { id: 'new-box', label: 'file_manager.new_box', icon: '📦' },
    ],
  });

  items.push({ id: 'divider-1', label: '', divider: true });

  // 文件操作（需要选中项）
  if (hasSelection.value) {
    items.push({
      id: 'open',
      label: 'file_manager.open',
      icon: '📂',
      shortcut: 'Enter',
      disabled: !isSingleFile.value,
    });

    items.push({ id: 'divider-2', label: '', divider: true });

    items.push({
      id: 'cut',
      label: 'common.cut',
      icon: '✂️',
      shortcut: '⌘X',
    });

    items.push({
      id: 'copy',
      label: 'common.copy',
      icon: '📋',
      shortcut: '⌘C',
    });
  }

  // 粘贴（始终显示，但可能禁用）
  items.push({
    id: 'paste',
    label: 'common.paste',
    icon: '📥',
    shortcut: '⌘V',
    disabled: !props.hasClipboard,
  });

  if (hasSelection.value) {
    items.push({ id: 'divider-3', label: '', divider: true });

    items.push({
      id: 'rename',
      label: 'file_manager.rename',
      icon: '✏️',
      shortcut: 'F2',
      disabled: !isSingleFile.value,
    });

    items.push({
      id: 'delete',
      label: 'common.delete',
      icon: '🗑️',
      shortcut: 'Del',
    });
  }

  items.push({ id: 'divider-4', label: '', divider: true });

  // 在资源管理器中显示
  if (isSingleFile.value) {
    items.push({
      id: 'reveal',
      label: 'file_manager.reveal_in_finder',
      icon: '🔍',
    });
  }

  items.push({
    id: 'refresh',
    label: 'file_manager.refresh',
    icon: '🔄',
  });

  return items;
});

/**
 * 调整菜单位置，确保不超出视口
 */
function adjustPosition(): void {
  if (!menuRef.value) {
    position.value = { x: props.x, y: props.y };
    return;
  }

  const rect = menuRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = props.x;
  let y = props.y;

  // 右边界检查
  if (x + rect.width > viewportWidth) {
    x = viewportWidth - rect.width - 10;
  }

  // 下边界检查
  if (y + rect.height > viewportHeight) {
    y = viewportHeight - rect.height - 10;
  }

  // 确保不小于 0
  x = Math.max(10, x);
  y = Math.max(10, y);

  position.value = { x, y };
}

/**
 * 处理菜单项点击
 */
function handleItemClick(item: MenuItem): void {
  if (item.disabled || item.divider) {
    return;
  }

  if (item.children) {
    expandedSubmenu.value = expandedSubmenu.value === item.id ? null : item.id;
    return;
  }

  emit('action', item.id, props.selectedFiles);
  emit('close');
}

/**
 * 处理子菜单项点击
 */
function handleSubmenuClick(item: MenuItem): void {
  if (item.disabled || item.divider) {
    return;
  }

  emit('action', item.id, props.selectedFiles);
  emit('close');
}

/**
 * 处理鼠标进入菜单项
 */
function handleMouseEnter(item: MenuItem): void {
  if (item.children) {
    expandedSubmenu.value = item.id;
  } else {
    expandedSubmenu.value = null;
  }
}

/**
 * 处理点击外部关闭
 */
function handleClickOutside(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

/**
 * 处理 ESC 键关闭
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

// 监听显示状态，调整位置
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      expandedSubmenu.value = null;
      // 延迟调整位置，等待 DOM 渲染
      requestAnimationFrame(adjustPosition);
    }
  }
);

// 挂载时添加事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

// 卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="context-menu"
        :style="{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }"
        role="menu"
      >
        <template v-for="item in menuItems" :key="item.id">
          <!-- 分隔线 -->
          <div v-if="item.divider" class="context-menu__divider"></div>
          
          <!-- 菜单项 -->
          <div
            v-else
            class="context-menu__item"
            :class="{
              'context-menu__item--disabled': item.disabled,
              'context-menu__item--has-submenu': item.children,
              'context-menu__item--expanded': expandedSubmenu === item.id,
            }"
            :data-action-id="item.id"
            role="menuitem"
            :aria-disabled="item.disabled"
            @click="handleItemClick(item)"
            @mouseenter="handleMouseEnter(item)"
          >
            <span v-if="item.icon" class="context-menu__icon">{{ item.icon }}</span>
            <span class="context-menu__label">{{ t(item.label) }}</span>
            <span v-if="item.shortcut" class="context-menu__shortcut">{{ item.shortcut }}</span>
            <span v-if="item.children" class="context-menu__arrow">▶</span>

            <!-- 子菜单 -->
            <Transition name="submenu">
              <div
                v-if="item.children && expandedSubmenu === item.id"
                class="context-menu__submenu"
              >
                <div
                  v-for="child in item.children"
                  :key="child.id"
                  class="context-menu__item"
                  :class="{ 'context-menu__item--disabled': child.disabled }"
                  :data-action-id="child.id"
                  role="menuitem"
                  :aria-disabled="child.disabled"
                  @click.stop="handleSubmenuClick(child)"
                >
                  <span v-if="child.icon" class="context-menu__icon">{{ child.icon }}</span>
                  <span class="context-menu__label">{{ t(child.label) }}</span>
                  <span v-if="child.shortcut" class="context-menu__shortcut">{{ child.shortcut }}</span>
                </div>
              </div>
            </Transition>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 180px;
  padding: var(--chips-spacing-xs, 4px) 0;
  background-color: var(--chips-color-bg-primary, #fff);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-md, 6px);
  box-shadow: var(--chips-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.15));
  z-index: 9999;
}

.context-menu__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.context-menu__item:hover {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.05));
}

.context-menu__item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu__item--disabled:hover {
  background-color: transparent;
}

.context-menu__icon {
  width: 16px;
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
}

.context-menu__label {
  flex: 1;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
}

.context-menu__shortcut {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  margin-left: auto;
}

.context-menu__arrow {
  font-size: 10px;
  color: var(--chips-color-text-secondary, #666);
  margin-left: auto;
}

.context-menu__divider {
  height: 1px;
  margin: var(--chips-spacing-xs, 4px) 0;
  background-color: var(--chips-color-border-light, #f0f0f0);
}

.context-menu__submenu {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 160px;
  padding: var(--chips-spacing-xs, 4px) 0;
  background-color: var(--chips-color-bg-primary, #fff);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-md, 6px);
  box-shadow: var(--chips-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.15));
}

/* 动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
