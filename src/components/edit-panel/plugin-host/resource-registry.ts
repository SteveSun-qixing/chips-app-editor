import {
  buildCardResourceFullPath,
  releaseCardResourceUrl,
  resolveCardResourceUrl,
  type CardResolvedResource,
} from '@/services/card-resource-resolver';

export interface EditorResourceRegistry {
  resolve(fullPath: string): Promise<string>;
  resolveByRelativePath(cardPath: string, resourcePath: string): Promise<string>;
  release(fullPath: string): Promise<void>;
  releaseByRelativePath(cardPath: string, resourcePath: string): Promise<void>;
  releaseAll(): Promise<void>;
}

export function createEditorResourceRegistry(): EditorResourceRegistry {
  const resolvedResources = new Map<string, CardResolvedResource>();

  return {
    async resolve(fullPath: string): Promise<string> {
      const cached = resolvedResources.get(fullPath);
      if (cached) {
        return cached.url;
      }

      const resolved = await resolveCardResourceUrl(fullPath);
      resolvedResources.set(fullPath, resolved);
      return resolved.url;
    },

    async resolveByRelativePath(cardPath: string, resourcePath: string): Promise<string> {
      const fullPath = buildCardResourceFullPath(cardPath, resourcePath);
      return this.resolve(fullPath);
    },

    async release(fullPath: string): Promise<void> {
      const resolved = resolvedResources.get(fullPath);
      if (!resolved) {
        return;
      }

      await releaseCardResourceUrl(resolved);
      resolvedResources.delete(fullPath);
    },

    async releaseByRelativePath(cardPath: string, resourcePath: string): Promise<void> {
      const fullPath = buildCardResourceFullPath(cardPath, resourcePath);
      if (resolvedResources.has(fullPath)) {
        await this.release(fullPath);
        return;
      }

      const normalizedSuffix = `/${resourcePath.replace(/^\/+/, '')}`;
      for (const path of resolvedResources.keys()) {
        if (path.endsWith(normalizedSuffix)) {
          await this.release(path);
          return;
        }
      }
    },

    async releaseAll(): Promise<void> {
      const resources = Array.from(resolvedResources.values());
      resolvedResources.clear();
      await Promise.all(resources.map((resource) => releaseCardResourceUrl(resource)));
    },
  };
}
