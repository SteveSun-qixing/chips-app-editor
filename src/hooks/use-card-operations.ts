/**
 * 卡片操作业务逻辑 Hook
 * @module hooks/use-card-operations
 * @description 封装卡片拖放、创建、打开等业务逻辑
 *
 * 职责：
 * - 拖放创建复合卡片 / 箱子
 * - 拖放插入基础卡片到已有卡片窗口
 * - 从工作区打开卡片
 * - 编辑面板配置变更处理
 */

import { useRef, useCallback } from 'react';
import { getEditorStore, getCardStore, getUIStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import { useWorkspaceService } from '@/core/workspace-service';
import { resourceService } from '@/services/resource-service';
import { requireCardPath } from '@/services/card-path-service';
import { persistInsertedBaseCard } from '@/services/card-persistence-service';
import { loadBaseCardConfigsFromContent } from '@/core/base-card-content-loader';
import { generateId62, generateScopedId } from '@/utils';
import { t } from '@/services/i18n-service';
import { toPx } from '@/services/page-layout-service';
import type { DragData } from '@/components/card-box-library';
import type { CardWindowConfig } from '@/types';
import yaml from 'yaml';

// ─── 类型定义 ────────────────────────────────────────────

type CardLibraryDragData = Extract<DragData, { type: 'card' }>;
type LayoutLibraryDragData = Extract<DragData, { type: 'layout' }>;
type WorkspaceFileDragData = Extract<DragData, { type: 'workspace-file' }>;

export interface CardWindowDropTarget {
    type: 'card-window';
    cardId: string;
    insertIndex?: number;
}

// ─── 常量 ────────────────────────────────────────────────

const CARD_WINDOW_WIDTH_CPX = 360;
const WINDOW_HEIGHT_CPX = 500;

// ─── Hook 返回值 ─────────────────────────────────────────

export interface UseCardOperationsReturn {
    /** 处理拖放创建 */
    handleDropCreate: (
        data: DragData,
        worldPosition: { x: number; y: number },
        target?: CardWindowDropTarget,
    ) => Promise<void>;
    /** 处理编辑面板配置变更 */
    handleEditPanelConfigChange: (
        baseCardId: string,
        config: Record<string, unknown>,
    ) => void;
}

// ─── Hook 实现 ───────────────────────────────────────────

export function useCardOperations(): UseCardOperationsReturn {
    const cardCounterRef = useRef(0);

    // ─── 辅助函数 ──────────────────────────────────────────

    function normalizeInsertIndex(index: number | undefined, length: number): number {
        if (index === undefined || !Number.isFinite(index)) return length;
        return Math.max(0, Math.min(length, index));
    }

    function getCardWindow(cardId: string): CardWindowConfig | undefined {
        const uiStore = getUIStore();
        const s = uiStore.getState();
        return uiStore.cardWindows(s).find((w) => w.cardId === cardId);
    }

    function focusCardWindow(cardId: string): void {
        const wm = useWindowManager();
        const targetWindow = getCardWindow(cardId);
        if (targetWindow) wm.focusWindow(targetWindow.id);
    }

    // ─── 核心业务操作 ──────────────────────────────────────

    async function insertLibraryBaseCard(
        data: CardLibraryDragData,
        target: CardWindowDropTarget,
    ): Promise<boolean> {
        const cardStore = getCardStore();
        const editorStore = getEditorStore();
        const targetCard = cardStore.getState().openCards.get(target.cardId);
        if (!targetCard) return false;

        const baseCardId = generateId62();
        const insertIndex = normalizeInsertIndex(target.insertIndex, targetCard.structure.length);
        const baseCard = {
            id: baseCardId,
            type: data.typeId,
            config: { content_source: 'inline', content_text: '' },
        };

        try {
            const cardPath = requireCardPath(
                targetCard.id,
                targetCard.filePath,
                'App.insertLibraryBaseCard',
                resourceService.workspaceRoot,
            );

            const { persistedPath } = await persistInsertedBaseCard(
                targetCard,
                baseCard,
                insertIndex,
                cardPath,
            );

            cardStore.addBaseCard(target.cardId, baseCard, insertIndex);
            cardStore.updateFilePath(targetCard.id, persistedPath);
            cardStore.markCardSaved(targetCard.id);
            if (!cardStore.hasModifiedCards(cardStore.getState())) {
                editorStore.markSaved();
            }
        } catch (error) {
            console.error('[CardOps] Failed to insert and persist base card', {
                cardId: target.cardId,
                baseCardType: data.typeId,
                insertIndex,
                error,
            });
            return false;
        }

        cardStore.setActiveCard(target.cardId);
        cardStore.setSelectedBaseCard(baseCardId);
        focusCardWindow(target.cardId);
        return true;
    }

    function insertNestedCardFile(
        data: WorkspaceFileDragData,
        target: CardWindowDropTarget,
    ): boolean {
        if (data.fileType !== 'card') return false;
        const cardStore = getCardStore();
        const targetCard = cardStore.getState().openCards.get(target.cardId);
        if (!targetCard) return false;

        const baseCardId = generateId62();
        const insertIndex = normalizeInsertIndex(target.insertIndex, targetCard.structure.length);
        cardStore.addBaseCard(
            target.cardId,
            {
                id: baseCardId,
                type: 'NestedCard',
                config: {
                    card_id: data.fileId,
                    card_path: data.filePath,
                    card_name: data.name,
                },
            },
            insertIndex,
        );
        cardStore.setActiveCard(target.cardId);
        cardStore.setSelectedBaseCard(baseCardId);
        focusCardWindow(target.cardId);
        return true;
    }

    async function ensureWorkspaceCardLoaded(data: WorkspaceFileDragData): Promise<string | null> {
        if (data.fileType !== 'card') return null;
        const cardStore = getCardStore();
        const state = cardStore.getState();

        const existingById = state.openCards.get(data.fileId);
        if (existingById) return existingById.id;

        const existingByPath = Array.from(state.openCards.values()).find(
            (card) => card.filePath === data.filePath,
        );
        if (existingByPath) return existingByPath.id;

        const metadataPath = `${data.filePath}/.card/metadata.yaml`;
        const structurePath = `${data.filePath}/.card/structure.yaml`;
        const now = new Date().toISOString();

        let metadataDoc: Record<string, unknown> = {};
        let structureDoc: Record<string, unknown> = {};

        try {
            metadataDoc =
                (yaml.parse(await resourceService.readText(metadataPath)) as Record<string, unknown>) || {};
        } catch {
            metadataDoc = {};
        }
        try {
            structureDoc =
                (yaml.parse(await resourceService.readText(structurePath)) as Record<string, unknown>) ||
                {};
        } catch {
            structureDoc = {};
        }

        const rawStructure = Array.isArray(structureDoc.structure) ? structureDoc.structure : [];
        const structure = rawStructure
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map((item) => ({
                id: typeof item.id === 'string' ? item.id : generateId62(),
                type: typeof item.type === 'string' ? item.type : 'UnknownCard',
                config: {} as Record<string, unknown>,
            }));

        await loadBaseCardConfigsFromContent(structure, data.filePath, (contentPath) =>
            resourceService.readText(contentPath),
        );

        const metadataName =
            typeof metadataDoc.name === 'string' ? metadataDoc.name : data.name.replace(/\.card$/i, '');
        const metadataCardId =
            typeof metadataDoc.card_id === 'string' ? metadataDoc.card_id : data.fileId;
        const metadataCreatedAt =
            typeof metadataDoc.created_at === 'string' ? metadataDoc.created_at : now;
        const metadataModifiedAt =
            typeof metadataDoc.modified_at === 'string' ? metadataDoc.modified_at : now;

        cardStore.addCard({
            id: metadataCardId,
            metadata: {
                chip_standards_version: '1.0.0',
                card_id: metadataCardId,
                name: metadataName,
                created_at: metadataCreatedAt,
                modified_at: metadataModifiedAt,
            },
            structure: {
                structure,
                manifest: { card_count: structure.length, resource_count: 0, resources: [] },
            },
            resources: new Map<string, Blob | ArrayBuffer>(),
        });

        cardStore.updateFilePath(metadataCardId, data.filePath);
        return metadataCardId;
    }

    async function openWorkspaceCardWindow(
        data: WorkspaceFileDragData,
        position: { x: number; y: number },
    ): Promise<void> {
        if (data.fileType !== 'card') return;
        const cardStore = getCardStore();
        const uiStore = getUIStore();
        const wm = useWindowManager();

        const loadedCardId = await ensureWorkspaceCardLoaded(data);
        if (!loadedCardId) return;

        const targetCard = cardStore.getState().openCards.get(loadedCardId);
        const cardName = targetCard?.metadata.name || data.name.replace(/\.card$/i, '');

        const existingWindow = getCardWindow(loadedCardId);
        if (existingWindow) {
            wm.updateWindow(existingWindow.id, { position, state: 'normal' });
            wm.focusWindow(existingWindow.id);
            cardStore.setActiveCard(loadedCardId);
            return;
        }

        const windowConfig: CardWindowConfig = {
            id: generateScopedId('window'),
            type: 'card',
            cardId: loadedCardId,
            title: cardName,
            position: { x: position.x, y: position.y },
            size: { width: toPx(CARD_WINDOW_WIDTH_CPX), height: toPx(WINDOW_HEIGHT_CPX) },
            state: 'normal',
            zIndex: 100,
            resizable: true,
            draggable: true,
            closable: true,
            minimizable: true,
            isEditing: true,
        };

        uiStore.addWindow(windowConfig);
        uiStore.focusWindow(windowConfig.id);
        cardStore.setActiveCard(loadedCardId);
    }

    async function createCompositeCard(
        data: CardLibraryDragData,
        position: { x: number; y: number },
    ): Promise<void> {
        const cardStore = getCardStore();
        const uiStore = getUIStore();
        const ws = useWorkspaceService();

        cardCounterRef.current++;
        const cardName = t('app.card_default_name', { index: cardCounterRef.current });
        const cardId = generateId62();
        const windowId = generateScopedId('window');
        const timestamp = new Date().toISOString();
        const baseCardId = generateId62();

        const baseCard = {
            id: baseCardId,
            type: data.typeId,
            config: { content_source: 'inline', content_text: '' },
        };

        cardStore.addCard({
            id: cardId,
            metadata: {
                chip_standards_version: '1.0.0',
                card_id: cardId,
                name: cardName,
                created_at: timestamp,
                modified_at: timestamp,
            },
            structure: {
                structure: [baseCard],
                manifest: { card_count: 1, resource_count: 0, resources: [] },
            },
            resources: new Map<string, Blob | ArrayBuffer>(),
        });

        cardStore.setActiveCard(cardId);

        const windowConfig: CardWindowConfig = {
            id: windowId,
            type: 'card',
            cardId,
            title: cardName,
            position: { x: position.x, y: position.y },
            size: { width: toPx(CARD_WINDOW_WIDTH_CPX), height: toPx(WINDOW_HEIGHT_CPX) },
            state: 'normal',
            zIndex: 100,
            resizable: true,
            draggable: true,
            closable: true,
            minimizable: true,
            isEditing: true,
        };

        uiStore.addWindow(windowConfig);
        uiStore.focusWindow(windowId);

        const workspaceFile = await ws.createCard(cardName, { type: data.typeId, id: baseCardId }, cardId);
        cardStore.updateFilePath(cardId, workspaceFile.path);

        console.warn('[CardOps] 已创建复合卡片:', cardName, 'ID:', cardId, '包含基础卡片:', data.name);
    }

    async function createBox(
        data: LayoutLibraryDragData,
        position: { x: number; y: number },
    ): Promise<void> {
        const ws = useWorkspaceService();
        console.warn('[CardOps] 创建箱子:', data.name, '布局类型:', data.typeId, '位置:', position);
        cardCounterRef.current++;
        const boxName = t('app.box_default_name', { index: cardCounterRef.current });
        const boxFile = await ws.createBox(boxName, data.typeId);
        ws.openFile(boxFile.id);
    }

    // ─── 公开的操作方法 ────────────────────────────────────

    const handleDropCreate = useCallback(
        async (
            data: DragData,
            worldPosition: { x: number; y: number },
            target?: CardWindowDropTarget,
        ): Promise<void> => {
            console.warn('[CardOps] 拖放创建:', data, '位置:', worldPosition, '目标:', target);

            if (data.type === 'card') {
                if (target) {
                    await insertLibraryBaseCard(data, target);
                    return;
                }
                await createCompositeCard(data, worldPosition);
                return;
            }

            if (data.type === 'layout') {
                await createBox(data, worldPosition);
                return;
            }

            // workspace-file
            if (target && insertNestedCardFile(data, target)) return;
            await openWorkspaceCardWindow(data, worldPosition);
        },
        [],
    );

    const handleEditPanelConfigChange = useCallback(
        (baseCardId: string, config: Record<string, unknown>): void => {
            const cardStore = getCardStore();
            const s = cardStore.getState();
            const activeCard = cardStore.activeCard(s);
            if (!activeCard) return;

            const updatedStructure = activeCard.structure.map((bc) => {
                if (bc.id !== baseCardId) return bc;
                return { ...bc, config: { ...bc.config, ...config } };
            });

            cardStore.updateCardStructure(activeCard.id, updatedStructure);
        },
        [],
    );

    return { handleDropCreate, handleEditPanelConfigChange };
}
