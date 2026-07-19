# Album entries

Album entries use one Markdown file per locale:

```text
albums/<category>/<album-id>/zh.md
albums/<category>/<album-id>/ja.md
albums/<category>/<album-id>/en.md
```

All translations of an album must share the same `translationKey`. A minimal entry looks like this:

```md
---
locale: zh
translationKey: example-album
title: 示例专辑
artist: 示例艺人
type: Album
releaseDate: "2026-01-01"
categoryTitle: 示例分类
categoryOrder: 1
itemOrder: 1
---

## 简介

在这里填写专辑介绍和可靠来源。
```

See the localized syntax guide under `src/content/contribute/syntax-guide/` for all supported fields.
