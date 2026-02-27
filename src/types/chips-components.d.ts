declare module '@chips/component-library' {
  import type { ComponentType, FC } from 'react';

  type Component = ComponentType<any>;

  // 基础组件
  export const Button: Component;
  export const Input: Component;
  export const Select: Component;
  export const Checkbox: Component;
  export const CheckboxGroup: Component;
  export const Radio: Component;
  export const RadioGroup: Component;
  export const Switch: Component;
  export const Textarea: Component;
  export const Slider: Component;

  // 布局组件
  export const Row: Component;
  export const Col: Component;
  export const Flex: Component;
  export const Space: Component;
  export const Card: Component;

  // 表单组件
  export const Form: Component;
  export const FormItem: Component;

  // 反馈组件
  export const Loading: Component;
  export const Tooltip: Component;
  export const Modal: Component;
  export const Alert: Component;
  export const Popover: Component;
  export const Progress: Component;
  export const Drawer: Component;

  // 导航组件
  export const Tabs: Component;
  export const TabPane: Component;
  export const Menu: Component;
  export const MenuItem: Component;
  export const SubMenu: Component;
  export const Breadcrumb: Component;
  export const BreadcrumbItem: Component;
  export const Pagination: Component;
  export const Dropdown: Component;

  // 数据展示组件
  export const Text: Component;
  export const Image: Component;
  export const Icon: Component;
  export const Tag: Component;
  export const Badge: Component;
  export const Avatar: Component;
  export const Empty: Component;

  // 卡片辅助组件
  export const CardWrapper: Component;
  export const CardHeader: Component;
  export const CardLoading: Component;
  export const CardError: Component;

  // Provider 组件
  export const ChipsProvider: Component;
  export const ThemeProvider: Component;

  // 主题系统
  export const ThemeContextKey: symbol;
  export function createThemeContext(initialTheme?: unknown): unknown;
  export function provideThemeContext(context: unknown): void;
  export function useThemeContext(): unknown;
  export function themeToCSSVariables(theme: unknown): Record<string, string>;
  export const defaultTheme: unknown;

  // 工具函数
  export function classNames(...args: unknown[]): string;
  export function generateId(): string;

  // 组合式函数
  export function useTheme(): unknown;
  export function useMessage(): unknown;
  export function useTranslation(): unknown;

  // 版本
  export const version: string;

  // 实例类型
  export type InputInstance = {
    inputRef: HTMLInputElement | null;
    focus: () => void;
    blur: () => void;
    select: () => void;
    clear: () => void;
  };
}
