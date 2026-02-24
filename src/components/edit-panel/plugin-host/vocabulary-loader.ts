import type { IframeI18nEnvelope } from './types';

interface VocabularyLoaderOptions {
  getPluginId: () => string;
  isEnabled: () => boolean;
  getLocalVocabulary: (pluginId: string, locale: string) => Promise<Record<string, string> | null>;
  getHostVocabulary: (pluginId: string, locale: string) => Promise<Record<string, string> | null>;
}

export interface IframeVocabularyLoader {
  reset(): void;
  invalidatePendingLoad(): void;
  load(locale: string): Promise<Record<string, string>>;
  buildEnvelope(locale: string, vocabulary: Record<string, string>): IframeI18nEnvelope;
  getCurrentVersion(): string;
}

export function createIframeVocabularyLoader(
  options: VocabularyLoaderOptions
): IframeVocabularyLoader {
  let loadSequence = 0;
  let versionSequence = 0;
  let currentVersion = 'init';

  return {
    reset(): void {
      loadSequence += 1;
      versionSequence = 0;
      currentVersion = 'init';
    },

    invalidatePendingLoad(): void {
      loadSequence += 1;
    },

    async load(locale: string): Promise<Record<string, string>> {
      if (!options.isEnabled()) {
        currentVersion = 'init';
        return {};
      }

      const pluginId = options.getPluginId();
      if (!pluginId) {
        currentVersion = 'init';
        return {};
      }

      const sequence = ++loadSequence;
      const [localVocabulary, hostVocabulary] = await Promise.all([
        options.getLocalVocabulary(pluginId, locale),
        options.getHostVocabulary(pluginId, locale),
      ]);

      const merged: Record<string, string> = {};
      const keys = new Set<string>([
        ...Object.keys(localVocabulary ?? {}),
        ...Object.keys(hostVocabulary ?? {}),
      ]);

      for (const key of keys) {
        const hostValue = hostVocabulary?.[key];
        const localValue = localVocabulary?.[key];

        if (typeof hostValue === 'string' && hostValue.trim().length > 0) {
          if (hostValue === key) {
            if (typeof localValue === 'string' && localValue.trim().length > 0 && localValue !== key) {
              merged[key] = localValue;
            }
            continue;
          }

          merged[key] = hostValue;
          continue;
        }

        if (typeof localValue === 'string' && localValue.trim().length > 0) {
          merged[key] = localValue;
        }
      }

      if (sequence !== loadSequence) {
        return {};
      }

      return merged;
    },

    buildEnvelope(locale: string, vocabulary: Record<string, string>): IframeI18nEnvelope {
      const pluginId = options.getPluginId() || 'unknown-plugin';
      currentVersion = `${pluginId}:${locale}:v${++versionSequence}`;

      return {
        locale,
        version: currentVersion,
        payload: {
          mode: 'full',
          vocabulary,
        },
      };
    },

    getCurrentVersion(): string {
      return currentVersion;
    },
  };
}
