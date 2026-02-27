import JSZip from 'jszip';
import type { CoverData } from '@/components/cover-maker/types';
import { requireCardPath } from './card-path-service';
import { resourceService } from './resource-service';

interface SaveCardCoverOptions {
  cardId: string;
  cardPath?: string | null;
}

function normalizeFileName(name: string, fallback: string): string {
  const trimmed = name.trim();
  const normalized = trimmed
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[^\w.-]/g, '_');
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) {
    return '/';
  }
  return normalized.slice(0, index);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}

function normalizeHtml(html: string): string {
  const trimmed = html.trim();
  if (/<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
${trimmed}
</body>
</html>`;
}

function buildImageCoverHtml(relativePath: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  <img src="../${relativePath}" alt="cover" />
</body>
</html>`;
}

function buildZipCoverHtml(relativePath: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body, iframe {
      margin: 0;
      width: 100%;
      height: 100%;
      border: 0;
      overflow: hidden;
      background: transparent;
    }
  </style>
</head>
<body>
  <iframe src="../${relativePath}" title="cover"></iframe>
</body>
</html>`;
}

function normalizeArchiveEntryPath(path: string): string | null {
  const segments = path
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    return null;
  }
  return segments.join('/');
}

export async function saveCardCover(
  options: SaveCardCoverOptions,
  data: CoverData
): Promise<void> {
  const cardPath = requireCardPath(
    options.cardId,
    options.cardPath,
    'save card cover',
    resourceService.workspaceRoot
  );
  const cardConfigDir = joinPath(cardPath, '.card');
  const cardCoverDir = joinPath(cardPath, 'cardcover');
  const coverHtmlPath = joinPath(cardConfigDir, 'cover.html');

  await resourceService.ensureDir(cardConfigDir);
  await resourceService.ensureDir(cardCoverDir);

  switch (data.mode) {
    case 'image': {
      if (!data.imageData) {
        throw new Error('Cover image data is missing');
      }
      const fileName = normalizeFileName(data.imageData.filename, 'cover-image.png');
      const relativePath = joinPath('cardcover', fileName);
      const absolutePath = joinPath(cardPath, relativePath);
      await resourceService.writeBinary(absolutePath, toArrayBuffer(data.imageData.data));
      await resourceService.writeText(coverHtmlPath, buildImageCoverHtml(relativePath));
      return;
    }

    case 'html':
    case 'template': {
      const html = data.htmlContent?.trim();
      if (!html) {
        throw new Error('Cover HTML content is missing');
      }
      await resourceService.writeText(coverHtmlPath, normalizeHtml(html));
      return;
    }

    case 'zip': {
      if (!data.zipData) {
        throw new Error('Cover ZIP data is missing');
      }

      const zip = await JSZip.loadAsync(data.zipData.data);
      const extractedEntries: string[] = [];
      for (const [entryPath, entry] of Object.entries(zip.files)) {
        if (entry.dir) {
          continue;
        }

        const normalizedEntryPath = normalizeArchiveEntryPath(entryPath);
        if (!normalizedEntryPath) {
          continue;
        }

        const targetPath = joinPath(cardCoverDir, normalizedEntryPath);
        await resourceService.ensureDir(dirname(targetPath));
        const bytes = await entry.async('uint8array');
        await resourceService.writeBinary(targetPath, toArrayBuffer(bytes));
        extractedEntries.push(normalizedEntryPath);
      }

      const requestedEntry = normalizeArchiveEntryPath(data.zipData.entryFile);
      const resolvedEntry =
        (requestedEntry && extractedEntries.includes(requestedEntry) ? requestedEntry : null)
        ?? extractedEntries.find((entry) => entry.toLowerCase().endsWith('.html'))
        ?? null;

      if (!resolvedEntry) {
        throw new Error('Cover ZIP package does not include any HTML entry file');
      }

      await resourceService.writeText(
        coverHtmlPath,
        buildZipCoverHtml(joinPath('cardcover', resolvedEntry))
      );
      return;
    }

    default: {
      throw new Error(`Unsupported cover mode: ${(data as { mode: string }).mode}`);
    }
  }
}
