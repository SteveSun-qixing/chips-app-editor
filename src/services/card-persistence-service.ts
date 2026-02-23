import type { Card as SDKCard } from '@chips/sdk';
import type { CardInfo } from '@/core/state/stores/card';
import { stringifyBaseCardContentYaml } from '@/core/base-card-content-loader';
import { requireCardPath } from './card-path-service';
import { resourceService } from './resource-service';
import { getEditorSdk } from './sdk-service';

function resolveCardPath(card: CardInfo, cardPath?: string): string {
  return requireCardPath(
    card.id,
    cardPath ?? card.filePath,
    'saveCardToWorkspace',
    resourceService.workspaceRoot,
  );
}

function createCardSavePayload(card: CardInfo, modifiedAt: string): SDKCard {
  return {
    id: card.id,
    metadata: {
      ...card.metadata,
      card_id: card.id,
      modified_at: modifiedAt,
    },
    structure: {
      structure: card.structure.map((baseCard) => ({
        id: baseCard.id,
        type: baseCard.type,
      })),
      manifest: {
        card_count: card.structure.length,
        resource_count: 0,
        resources: [],
      },
    },
    resources: new Map<string, Blob | ArrayBuffer>(),
  };
}

export async function saveCardToWorkspace(card: CardInfo, cardPath?: string): Promise<void> {
  const path = resolveCardPath(card, cardPath);
  const modifiedAt = new Date().toISOString();
  const payload = createCardSavePayload(card, modifiedAt);
  const sdk = await getEditorSdk();

  await sdk.card.save(path, payload, { overwrite: true });

  const contentDir = `${path}/content`;
  for (const baseCard of card.structure) {
    const contentFilePath = `${contentDir}/${baseCard.id}.yaml`;
    const contentYaml = stringifyBaseCardContentYaml(baseCard.type, baseCard.config);
    await resourceService.writeText(contentFilePath, contentYaml);
  }
}
