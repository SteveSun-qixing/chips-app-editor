/**
 * 卡片服务
 * @module core/card-service
 * @description 管理复合卡片的创建、读取、保存和渲染
 * 
 * 设计说明：
 * - 复合卡片是包含多个基础卡片的容器
 * - 每个复合卡片对应一个 .card 文件
 * - 基础卡片通过插件系统渲染
 */

import { ref, computed, reactive, type Ref, type ComputedRef } from 'vue';
import type { EventEmitter } from './event-manager';
import { createEventEmitter } from './event-manager';
import { generateId62 } from '@/utils';

/** 基础卡片数据 */
export interface BasicCardData {
  /** 卡片 ID */
  id: string;
  /** 卡片类型（对应基础卡片插件 ID） */
  type: string;
  /** 卡片配置数据 */
  data: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
}

/** 复合卡片元数据 */
export interface CardMetadata {
  /** 卡片名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 使用的主题 ID */
  themeId?: string;
  /** 封面路径 */
  coverPath?: string;
  /** 封面比例 */
  coverRatio?: string;
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 标签 */
  tags?: string[];
}

/** 复合卡片结构 */
export interface CardStructure {
  /** 基础卡片列表 */
  basicCards: BasicCardData[];
  /** 布局配置 */
  layout?: {
    /** 内边距 */
    padding?: number;
    /** 卡片间距 */
    gap?: number;
  };
}

/** 复合卡片完整数据 */
export interface CompositeCard {
  /** 卡片 ID（工作区文件 ID） */
  id: string;
  /** 文件路径 */
  path: string;
  /** 元数据 */
  metadata: CardMetadata;
  /** 结构 */
  structure: CardStructure;
  /** 是否已修改 */
  isDirty: boolean;
  /** 是否处于编辑模式 */
  isEditing: boolean;
}

/** 卡片服务接口 */
export interface CardService {
  /** 已打开的卡片 */
  openedCards: ComputedRef<CompositeCard[]>;
  /** 当前选中的卡片 ID */
  selectedCardId: Ref<string | null>;
  /** 当前选中的基础卡片 ID */
  selectedBasicCardId: Ref<string | null>;
  /** 创建新卡片 */
  createCard: (name: string, initialBasicCard?: { type: string; data?: Record<string, unknown> }) => Promise<CompositeCard>;
  /** 打开卡片 */
  openCard: (id: string, path: string) => Promise<CompositeCard>;
  /** 关闭卡片 */
  closeCard: (id: string) => void;
  /** 保存卡片 */
  saveCard: (id: string) => Promise<void>;
  /** 添加基础卡片 */
  addBasicCard: (cardId: string, type: string, data?: Record<string, unknown>, position?: number) => BasicCardData;
  /** 删除基础卡片 */
  removeBasicCard: (cardId: string, basicCardId: string) => void;
  /** 移动基础卡片 */
  moveBasicCard: (cardId: string, basicCardId: string, newPosition: number) => void;
  /** 更新基础卡片数据 */
  updateBasicCard: (cardId: string, basicCardId: string, data: Record<string, unknown>) => void;
  /** 选中卡片 */
  selectCard: (id: string | null) => void;
  /** 选中基础卡片 */
  selectBasicCard: (basicCardId: string | null) => void;
  /** 获取卡片 */
  getCard: (id: string) => CompositeCard | undefined;
  /** 更新卡片元数据 */
  updateCardMetadata: (id: string, metadata: Partial<CardMetadata>) => void;
  /** 切换编辑模式 */
  toggleEditMode: (id: string) => void;
}

/**
 * 获取当前时间的 ISO 字符串
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * 创建卡片服务
 * @param events - 事件发射器
 */
export function createCardService(events?: EventEmitter): CardService {
  const eventEmitter = events || createEventEmitter();

  /** 已打开的卡片（使用 Map 存储以保持响应性） */
  const cardsMap = reactive<Map<string, CompositeCard>>(new Map());

  /** 当前选中的卡片 ID */
  const selectedCardId = ref<string | null>(null);

  /** 当前选中的基础卡片 ID */
  const selectedBasicCardId = ref<string | null>(null);

  /** 已打开的卡片列表 */
  const openedCards = computed(() => Array.from(cardsMap.values()));

  /**
   * 创建新卡片
   * @param name - 卡片名称
   * @param initialBasicCard - 初始基础卡片配置
   */
  async function createCard(
    name: string,
    initialBasicCard?: { type: string; data?: Record<string, unknown> }
  ): Promise<CompositeCard> {
    const id = generateId62();
    const timestamp = now();

    const basicCards: BasicCardData[] = [];

    // 如果有初始基础卡片，添加它
    if (initialBasicCard) {
      basicCards.push({
        id: generateId62(),
        type: initialBasicCard.type,
        data: initialBasicCard.data || {},
        createdAt: timestamp,
        modifiedAt: timestamp,
      });
    }

    const newCard: CompositeCard = {
      id,
      path: `/${name}.card`,
      metadata: {
        name,
        createdAt: timestamp,
        modifiedAt: timestamp,
      },
      structure: {
        basicCards,
        layout: {
          padding: 16,
          gap: 12,
        },
      },
      isDirty: true,
      isEditing: true,
    };

    // 添加到已打开卡片
    cardsMap.set(id, newCard);

    // 自动选中新卡片
    selectedCardId.value = id;

    // 如果有基础卡片，选中它
    if (basicCards.length > 0) {
      const firstCard = basicCards[0];
      if (firstCard) {
        selectedBasicCardId.value = firstCard.id;
      }
    }

    eventEmitter.emit('card:created', { card: newCard });
    console.warn('[CardService] 创建卡片:', name, '初始基础卡片:', initialBasicCard?.type);

    return newCard;
  }

  /**
   * 打开卡片
   * @param id - 卡片 ID
   * @param path - 文件路径
   */
  async function openCard(id: string, path: string): Promise<CompositeCard> {
    // 检查是否已打开
    const existing = cardsMap.get(id);
    if (existing) {
      selectedCardId.value = id;
      return existing;
    }

    // TODO: 从文件系统读取卡片数据
    // const cardData = await sdk.card.read(path);

    // 模拟读取
    const card: CompositeCard = {
      id,
      path,
      metadata: {
        name: path.replace(/^\/|\.card$/g, ''),
        createdAt: now(),
        modifiedAt: now(),
      },
      structure: {
        basicCards: [],
        layout: { padding: 16, gap: 12 },
      },
      isDirty: false,
      isEditing: false,
    };

    cardsMap.set(id, card);
    selectedCardId.value = id;

    eventEmitter.emit('card:opened', { card });
    console.warn('[CardService] 打开卡片:', path);

    return card;
  }

  /**
   * 关闭卡片
   * @param id - 卡片 ID
   */
  function closeCard(id: string): void {
    const card = cardsMap.get(id);
    if (card) {
      // TODO: 如果有未保存的修改，提示用户
      cardsMap.delete(id);

      // 如果关闭的是当前选中的卡片，清空选中状态
      if (selectedCardId.value === id) {
        selectedCardId.value = null;
        selectedBasicCardId.value = null;
      }

      eventEmitter.emit('card:closed', { card });
      console.warn('[CardService] 关闭卡片:', card.metadata.name);
    }
  }

  /**
   * 保存卡片
   * @param id - 卡片 ID
   */
  async function saveCard(id: string): Promise<void> {
    const card = cardsMap.get(id);
    if (!card) return;

    // TODO: 将卡片数据保存到文件系统
    // await sdk.card.save(card.path, {
    //   metadata: card.metadata,
    //   structure: card.structure,
    // });

    card.isDirty = false;
    card.metadata.modifiedAt = now();

    eventEmitter.emit('card:saved', { card });
    console.warn('[CardService] 保存卡片:', card.metadata.name);
  }

  /**
   * 添加基础卡片
   * @param cardId - 复合卡片 ID
   * @param type - 基础卡片类型
   * @param data - 初始数据
   * @param position - 插入位置
   */
  function addBasicCard(
    cardId: string,
    type: string,
    data?: Record<string, unknown>,
    position?: number
  ): BasicCardData {
    const card = cardsMap.get(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const timestamp = now();
    const basicCard: BasicCardData = {
      id: generateId62(),
      type,
      data: data || {},
      createdAt: timestamp,
      modifiedAt: timestamp,
    };

    // 插入到指定位置或末尾
    if (position !== undefined && position >= 0 && position <= card.structure.basicCards.length) {
      card.structure.basicCards.splice(position, 0, basicCard);
    } else {
      card.structure.basicCards.push(basicCard);
    }

    card.isDirty = true;
    card.metadata.modifiedAt = timestamp;

    // 自动选中新添加的基础卡片
    selectedBasicCardId.value = basicCard.id;

    eventEmitter.emit('card:basic-card-added', { cardId, basicCard, position });
    console.warn('[CardService] 添加基础卡片:', type, '到卡片:', card.metadata.name);

    return basicCard;
  }

  /**
   * 删除基础卡片
   * @param cardId - 复合卡片 ID
   * @param basicCardId - 基础卡片 ID
   */
  function removeBasicCard(cardId: string, basicCardId: string): void {
    const card = cardsMap.get(cardId);
    if (!card) return;

    const index = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
    if (index !== -1) {
      card.structure.basicCards.splice(index, 1);
      card.isDirty = true;
      card.metadata.modifiedAt = now();

      // 如果删除的是当前选中的基础卡片，清空选中状态
      if (selectedBasicCardId.value === basicCardId) {
        selectedBasicCardId.value = null;
      }

      eventEmitter.emit('card:basic-card-removed', { cardId, basicCardId });
      console.warn('[CardService] 删除基础卡片:', basicCardId);
    }
  }

  /**
   * 移动基础卡片
   * @param cardId - 复合卡片 ID
   * @param basicCardId - 基础卡片 ID
   * @param newPosition - 新位置
   */
  function moveBasicCard(cardId: string, basicCardId: string, newPosition: number): void {
    const card = cardsMap.get(cardId);
    if (!card) return;

    const currentIndex = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
    if (currentIndex === -1) return;

    const [basicCard] = card.structure.basicCards.splice(currentIndex, 1);
    if (basicCard) {
      card.structure.basicCards.splice(newPosition, 0, basicCard);
      card.isDirty = true;
      card.metadata.modifiedAt = now();

      eventEmitter.emit('card:basic-card-moved', { cardId, basicCardId, newPosition });
      console.warn('[CardService] 移动基础卡片:', basicCardId, '到位置:', newPosition);
    }
  }

  /**
   * 更新基础卡片数据
   * @param cardId - 复合卡片 ID
   * @param basicCardId - 基础卡片 ID
   * @param data - 新数据
   */
  function updateBasicCard(cardId: string, basicCardId: string, data: Record<string, unknown>): void {
    const card = cardsMap.get(cardId);
    if (!card) return;

    const basicCard = card.structure.basicCards.find(bc => bc.id === basicCardId);
    if (basicCard) {
      basicCard.data = { ...basicCard.data, ...data };
      basicCard.modifiedAt = now();
      card.isDirty = true;
      card.metadata.modifiedAt = now();

      eventEmitter.emit('card:basic-card-updated', { cardId, basicCardId, data });
    }
  }

  /**
   * 选中卡片
   * @param id - 卡片 ID
   */
  function selectCard(id: string | null): void {
    selectedCardId.value = id;
    if (id === null) {
      selectedBasicCardId.value = null;
    }
    eventEmitter.emit('card:selected', { cardId: id });
  }

  /**
   * 选中基础卡片
   * @param basicCardId - 基础卡片 ID
   */
  function selectBasicCard(basicCardId: string | null): void {
    selectedBasicCardId.value = basicCardId;
    eventEmitter.emit('card:basic-card-selected', { basicCardId });
  }

  /**
   * 获取卡片
   * @param id - 卡片 ID
   */
  function getCard(id: string): CompositeCard | undefined {
    return cardsMap.get(id);
  }

  /**
   * 更新卡片元数据
   * @param id - 卡片 ID
   * @param metadata - 新元数据
   */
  function updateCardMetadata(id: string, metadata: Partial<CardMetadata>): void {
    const card = cardsMap.get(id);
    if (card) {
      card.metadata = { ...card.metadata, ...metadata, modifiedAt: now() };
      card.isDirty = true;
      eventEmitter.emit('card:metadata-updated', { cardId: id, metadata });
    }
  }

  /**
   * 切换编辑模式
   * @param id - 卡片 ID
   */
  function toggleEditMode(id: string): void {
    const card = cardsMap.get(id);
    if (card) {
      card.isEditing = !card.isEditing;
      eventEmitter.emit('card:edit-mode-changed', { cardId: id, isEditing: card.isEditing });
    }
  }

  return {
    openedCards,
    selectedCardId,
    selectedBasicCardId,
    createCard,
    openCard,
    closeCard,
    saveCard,
    addBasicCard,
    removeBasicCard,
    moveBasicCard,
    updateBasicCard,
    selectCard,
    selectBasicCard,
    getCard,
    updateCardMetadata,
    toggleEditMode,
  };
}

// 单例实例
let cardServiceInstance: CardService | null = null;

/**
 * 获取卡片服务实例
 */
export function useCardService(): CardService {
  if (!cardServiceInstance) {
    cardServiceInstance = createCardService();
  }
  return cardServiceInstance;
}

/**
 * 重置卡片服务（主要用于测试）
 */
export function resetCardService(): void {
  cardServiceInstance = null;
}
