import { glob } from 'astro/loaders';

function withoutRenderedContent(entry) {
  return {
    id: entry.id,
    data: entry.data,
    filePath: entry.filePath,
    digest: entry.digest,
    assetImports: entry.assetImports,
  };
}

/**
 * Load Markdown collection metadata without placing every rendered article in
 * Astro's global data-store module. Article pages render their source file on
 * demand through renderContentEntry(), keeping the Vite server entry small.
 */
export function metadataOnlyGlob(options) {
  const loader = glob({ ...options, retainBody: false });

  return {
    ...loader,
    name: 'metadata-only-glob-loader',
    async load(context) {
      const compactStore = {
        ...context.store,
        set(entry) {
          return context.store.set(withoutRenderedContent(entry));
        },
      };

      // The built-in glob loader receives Astro's entry type registry at
      // runtime. Removing only the eager render hook retains Astro's native
      // frontmatter parsing, IDs, validation, digests, and file watching.
      const entryTypes = context.entryTypes instanceof Map
        ? new Map(context.entryTypes)
        : context.entryTypes;
      const markdownEntryType = entryTypes?.get?.('.md');

      if (markdownEntryType?.getRenderFunction) {
        entryTypes.set('.md', {
          ...markdownEntryType,
          getRenderFunction: undefined,
        });
      }

      await loader.load({ ...context, store: compactStore, entryTypes });

      // Compact an existing cache created before this loader was enabled.
      for (const [id, entry] of context.store.entries()) {
        if (!entry.body && !entry.rendered && !entry.deferredRender) continue;
        context.store.delete(id);
        context.store.set(withoutRenderedContent(entry));
      }
    },
  };
}

export { withoutRenderedContent };
