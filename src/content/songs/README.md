# 歌曲目录结构

歌曲列表按文件夹自动生成，统一使用：

```text
songs/
└── <artistId>/
    └── <category>/
        └── <songId>/
            ├── zh.md
            ├── ja.md
            └── en.md
```

例如花譜原创曲《糸》位于 `kaf/originals/shi/`。每个 Markdown 文件中的 `artistId` 必须与第一层目录一致；一级歌曲页会用这个 ID 关联 `artists` 集合，并直接采用艺人词条的 `image` 作为艺人封面。

## 推荐分类目录

| 目录 | 中文 | 日本語 | English |
| --- | --- | --- | --- |
| `originals` | 原创曲 | オリジナル曲 | Original Songs |
| `covers` | 翻唱曲 | カバー曲 | Covers |
| `genealogy` | 系谱曲 | 系譜曲 | Genealogy Songs |
| `suites` | 组曲 | 組曲 | Suite Songs |
| `collaborations` | 合作曲 | コラボ楽曲 | Collaborations |
| `projects` | 企划曲 | プロジェクト楽曲 | Project Songs |

分类不是固定枚举：新增其他目录也会自动显示为新的歌曲分类。推荐优先使用上表命名，以获得稳定排序和完整的三语标题。

旧式的 `<artistId>-<category>/<songId>/` 目录仍可被页面解析，但新增和迁移内容应使用新的三级目录结构。
