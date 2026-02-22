/**
 * SDK Service
 * @module services/sdk-service
 * @description 初始化并缓存编辑器使用的 ChipsSDK 实例
 *
 * 在新架构中，SDK 的 CoreConnector 自动检测 window.chips Bridge API。
 * - 在 Chips Host 中运行时：Bridge 由 preload 脚本注入
 * - 在 chipsd dev 中运行时：Mock Bridge 由 Vite 插件注入
 */

import { ChipsSDK, type ChipsSDKOptions, CoreConnector } from '@chips/sdk';

let sdkPromise: Promise<ChipsSDK> | null = null;
let connectorInstance: CoreConnector | null = null;

function createConnector(): CoreConnector {
  if (connectorInstance) return connectorInstance;

  // CoreConnector 内置 Bridge 自动检测（_getChipsBridge）。
  // 当 window.chips 存在时，connect() 直接标记为已连接，
  // request() 通过 bridge.invoke() 路由，无需 WebSocket。
  connectorInstance = new CoreConnector();

  return connectorInstance;
}

export async function getEditorSdk(): Promise<ChipsSDK> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const connector = createConnector();
      const options: ChipsSDKOptions = {
        connectorInstance: connector,
        autoConnect: true,
        debug: import.meta.env.DEV,
      };
      const sdk = new ChipsSDK(options);
      await sdk.initialize();
      return sdk;
    })();
  }

  return sdkPromise;
}

export async function getEditorConnector(): Promise<CoreConnector> {
  const sdk = await getEditorSdk();
  return sdk.connector;
}
