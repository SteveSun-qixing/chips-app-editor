/**
 * SDK 连接器
 * @module core/connector
 * @description 负责与 Chips-SDK 的连接和通信
 */

import { BridgeClient, ChipsSDK } from '@chips/sdk';
import type { EventEmitter } from './event-manager';

async function initializeSdk(debug: boolean): Promise<ChipsSDK> {
  const bridgeClient = new BridgeClient();
  const SdkClass = ChipsSDK;
  const sdk = new SdkClass({
    connectorInstance: bridgeClient,
    autoConnect: true,
    debug,
  });
  await sdk.initialize();
  return sdk;
}

/**
 * SDK 连接配置选项
 */
export interface SDKConnectorOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 调试模式 */
  debug?: boolean;
}

/**
 * SDK 连接器
 *
 * 负责与 Chips-SDK 的连接和通信管理
 */
export class SDKConnector {
  /** SDK 实例 */
  private sdk: ChipsSDK | null = null;
  /** SDK 初始化中的 Promise */
  private sdkPromise: Promise<ChipsSDK> | null = null;
  /** 事件发射器 */
  private events: EventEmitter;
  /** 连接状态 */
  private isConnected = false;
  /** 连接配置 */
  private options: SDKConnectorOptions;

  constructor(events: EventEmitter, options: SDKConnectorOptions = {}) {
    this.events = events;
    this.options = {
      timeout: 30000,
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      debug: false,
      ...options,
    };
  }

  /**
   * 初始化并连接 SDK
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('SDK already connected');
    }

    try {
      this.log('Connecting to SDK...');
      this.sdk = await this.getOrCreateSdk();
      this.isConnected = true;
      this.events.emit('connector:connected', {});
      this.log('SDK connected successfully');
    } catch (error) {
      this.events.emit('connector:error', { error });
      throw error;
    }
  }

  /**
   * 断开 SDK 连接
   */
  disconnect(): void {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
    }
    this.sdkPromise = null;

    if (this.isConnected) {
      this.isConnected = false;
      this.events.emit('connector:disconnected', {});
    }
  }

  /**
   * 获取 SDK 实例
   */
  getSDK(): ChipsSDK {
    if (!this.sdk) {
      throw new Error('SDK not connected');
    }
    return this.sdk;
  }

  /**
   * 当前连接状态
   */
  get connected(): boolean {
    return this.isConnected;
  }

  private async getOrCreateSdk(): Promise<ChipsSDK> {
    if (this.sdk) {
      return this.sdk;
    }

    if (!this.sdkPromise) {
      this.sdkPromise = initializeSdk(Boolean(this.options.debug));
    }

    return this.sdkPromise;
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.warn('[SDKConnector]', ...args);
    }
  }
}

/**
 * 创建 SDK 连接器
 */
export function createConnector(events: EventEmitter, options?: SDKConnectorOptions): SDKConnector {
  return new SDKConnector(events, options);
}
