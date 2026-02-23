/**
 * 编辑器多语言服务
 * @module services/i18n-service
 */

import type { ChipsSDK } from '@chips/sdk';
import { ref } from 'vue';
import { getEditorSdk } from './sdk-service';
import { zhCN, enUS } from '@/i18n/editor';

const DEFAULT_LOCALE = 'zh-CN';
const FALLBACK_LOCALE = 'en-US';
const LOCAL_TRANSLATIONS: Record<string, TranslationTable> = {
  'zh-CN': zhCN as TranslationTable,
  'en-US': enUS as TranslationTable,
};

let initialized = false;
let sdkInstance: ChipsSDK | null = null;
let currentLocale = normalizeLocale(getBrowserLocale() ?? DEFAULT_LOCALE);
let pendingLocale: string | null = null;
const i18nRevision = ref(0);

type TranslationTable = Record<string, unknown>;

function getBrowserLocale(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.navigator?.language ?? window.navigator?.languages?.[0] ?? null;
}

function normalizeLocale(locale: string): string {
  if (LOCAL_TRANSLATIONS[locale]) {
    return locale;
  }
  const base = locale.split('-')[0];
  if (base === 'zh') {
    return 'zh-CN';
  }
  if (base === 'en') {
    return 'en-US';
  }
  return locale;
}

function getTranslationTable(locale: string): TranslationTable {
  const normalized = normalizeLocale(locale);
  const fallbackTable = LOCAL_TRANSLATIONS[DEFAULT_LOCALE];
  if (fallbackTable) {
    return LOCAL_TRANSLATIONS[normalized] ?? fallbackTable;
  }
  return LOCAL_TRANSLATIONS[normalized] ?? {};
}

function resolveTranslationValue(
  table: TranslationTable,
  key: string
): string | null {
  const segments = key.split('.');
  let current: unknown = table;

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return null;
    }
    current = record[segment];
  }

  return typeof current === 'string' ? current : null;
}

function formatMessage(
  message: string,
  params?: Record<string, string | number>
): string {
  if (!params) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function getLocalTranslation(
  key: string,
  params?: Record<string, string | number>
): string | null {
  const table = getTranslationTable(currentLocale);
  const message = resolveTranslationValue(table as TranslationTable, key);
  if (message) {
    return formatMessage(message, params);
  }

  const fallbackTable = getTranslationTable(FALLBACK_LOCALE);
  const fallbackMessage = resolveTranslationValue(fallbackTable, key);
  if (!fallbackMessage) {
    return null;
  }
  return formatMessage(fallbackMessage, params);
}

export async function initializeEditorI18n(locale?: string): Promise<void> {
  const sdk = await getEditorSdk();
  sdkInstance = sdk;

  if (!initialized) {
    sdk.i18n.addTranslation('zh-CN', zhCN);
    sdk.i18n.addTranslation('en-US', enUS);
    initialized = true;
  }

  const targetLocale = normalizeLocale(locale ?? pendingLocale ?? currentLocale);
  currentLocale = targetLocale;
  pendingLocale = null;
  sdk.setLocale(targetLocale);
  i18nRevision.value += 1;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const revision = i18nRevision.value;
  void revision;

  if (!sdkInstance) {
    return getLocalTranslation(key, params) ?? key;
  }
  const translated = sdkInstance.t(key, params);
  if (translated !== key) {
    return translated;
  }
  return getLocalTranslation(key, params) ?? translated;
}

export function setLocale(locale: string): void {
  if (!sdkInstance) {
    currentLocale = normalizeLocale(locale);
    pendingLocale = currentLocale;
    i18nRevision.value += 1;
    return;
  }
  currentLocale = normalizeLocale(locale);
  pendingLocale = null;
  sdkInstance.setLocale(currentLocale);
  i18nRevision.value += 1;
}
