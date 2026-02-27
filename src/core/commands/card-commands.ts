/**
 * 卡片操作命令
 * @module core/commands/card-commands
 * @description 实现卡片相关的可撤销操作命令
 */

import type { Command } from '../command-manager';
import type { BaseCardInfo } from '../state/stores/card';
import { getCardStore } from '../state';
import { deepClone } from '@/utils';

/**
 * 添加基础卡片命令
 * 
 * @example
 * ```typescript
 * const command = new AddBaseCardCommand(cardId, baseCard, position);
 * await commandManager.execute(command);
 * ```
 */
export class AddBaseCardCommand implements Command {
  private cardId: string;
  private baseCard: BaseCardInfo;
  private position?: number;

  /**
   * 创建添加基础卡片命令
   * @param cardId - 卡片 ID
   * @param baseCard - 基础卡片信息
   * @param position - 插入位置（可选）
   */
  constructor(cardId: string, baseCard: BaseCardInfo, position?: number) {
    this.cardId = cardId;
    this.baseCard = deepClone(baseCard);
    this.position = position;
  }

  async execute(): Promise<void> {
    const cardStore = getCardStore();
    cardStore.addBaseCard(this.cardId, this.baseCard, this.position);
  }

  async undo(): Promise<void> {
    const cardStore = getCardStore();
    cardStore.removeBaseCard(this.cardId, this.baseCard.id);
  }

  async redo(): Promise<void> {
    await this.execute();
  }

  get description(): string {
    return 'command.add_base_card';
  }
}

/**
 * 移除基础卡片命令
 * 
 * @example
 * ```typescript
 * const command = new RemoveBaseCardCommand(cardId, baseCardId);
 * await commandManager.execute(command);
 * ```
 */
export class RemoveBaseCardCommand implements Command {
  private cardId: string;
  private baseCardId: string;
  private removedCard: BaseCardInfo | null = null;
  private originalPosition: number = -1;

  /**
   * 创建移除基础卡片命令
   * @param cardId - 卡片 ID
   * @param baseCardId - 基础卡片 ID
   */
  constructor(cardId: string, baseCardId: string) {
    this.cardId = cardId;
    this.baseCardId = baseCardId;
  }

  async execute(): Promise<void> {
    const cardStore = getCardStore();
    const card = cardStore.getCard(this.cardId);
    
    if (card) {
      // 保存被移除的卡片信息和位置，用于撤销
      const index = card.structure.findIndex((bc) => bc.id === this.baseCardId);
      if (index !== -1) {
        const removed = card.structure[index];
        if (removed) {
          this.removedCard = deepClone(removed);
          this.originalPosition = index;
        }
      }
    }
    
    cardStore.removeBaseCard(this.cardId, this.baseCardId);
  }

  async undo(): Promise<void> {
    if (this.removedCard) {
      const cardStore = getCardStore();
      cardStore.addBaseCard(this.cardId, this.removedCard, this.originalPosition);
    }
  }

  async redo(): Promise<void> {
    const cardStore = getCardStore();
    cardStore.removeBaseCard(this.cardId, this.baseCardId);
  }

  get description(): string {
    return 'command.remove_base_card';
  }
}

/**
 * 移动基础卡片命令
 * 
 * @example
 * ```typescript
 * const command = new MoveBaseCardCommand(cardId, fromIndex, toIndex);
 * await commandManager.execute(command);
 * ```
 */
export class MoveBaseCardCommand implements Command {
  private cardId: string;
  private fromIndex: number;
  private toIndex: number;

  /**
   * 创建移动基础卡片命令
   * @param cardId - 卡片 ID
   * @param fromIndex - 原位置索引
   * @param toIndex - 目标位置索引
   */
  constructor(cardId: string, fromIndex: number, toIndex: number) {
    this.cardId = cardId;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }

  async execute(): Promise<void> {
    const cardStore = getCardStore();
    cardStore.reorderBaseCards(this.cardId, this.fromIndex, this.toIndex);
  }

  async undo(): Promise<void> {
    const cardStore = getCardStore();
    // 撤销时反向移动
    cardStore.reorderBaseCards(this.cardId, this.toIndex, this.fromIndex);
  }

  async redo(): Promise<void> {
    await this.execute();
  }

  get description(): string {
    return 'command.move_base_card';
  }

  /**
   * 检查是否可以与另一个移动命令合并
   */
  canMergeWith(other: Command): boolean {
    if (other instanceof MoveBaseCardCommand) {
      return other.cardId === this.cardId;
    }
    return false;
  }

  /**
   * 与另一个移动命令合并
   */
  mergeWith(other: Command): void {
    if (other instanceof MoveBaseCardCommand) {
      // 合并时保留最早的 fromIndex
      this.fromIndex = other.fromIndex;
    }
  }
}

/**
 * 更新基础卡片配置命令
 * 
 * @example
 * ```typescript
 * const command = new UpdateBaseCardConfigCommand(
 *   cardId,
 *   baseCardId,
 *   { width: 200, height: 150 }
 * );
 * await commandManager.execute(command);
 * ```
 */
export class UpdateBaseCardConfigCommand implements Command {
  private cardId: string;
  private baseCardId: string;
  private newConfig: Record<string, unknown>;
  private oldConfig: Record<string, unknown> | null = null;

  /**
   * 创建更新基础卡片配置命令
   * @param cardId - 卡片 ID
   * @param baseCardId - 基础卡片 ID
   * @param newConfig - 新配置
   */
  constructor(
    cardId: string,
    baseCardId: string,
    newConfig: Record<string, unknown>
  ) {
    this.cardId = cardId;
    this.baseCardId = baseCardId;
    this.newConfig = deepClone(newConfig);
  }

  async execute(): Promise<void> {
    const cardStore = getCardStore();
    const card = cardStore.getCard(this.cardId);
    
    if (card) {
      const baseCard = card.structure.find((bc) => bc.id === this.baseCardId);
      if (baseCard) {
        // 保存旧配置
        this.oldConfig = deepClone(baseCard.config ?? {});
        // 更新配置
        baseCard.config = { ...baseCard.config, ...this.newConfig };
        cardStore.markCardModified(this.cardId);
      }
    }
  }

  async undo(): Promise<void> {
    if (this.oldConfig !== null) {
      const cardStore = getCardStore();
      const card = cardStore.getCard(this.cardId);
      
      if (card) {
        const baseCard = card.structure.find((bc) => bc.id === this.baseCardId);
        if (baseCard) {
          baseCard.config = this.oldConfig;
          cardStore.markCardModified(this.cardId);
        }
      }
    }
  }

  async redo(): Promise<void> {
    const cardStore = getCardStore();
    const card = cardStore.getCard(this.cardId);
    
    if (card) {
      const baseCard = card.structure.find((bc) => bc.id === this.baseCardId);
      if (baseCard) {
        baseCard.config = { ...this.oldConfig, ...this.newConfig };
        cardStore.markCardModified(this.cardId);
      }
    }
  }

  get description(): string {
    return 'command.update_base_card_config';
  }

  /**
   * 检查是否可以与另一个配置更新命令合并
   */
  canMergeWith(other: Command): boolean {
    if (other instanceof UpdateBaseCardConfigCommand) {
      return (
        other.cardId === this.cardId &&
        other.baseCardId === this.baseCardId
      );
    }
    return false;
  }

  /**
   * 与另一个配置更新命令合并
   */
  mergeWith(other: Command): void {
    if (other instanceof UpdateBaseCardConfigCommand) {
      // 保留最早的旧配置
      this.oldConfig = other.oldConfig;
    }
  }
}

/**
 * 批量卡片操作命令
 * 用于将多个卡片命令作为一个原子操作执行
 * 
 * @example
 * ```typescript
 * const command = new BatchCardCommand([
 *   new AddBaseCardCommand(cardId, card1),
 *   new AddBaseCardCommand(cardId, card2),
 * ], 'command.batch_add_cards');
 * await commandManager.execute(command);
 * ```
 */
export class BatchCardCommand implements Command {
  private commands: Command[];
  private batchDescription: string;

  /**
   * 创建批量卡片操作命令
   * @param commands - 命令列表
   * @param description - 批量操作描述
   */
  constructor(commands: Command[], description = 'command.batch_operation') {
    this.commands = commands;
    this.batchDescription = description;
  }

  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i];
      if (command) {
        await command.undo();
      }
    }
  }

  async redo(): Promise<void> {
    for (const command of this.commands) {
      await command.redo();
    }
  }

  get description(): string {
    return this.batchDescription;
  }
}
