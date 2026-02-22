import yaml from 'yaml';

export interface BaseCardContentTarget {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface BaseCardContentDocument {
  type: string;
  data: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCardType(type: string): string | null {
  const normalized = type.trim();
  return normalized.length > 0 ? normalized : null;
}

export function createBaseCardContentDocument(
  cardType: string,
  config?: Record<string, unknown>
): BaseCardContentDocument {
  const normalizedType = normalizeCardType(cardType);
  if (!normalizedType) {
    throw new Error('Base card content requires a non-empty "type"');
  }

  return {
    type: normalizedType,
    data: config && isPlainObject(config) ? config : {},
  };
}

export function stringifyBaseCardContentYaml(
  cardType: string,
  config?: Record<string, unknown>
): string {
  return yaml.stringify(createBaseCardContentDocument(cardType, config));
}

export function parseBaseCardContentYaml(contentText: string): BaseCardContentDocument | null {
  let parsed: unknown;
  try {
    parsed = yaml.parse(contentText);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }

  if (typeof parsed.type !== 'string' || !isPlainObject(parsed.data)) {
    return null;
  }

  const normalizedType = normalizeCardType(parsed.type);
  if (!normalizedType) return null;

  return { type: normalizedType, data: parsed.data };
}

export async function loadBaseCardConfigsFromContent(
  baseCards: BaseCardContentTarget[],
  cardPath: string,
  readText: (path: string) => Promise<string>
): Promise<void> {
  for (const baseCard of baseCards) {
    if (!baseCard.id) continue;

    const hasExistingConfig = Boolean(baseCard.config && Object.keys(baseCard.config).length > 0);
    const needResolveType = !baseCard.type || baseCard.type === 'UnknownCard';
    if (hasExistingConfig && !needResolveType) {
      continue;
    }

    const contentPath = `${cardPath}/content/${baseCard.id}.yaml`;

    try {
      const contentText = await readText(contentPath);
      if (!contentText) continue;

      const parsed = parseBaseCardContentYaml(contentText);
      if (!parsed) continue;

      if (needResolveType || baseCard.type !== parsed.type) {
        baseCard.type = parsed.type;
      }

      if (!hasExistingConfig) {
        baseCard.config = parsed.data;
      }
    } catch {
      // content 文件可能不存在，忽略即可
    }
  }
}
