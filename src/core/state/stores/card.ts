/**
 * 卡片状态管理 Store
 * @module core/state/stores/card
 * @description 管理打开的卡片列表和卡片状态（框架无关实现）
 */

import { createStore } from '../store-core';
import { useStore } from '../use-store';
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

// ─── Store 实例 ───────────────────────────────────────────

const cardStore = createStore<CardStoreState>({
  openCards: new Map(),
  activeCardId: null,
  selectedBaseCardId: null,
  loadingCards: new Set(),
});

// ─── Getters ──────────────────────────────────────────────

function _openCardList(s: CardStoreState): CardInfo[] {
  return Array.from(s.openCards.values());
}

function _activeCard(s: CardStoreState): CardInfo | null {
  if (!s.activeCardId) return null;
  return s.openCards.get(s.activeCardId) ?? null;
}

function _hasOpenCards(s: CardStoreState): boolean {
  return s.openCards.size > 0;
}

function _openCardCount(s: CardStoreState): number {
  return s.openCards.size;
}

function _hasModifiedCards(s: CardStoreState): boolean {
  for (const card of s.openCards.values()) {
    if (card.isModified) return true;
  }
  return false;
}

function _modifiedCards(s: CardStoreState): CardInfo[] {
  return Array.from(s.openCards.values()).filter((card) => card.isModified);
}

function _openCardIds(s: CardStoreState): string[] {
  return Array.from(s.openCards.keys());
}

function _isLoadingAny(s: CardStoreState): boolean {
  return s.loadingCards.size > 0;
}

// ─── Actions ──────────────────────────────────────────────

function addCard(card: SDKCard, filePath?: string): void {
  const s = cardStore.getState();
  const cardInfo: CardInfo = {
    id: card.id,
    metadata: card.metadata,
    structure: card.structure.structure,
    isLoading: false,
    isModified: false,
    lastModified: Date.now(),
    filePath,
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(card.id, cardInfo);
  cardStore.setState({ openCards: newOpenCards });
}

function removeCard(cardId: string): void {
  const s = cardStore.getState();
  const newOpenCards = new Map(s.openCards);
  newOpenCards.delete(cardId);

  const newLoadingCards = new Set(s.loadingCards);
  newLoadingCards.delete(cardId);

  let newActiveCardId = s.activeCardId;
  if (s.activeCardId === cardId) {
    const cards = Array.from(newOpenCards.keys());
    newActiveCardId = cards.length > 0 ? (cards[0] ?? null) : null;
  }

  let newSelectedBaseCardId = s.selectedBaseCardId;
  if (newSelectedBaseCardId) {
    if (newActiveCardId) {
      const activeCard = newOpenCards.get(newActiveCardId);
      if (activeCard) {
        const hasBaseCard = activeCard.structure.some((bc) => bc.id === newSelectedBaseCardId);
        if (!hasBaseCard) newSelectedBaseCardId = null;
      } else {
        newSelectedBaseCardId = null;
      }
    } else {
      newSelectedBaseCardId = null;
    }
  }

  cardStore.setState({
    openCards: newOpenCards,
    loadingCards: newLoadingCards,
    activeCardId: newActiveCardId,
    selectedBaseCardId: newSelectedBaseCardId,
  });
}

function setActiveCard(cardId: string | null): void {
  cardStore.setState({ activeCardId: cardId, selectedBaseCardId: null });
}

function setSelectedBaseCard(baseCardId: string | null): void {
  cardStore.setState({ selectedBaseCardId: baseCardId });
}

function getCard(cardId: string): CardInfo | undefined {
  return cardStore.getState().openCards.get(cardId);
}

function isCardOpen(cardId: string): boolean {
  return cardStore.getState().openCards.has(cardId);
}

function updateCardMetadata(cardId: string, metadata: Partial<CardMetadata>): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const updatedCard: CardInfo = {
    ...card,
    metadata: { ...card.metadata, ...metadata },
    isModified: true,
    lastModified: Date.now(),
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function updateCardStructure(cardId: string, structure: BaseCardInfo[]): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const updatedCard: CardInfo = {
    ...card,
    structure: [...structure],
    isModified: true,
    lastModified: Date.now(),
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function addBaseCard(cardId: string, baseCard: BaseCardInfo, position?: number): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const newStructure = [...card.structure];
  if (position !== undefined && position >= 0 && position <= newStructure.length) {
    newStructure.splice(position, 0, baseCard);
  } else {
    newStructure.push(baseCard);
  }

  const updatedCard: CardInfo = {
    ...card,
    structure: newStructure,
    isModified: true,
    lastModified: Date.now(),
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function removeBaseCard(cardId: string, baseCardId: string): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const index = card.structure.findIndex((bc) => bc.id === baseCardId);
  if (index === -1) return;

  const newStructure = [...card.structure];
  newStructure.splice(index, 1);

  const updatedCard: CardInfo = {
    ...card,
    structure: newStructure,
    isModified: true,
    lastModified: Date.now(),
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);

  const newSelectedBaseCardId = s.selectedBaseCardId === baseCardId ? null : s.selectedBaseCardId;
  cardStore.setState({ openCards: newOpenCards, selectedBaseCardId: newSelectedBaseCardId });
}

function reorderBaseCards(cardId: string, fromIndex: number, toIndex: number): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card || fromIndex === toIndex) return;

  const newStructure = [...card.structure];
  const [removed] = newStructure.splice(fromIndex, 1);
  if (!removed) return;
  newStructure.splice(toIndex, 0, removed);

  const updatedCard: CardInfo = {
    ...card,
    structure: newStructure,
    isModified: true,
    lastModified: Date.now(),
  };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function markCardSaved(cardId: string): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const updatedCard: CardInfo = { ...card, isModified: false };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function markCardModified(cardId: string): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const updatedCard: CardInfo = { ...card, isModified: true, lastModified: Date.now() };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function setCardLoading(cardId: string, loading: boolean): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);

  const newLoadingCards = new Set(s.loadingCards);
  if (loading) {
    newLoadingCards.add(cardId);
  } else {
    newLoadingCards.delete(cardId);
  }

  if (card) {
    const updatedCard: CardInfo = { ...card, isLoading: loading };
    const newOpenCards = new Map(s.openCards);
    newOpenCards.set(cardId, updatedCard);
    cardStore.setState({ openCards: newOpenCards, loadingCards: newLoadingCards });
  } else {
    cardStore.setState({ loadingCards: newLoadingCards });
  }
}

function updateFilePath(cardId: string, filePath: string): void {
  const s = cardStore.getState();
  const card = s.openCards.get(cardId);
  if (!card) return;

  const updatedCard: CardInfo = { ...card, filePath };
  const newOpenCards = new Map(s.openCards);
  newOpenCards.set(cardId, updatedCard);
  cardStore.setState({ openCards: newOpenCards });
}

function clearAll(): void {
  cardStore.setState({
    openCards: new Map(),
    activeCardId: null,
    selectedBaseCardId: null,
    loadingCards: new Set(),
  });
}

// ─── 导出 ─────────────────────────────────────────────────

/**
 * 获取 Card Store 实例（非组件调用）
 */
export function getCardStore() {
  return {
    getState: cardStore.getState,
    addCard,
    removeCard,
    setActiveCard,
    setSelectedBaseCard,
    getCard,
    isCardOpen,
    updateCardMetadata,
    updateCardStructure,
    addBaseCard,
    removeBaseCard,
    reorderBaseCards,
    markCardSaved,
    markCardModified,
    setCardLoading,
    updateFilePath,
    clearAll,
    // Getters
    openCardList: _openCardList,
    activeCard: _activeCard,
    hasOpenCards: _hasOpenCards,
    openCardCount: _openCardCount,
    hasModifiedCards: _hasModifiedCards,
    modifiedCards: _modifiedCards,
    openCardIds: _openCardIds,
    isLoadingAny: _isLoadingAny,
  };
}

/**
 * React Hook：使用 Card Store（组件调用）
 * 
 * 支持两种调用方式：
 * - useCardStore() - 返回整个 state
 * - useCardStore(selector) - 返回选择器选中的状态片段
 */
export function useCardStore(): Readonly<CardStoreState>;
export function useCardStore<U>(selector: (state: Readonly<CardStoreState>) => U): U;
export function useCardStore<U>(selector?: (state: Readonly<CardStoreState>) => U): U | Readonly<CardStoreState> {
  if (!selector) {
    return useStore(cardStore, (state) => state);
  }
  return useStore(cardStore, selector);
}

export type CardStore = ReturnType<typeof getCardStore>;

/** 暴露内部 store 用于测试 */
export const __cardStoreInternal = cardStore;
