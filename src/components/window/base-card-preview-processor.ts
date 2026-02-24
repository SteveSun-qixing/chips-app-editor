interface BaseCardPreviewProcessorOptions {
  isDirectResourceUrl(path: string): boolean;
  resolveResourcePath(path: string): string;
}

interface BaseCardPreviewResourceCollectorOptions {
  isDirectResourceUrl(path: string): boolean;
  toFullPath(path: string): string | null;
}

const RESOURCE_FIELDS = new Set([
  'audio',
  'audio_file',
  'cover_image',
  'file',
  'file_path',
  'image',
  'image_file',
  'path',
  'poster',
  'src',
  'thumbnail',
  'url',
  'video',
  'video_file',
]);

const RESOURCE_EXTENSIONS = new Set([
  'aac',
  'ass',
  'avif',
  'avi',
  'bmp',
  'flac',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'm4a',
  'mkv',
  'mov',
  'mp3',
  'mp4',
  'ogg',
  'otf',
  'pdf',
  'png',
  'srt',
  'svg',
  'ttf',
  'vtt',
  'wav',
  'webm',
  'webp',
  'woff',
  'woff2',
  'wma',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPathExtension(path: string): string {
  const sanitized = path.split(/[?#]/, 1)[0]?.trim() ?? '';
  if (!sanitized) return '';
  const extension = sanitized.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}

function shouldProcessResourcePath(
  key: string | null,
  value: string,
  isDirectResourceUrl: (path: string) => boolean
): boolean {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;
  if (isDirectResourceUrl(trimmedValue) || trimmedValue.startsWith('chips://')) {
    return false;
  }

  if (key && RESOURCE_FIELDS.has(key.toLowerCase())) {
    return true;
  }

  return RESOURCE_EXTENSIONS.has(getPathExtension(trimmedValue));
}

function mapConfigValue(
  value: unknown,
  key: string | null,
  options: BaseCardPreviewProcessorOptions
): unknown {
  if (typeof value === 'string') {
    return shouldProcessResourcePath(key, value, options.isDirectResourceUrl)
      ? options.resolveResourcePath(value)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => mapConfigValue(item, null, options));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        mapConfigValue(nestedValue, nestedKey, options),
      ])
    );
  }

  return value;
}

function collectConfigValueResources(
  value: unknown,
  key: string | null,
  options: BaseCardPreviewResourceCollectorOptions,
  target: Set<string>
): void {
  if (typeof value === 'string') {
    if (!shouldProcessResourcePath(key, value, options.isDirectResourceUrl)) {
      return;
    }

    const fullPath = options.toFullPath(value);
    if (fullPath) {
      target.add(fullPath);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectConfigValueResources(item, null, options, target);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    collectConfigValueResources(nestedValue, nestedKey, options, target);
  }
}

export function resolveBaseCardPreviewConfig(
  config: Record<string, unknown> | undefined,
  options: BaseCardPreviewProcessorOptions
): Record<string, unknown> {
  if (!config) {
    return {};
  }

  return mapConfigValue(config, null, options) as Record<string, unknown>;
}

export function collectBaseCardPreviewResourcePaths(
  config: Record<string, unknown> | undefined,
  options: BaseCardPreviewResourceCollectorOptions
): Set<string> {
  const paths = new Set<string>();
  if (!config) {
    return paths;
  }

  collectConfigValueResources(config, null, options, paths);
  return paths;
}
