import yaml from 'yaml';

interface BaseCardTypeSource {
  type: string;
  config?: Record<string, unknown>;
}

const KNOWN_BASE_CARD_TYPES = new Set<string>([
  'RichTextCard',
  'MarkdownCard',
  'ImageCard',
  'VideoCard',
  'AudioCard',
  'CodeBlockCard',
  'ListCard',
]);

interface LocalCardManifest {
  id?: string;
  type?: string;
  name?: string;
  cardType?: string;
  capabilities?: {
    cardType?: string;
  };
}

const localManifestModules = import.meta.glob('../../../../BasicCardPlugin/**/manifest.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const localCardTypeAlias = buildLocalCardTypeAliasMap();

function parseManifest(raw: unknown): LocalCardManifest | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  try {
    return yaml.parse(raw) as LocalCardManifest;
  } catch {
    return null;
  }
}

function isManifestExcluded(path: string, manifest: LocalCardManifest): boolean {
  const normalizedPath = path.toLowerCase();
  const pluginId = (manifest.id ?? '').toLowerCase();
  const pluginName = (manifest.name ?? '').toLowerCase();

  if (normalizedPath.includes('归档')) return true;
  if (normalizedPath.includes('chips-template-card')) return true;
  if (normalizedPath.includes('basic-card-plugin-template')) return true;

  if (pluginId.includes('template') || pluginId.includes('sample-card')) return true;
  if (pluginName.includes('template') || pluginName.includes('sample card')) return true;
  if (pluginName.includes('i18n.plugin.template_card')) return true;

  return false;
}

function buildLocalCardTypeAliasMap(): Map<string, string> {
  const aliasMap = new Map<string, string>();

  for (const [path, raw] of Object.entries(localManifestModules)) {
    const manifest = parseManifest(raw);
    if (!manifest || manifest.type !== 'card' || isManifestExcluded(path, manifest)) {
      continue;
    }

    const pluginId = manifest.id;
    const cardType = manifest.capabilities?.cardType ?? manifest.cardType;
    if (typeof pluginId !== 'string' || !pluginId || typeof cardType !== 'string' || !cardType) {
      continue;
    }

    aliasMap.set(pluginId, cardType);
  }

  return aliasMap;
}

function readConfigCardType(baseCard: BaseCardTypeSource): string | null {
  const candidate = baseCard.config?.card_type;
  if (typeof candidate !== 'string') {
    return null;
  }
  return candidate.trim() || null;
}

export function resolveBaseCardRuntimeType(baseCard: BaseCardTypeSource): string {
  if (KNOWN_BASE_CARD_TYPES.has(baseCard.type)) {
    return baseCard.type;
  }

  const configType = readConfigCardType(baseCard);
  if (configType && KNOWN_BASE_CARD_TYPES.has(configType)) {
    return configType;
  }

  const aliasType = localCardTypeAlias.get(baseCard.type);
  if (aliasType && KNOWN_BASE_CARD_TYPES.has(aliasType)) {
    return aliasType;
  }

  return baseCard.type;
}

export function isBaseCardRuntimeType(baseCard: BaseCardTypeSource, targetType: string): boolean {
  return resolveBaseCardRuntimeType(baseCard) === targetType;
}
