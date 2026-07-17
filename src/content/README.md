# Content Directory

This directory contains editable wiki content. Implementation code should read this content through Astro Content Collections instead of hardcoding records in components.

Use one file per locale. Markdown entries are stored in folders:

```text
artists/vwp/kaf/zh.md
artists/vwp/kaf/ja.md
artists/vwp/kaf/en.md
albums/<category>/<album-id>/zh.md
contribute/edit-guide/zh.md
logs/2024/2024-06-01-vwp-live/zh.md
```

Keep `translationKey` identical across all translations of the same record.

Metadata is automatic by default. Add an optional `seo` block only when a page needs custom search or link-preview text.

See `docs/contributing.md` for the full editing guide.
