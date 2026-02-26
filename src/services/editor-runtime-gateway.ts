import {
  RuntimeClient,
  useConfigHook,
  useI18nHook,
  usePlugin,
  useThemeHook,
  type RuntimeInvokeOptions,
  type StandardError,
  type UseConfigHook,
  type UseI18nHook,
  type UsePluginHook,
  type UseThemeHook,
} from '@chips/sdk';

export type EditorRuntimeError = StandardError;

let runtimeClientInstance: RuntimeClient | null = null;
let themeHookInstance: UseThemeHook | null = null;
let i18nHookInstance: UseI18nHook | null = null;
let pluginHookInstance: UsePluginHook | null = null;
let configHookInstance: UseConfigHook | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRuntimeError(error: unknown): EditorRuntimeError {
  if (isRecord(error) && typeof error.code === 'string' && typeof error.message === 'string') {
    return {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
      ...(typeof error.retryable === 'boolean' ? { retryable: error.retryable } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'RUNTIME_GATEWAY_ERROR',
      message: error.message,
      details: {
        name: error.name,
      },
    };
  }

  return {
    code: 'RUNTIME_GATEWAY_ERROR',
    message: 'Editor runtime request failed',
    details: {
      cause: error,
    },
  };
}

export function getEditorRuntimeClient(): RuntimeClient {
  if (!runtimeClientInstance) {
    runtimeClientInstance = new RuntimeClient();
  }

  return runtimeClientInstance;
}

export async function invokeEditorRuntime<TResult = unknown>(
  namespace: string,
  action: string,
  params?: unknown,
  options?: RuntimeInvokeOptions
): Promise<TResult> {
  try {
    return await getEditorRuntimeClient().invoke<TResult>(namespace, action, params, options);
  } catch (error: unknown) {
    throw toRuntimeError(error);
  }
}

export function subscribeEditorRuntimeEvent<TPayload = unknown>(
  event: string,
  callback: (payload: TPayload) => void
): () => void {
  try {
    return getEditorRuntimeClient().on(event, (payload: unknown) => {
      callback(payload as TPayload);
    });
  } catch (error: unknown) {
    throw toRuntimeError(error);
  }
}

export function getEditorThemeHook(): UseThemeHook {
  if (!themeHookInstance) {
    themeHookInstance = useThemeHook({
      runtimeClient: getEditorRuntimeClient(),
    });
  }

  return themeHookInstance;
}

export function getEditorI18nHook(): UseI18nHook {
  if (!i18nHookInstance) {
    i18nHookInstance = useI18nHook({
      runtimeClient: getEditorRuntimeClient(),
    });
  }

  return i18nHookInstance;
}

export function getEditorPluginHook(): UsePluginHook {
  if (!pluginHookInstance) {
    pluginHookInstance = usePlugin({
      runtimeClient: getEditorRuntimeClient(),
    });
  }

  return pluginHookInstance;
}

export function getEditorConfigHook<TValue = unknown>(): UseConfigHook<TValue> {
  if (!configHookInstance) {
    configHookInstance = useConfigHook({
      runtimeClient: getEditorRuntimeClient(),
    });
  }

  return configHookInstance as UseConfigHook<TValue>;
}

export function __resetEditorRuntimeGatewayForTests(): void {
  runtimeClientInstance = null;
  themeHookInstance = null;
  i18nHookInstance = null;
  pluginHookInstance = null;
  configHookInstance = null;
}
