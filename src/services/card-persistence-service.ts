import yaml from 'yaml';
import type { CardInfo } from '@/core/state/stores/card';
import { stringifyBaseCardContentYaml } from '@/core/base-card-content-loader';
import { resolveCardPath } from './card-path-service';
import { resourceService } from './resource-service';

function resolveCardDirectory(card: CardInfo, cardPath?: string): string {
  const resolvedPath = resolveCardPath(
    card.id,
    cardPath ?? card.filePath,
    resourceService.workspaceRoot,
  );

  if (resolvedPath) {
    return resolvedPath;
  }

  const normalizedWorkspaceRoot = resourceService.workspaceRoot.trim().replace(/\\/g, '/');
  if (normalizedWorkspaceRoot) {
    return `${normalizedWorkspaceRoot.replace(/\/+$/, '')}/${card.id}`;
  }

  throw new Error('[CardPersistence] Missing workspace card path');
}

function createMetadataPayload(card: CardInfo, modifiedAt: string): Record<string, unknown> {
  return {
    ...card.metadata,
    card_id: card.id,
    modified_at: modifiedAt,
  };
}

function createStructurePayload(card: CardInfo): Record<string, unknown> {
  return {
    structure: card.structure.map((baseCard) => ({
      id: baseCard.id,
      type: baseCard.type,
    })),
    manifest: {
      card_count: card.structure.length,
      resource_count: 0,
      resources: [],
    },
  };
}

export async function saveCardToWorkspace(card: CardInfo, cardPath?: string): Promise<string> {
  const path = resolveCardDirectory(card, cardPath);
  const modifiedAt = new Date().toISOString();
  const metadataPath = `${path}/.card/metadata.yaml`;
  const structurePath = `${path}/.card/structure.yaml`;
  const contentDir = `${path}/content`;

  await resourceService.ensureDir(`${path}/.card`);
  await resourceService.ensureDir(contentDir);

  await resourceService.writeText(metadataPath, yaml.stringify(createMetadataPayload(card, modifiedAt)));
  await resourceService.writeText(structurePath, yaml.stringify(createStructurePayload(card)));

  for (const baseCard of card.structure) {
    const contentFilePath = `${contentDir}/${baseCard.id}.yaml`;
    const contentYaml = stringifyBaseCardContentYaml(baseCard.type, baseCard.config);
    await resourceService.writeText(contentFilePath, contentYaml);
  }

  return path;
}
