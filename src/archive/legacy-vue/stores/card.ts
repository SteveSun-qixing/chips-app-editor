/**
 * 卡片状态管理 Store
 * @module core/state/stores/card
 * @description 管理打开的卡片列表和卡片状态
 */

import { defineStore } from 'pinia';
import type {
  BaseCardInfo as SDKBaseCardInfo,
  Card as SDKCard,
  CardMetadata as SDKCardMetadata,
} from '@chips/sdk';

/**
 * 基础卡片信息
 */
export interface BaseCardInfo {
  /** 基础卡片 ID */
  id: SDKBaseCardInfo['id'];
  /** 基础卡片类型 */
  type: SDKBaseCardInfo['type'];
  /** 配置数据 */
  config?: Record<string, unknown>;
}

/**
 * 卡片元数据
 */
export type CardMetadata = SDKCardMetadata;

/**
 * 卡片信息
 */
export interface CardInfo {
  /** 卡片 ID */
  id: string;
  /** 卡片元数据 */
  metadata: CardMetadata;
  /** 卡片结构（基础卡片列表） */
  structure: BaseCardInfo[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否已修改 */
  isModified: boolean;
  /** 最后修改时间（本地） */
  lastModified: number;
  /** 文件路径 */
  filePath?: string;
}

/**
 * 卡片数据（从 SDK 获取）
 */
export interface Card {
  /** 卡片 ID */
  id: SDKCard['id'];
  /** 卡片元数据 */
  metadata: CardMetadata;
  /** 卡片结构 */
  structure: {
    structure: BaseCardInfo[];
    manifest: SDKCard['structure']['manifest'];
  };
}

/**
 * 卡片 Store 状态接口
 */
export interface CardStoreState {
  /** 打开的卡片列表 */
  openCards: Map<string, CardInfo>;
  /** 当前活动的卡片 ID */
  activeCardId: string | null;
  /** 当前选中的基础卡片 ID */
  selectedBaseCardId: string | null;
  /** 正在加载的卡片 ID 集合 */
  loadingCards: Set<string>;
}

/**
 * 卡片状态 Store
 * 
 * 负责管理编辑器中打开的卡片，包括：
 * - 打开的卡片列表
 * - 当前活动卡片
 * - 选中的基础卡片
 * - 卡片修改状态跟踪
 * 
 * @example
 * ```typescript
 * const cardStore = useCardStore();
 * 
 * // 添加卡片
 * cardStore.addCard(card);
 * 
 * // 设置活动卡片
 * cardStore.setActiveCard(cardId);
 * 
 * // 检查是否有修改
 * if (cardStore.hasModifiedCards) {
 *   // 提示保存
 * }
 * ```
 */
export const useCardStore = defineStore('card', {
  state: (): CardStoreState => ({
    openCards: new Map(),
    activeCardId: null,
    selectedBaseCardId: null,
    loadingCards: new Set(),
  }),

  getters: {
    /**
     * 获取打开的卡片列表（数组形式）
     */
    openCardList(): CardInfo[] {
      return Array.from(this.openCards.values());
    },

    /**
     * 获取当前活动的卡片
     */
    activeCard(): CardInfo | null {
      if (!this.activeCardId) return null;
      return this.openCards.get(this.activeCardId) ?? null;
    },

    /**
     * 是否有打开的卡片
     */
    hasOpenCards(): boolean {
      return this.openCards.size > 0;
    },

    /**
     * 打开的卡片数量
     */
    openCardCount(): number {
      return this.openCards.size;
    },

    /**
     * 是否有修改过的卡片
     */
    hasModifiedCards(): boolean {
      for (const card of this.openCards.values()) {
        if (card.isModified) return true;
      }
      return false;
    },

    /**
     * 获取修改过的卡片列表
     */
    modifiedCards(): CardInfo[] {
      return Array.from(this.openCards.values()).filter((card) => card.isModified);
    },

    /**
     * 获取卡片 ID 列表
     */
    openCardIds(): string[] {
      return Array.from(this.openCards.keys());
    },

    /**
     * 是否正在加载任何卡片
     */
    isLoadingAny(): boolean {
      return this.loadingCards.size > 0;
    },
  },

  actions: {
    /**
     * 添加卡片
     * @param card - 卡片数据
     * @param filePath - 文件路径（可选）
     */
    addCard(card: SDKCard, filePath?: string): void {
      const cardInfo: CardInfo = {
        id: card.id,
        metadata: card.metadata,
        structure: card.structure.structure,
        isLoading: false,
        isModified: false,
        lastModified: Date.now(),
        filePath,
      };
      // 创建新的 Map 引用以确保 Vue 响应式系统能检测到变化
      const newOpenCards = new Map(this.openCards);
      newOpenCards.set(card.id, cardInfo);
      this.openCards = newOpenCards;
    },

    /**
     * 移除卡片
     * @param cardId - 卡片 ID
     */
    removeCard(cardId: string): void {
      // 创建新的 Map/Set 引用以确保响应式
      const newOpenCards = new Map(this.openCards);
      newOpenCards.delete(cardId);
      this.openCards = newOpenCards;
      
      const newLoadingCards = new Set(this.loadingCards);
      newLoadingCards.delete(cardId);
      this.loadingCards = newLoadingCards;

      if (this.activeCardId === cardId) {
        // 切换到下一个卡片或设为 null
        const cards = Array.from(this.openCards.keys());
        this.activeCardId = cards.length > 0 ? (cards[0] ?? null) : null;
      }

      if (this.selectedBaseCardId) {
        // 检查选中的基础卡片是否属于被移除的卡片
        const activeCard = this.activeCard;
        if (activeCard) {
          const hasBaseCard = activeCard.structure.some(
            (bc) => bc.id === this.selectedBaseCardId
          );
          if (!hasBaseCard) {
            this.selectedBaseCardId = null;
          }
        } else {
          this.selectedBaseCardId = null;
        }
      }
    },

    /**
     * 设置活动卡片
     * @param cardId - 卡片 ID，null 表示取消选中
     */
    setActiveCard(cardId: string | null): void {
      this.activeCardId = cardId;
      // 切换活动卡片时，清除基础卡片选中状态
      this.selectedBaseCardId = null;
    },

    /**
     * 设置选中的基础卡片
     * @param baseCardId - 基础卡片 ID，null 表示取消选中
     */
    setSelectedBaseCard(baseCardId: string | null): void {
      this.selectedBaseCardId = baseCardId;
    },

    /**
     * 获取卡片信息
     * @param cardId - 卡片 ID
     * @returns 卡片信息或 undefined
     */
    getCard(cardId: string): CardInfo | undefined {
      return this.openCards.get(cardId);
    },

    /**
     * 检查卡片是否已打开
     * @param cardId - 卡片 ID
     * @returns 是否已打开
     */
    isCardOpen(cardId: string): boolean {
      return this.openCards.has(cardId);
    },

    /**
     * 更新卡片元数据
     * @param cardId - 卡片 ID
     * @param metadata - 要更新的元数据字段
     */
    updateCardMetadata(cardId: string, metadata: Partial<CardMetadata>): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.metadata = { ...card.metadata, ...metadata };
        card.isModified = true;
        card.lastModified = Date.now();
      }
    },

    /**
     * 更新卡片结构
     * @param cardId - 卡片 ID
     * @param structure - 新的基础卡片结构
     */
    updateCardStructure(cardId: string, structure: BaseCardInfo[]): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.structure = structure;
        card.isModified = true;
        card.lastModified = Date.now();
      }
    },

    /**
     * 添加基础卡片到卡片结构
     * @param cardId - 卡片 ID
     * @param baseCard - 基础卡片信息
     * @param position - 插入位置（可选，默认末尾）
     */
    addBaseCard(cardId: string, baseCard: BaseCardInfo, position?: number): void {
      const card = this.openCards.get(cardId);
      if (card) {
        if (position !== undefined && position >= 0 && position <= card.structure.length) {
          card.structure.splice(position, 0, baseCard);
        } else {
          card.structure.push(baseCard);
        }
        card.isModified = true;
        card.lastModified = Date.now();
      }
    },

    /**
     * 从卡片结构中移除基础卡片
     * @param cardId - 卡片 ID
     * @param baseCardId - 基础卡片 ID
     */
    removeBaseCard(cardId: string, baseCardId: string): void {
      const card = this.openCards.get(cardId);
      if (card) {
        const index = card.structure.findIndex((bc) => bc.id === baseCardId);
        if (index !== -1) {
          card.structure.splice(index, 1);
          card.isModified = true;
          card.lastModified = Date.now();
        }

        if (this.selectedBaseCardId === baseCardId) {
          this.selectedBaseCardId = null;
        }
      }
    },

    /**
     * 重新排序基础卡片
     * @param cardId - 卡片 ID
     * @param fromIndex - 原位置
     * @param toIndex - 目标位置
     */
    reorderBaseCards(cardId: string, fromIndex: number, toIndex: number): void {
      const card = this.openCards.get(cardId);
      if (card && fromIndex !== toIndex) {
        const [removed] = card.structure.splice(fromIndex, 1);
        if (removed) {
          card.structure.splice(toIndex, 0, removed);
          card.isModified = true;
          card.lastModified = Date.now();
        }
      }
    },

    /**
     * 标记卡片为已保存
     * @param cardId - 卡片 ID
     */
    markCardSaved(cardId: string): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.isModified = false;
      }
    },

    /**
     * 标记卡片为已修改
     * @param cardId - 卡片 ID
     */
    markCardModified(cardId: string): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.isModified = true;
        card.lastModified = Date.now();
      }
    },

    /**
     * 设置卡片加载状态
     * @param cardId - 卡片 ID
     * @param loading - 是否正在加载
     */
    setCardLoading(cardId: string, loading: boolean): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.isLoading = loading;
      }
      // 创建新的 Set 引用以确保响应式
      const newLoadingCards = new Set(this.loadingCards);
      if (loading) {
        newLoadingCards.add(cardId);
      } else {
        newLoadingCards.delete(cardId);
      }
      this.loadingCards = newLoadingCards;
    },

    /**
     * 更新卡片文件路径
     * @param cardId - 卡片 ID
     * @param filePath - 文件路径
     */
    updateFilePath(cardId: string, filePath: string): void {
      const card = this.openCards.get(cardId);
      if (card) {
        card.filePath = filePath;
      }
    },

    /**
     * 清除所有卡片
     */
    clearAll(): void {
      this.openCards = new Map();
      this.activeCardId = null;
      this.selectedBaseCardId = null;
      this.loadingCards = new Set();
    },
  },
});

/** 导出类型 */
export type CardStore = ReturnType<typeof useCardStore>;
