# 贡献指南

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

这份文档是编辑百科和提交 Pull Request 的主要参考。

## 从哪里开始

- 第一次贡献，或只想用 GitHub 网页修改内容：打开站内的 [贡献学习中心](https://kamitsubaki.wiki/zh/contribute/edit)。它会按经验选择路线，并在同一页直接显示 Markdown 与属性参考。
- 已经熟悉仓库、需要查字段或命令：继续阅读本文档。
- 正在编辑具体词条：优先从词条页的“编辑源文件”进入，学习中心会自动显示目标路径。

推荐顺序是：**选择路线 → 确认目标文件 → 修改时按需查语法 → 预览差异 → 提交 PR → 查看 CI 与 review**。不需要先学完所有 Markdown 才开始。

## 编辑内容

大多数修改都在 `src/content/`。

```text
src/content/site/       站点导航、分区标题、页脚文案 (.json)
src/content/artists/    艺人、创作者、组合、音乐同位体条目 (.md)
src/content/projects/   企划页面和卡片内容 (.md)
src/content/logs/       时间线/更新记录 (.md)
src/content/contribute/ GitHub 编辑教程页文案 (.md)
```

不要编辑 `dist/`、`.astro/` 或 `node_modules/`。

## 三语文件

站点支持三个语言路由：

```text
/zh/  中文，默认语言
/ja/  日文
/en/  英文
```

每个可翻译记录都应该有三份语言文件。新增条目时请同时创建 `zh.md`、`ja.md`、`en.md`，并保持相同的 `translationKey`。

## Markdown 结构

Markdown 文件使用 YAML frontmatter 存放结构化数据。

```yaml
---
locale: zh
translationKey: kaf
name: "花譜"
romanizedName: "KAF"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
theme:
  name: "KAF Bloom"
  accentColor: "#F29AC2"
  mutedColor: "#E63145"
  surfaceColor: "#111321"
  highlightColor: "#FFF6FA"
  palette:
    - label: "花譜粉"
      value: "#F29AC2"
    - label: "红花"
      value: "#E63145"
    - label: "观测深蓝"
      value: "#111321"
    - label: "柔光白"
      value: "#FFF6FA"
seo:
  title: "花譜 - KAMITSUBAKI WIKI"
  description: "用于搜索结果和链接预览的自定义描述。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花譜"
    - "KAF"
---
```

正文写在第二个 `---` 后面。正文可以留空，但不要写占位介绍。

### 内容安全

正文 HTML 采用显式白名单。常用排版标签、表格、`ruby`、`details`、图片等会保留；`script`、`style`、原始 `iframe`、表单、内联事件属性和危险 URL 会在构建时移除。音视频只能使用 `@[来源](ID 或分享链接 "可选标题")` 受控短语法，当前支持 YouTube、bilibili、Apple Music、Spotify、网易云音乐和 QQ 音乐。

作者优先调用 Wiki 短语法，不直接编写生成后的 HTML，例如 `{{ruby::正文::注音}}`、`{{spoiler::隐藏文字}}`、`{{mark::重点}}`、歌曲页的 `{{lyrics-controls::zh}}`，以及成对的 `{{details::标题}}` / `{{/details}}`。多行代码继续使用带语言名称的 Markdown 围栏以获得语法高亮。HTML 白名单是最后一道兼容与安全边界，不是推荐的日常写作接口。

完整标签、属性边界、媒体迁移规则和扩展方法见 [内容渲染安全策略](content-security.md)。作者可直接在站内 [Markdown 与词条属性完整指南](https://kamitsubaki.wiki/zh/contribute/syntax) 查看可复制示例。

`theme` 也是可选字段。填写后，条目页会显示配色面板，并把目录、高亮链接、资料卡边框切到对应角色主题色。

主题色不要随便挑“好看的颜色”。推荐按这个顺序决定：

1. 先看官方艺人页、官方主视觉、官方专辑封面或官方设定图。
2. 找出最稳定的角色识别色，比如发色、服装主色、背景常用色、代表意象色。
3. `accentColor` 放最能代表角色的一眼识别色。
4. `mutedColor` 放辅助色或视觉反差色。
5. `surfaceColor` 用深色背景，避免阅读器变成高饱和色块。
6. `highlightColor` 用浅色，只负责高光和轻量强调。
7. `palette` 至少写 3 到 4 个色块，并用当前语言写清每个色块来自哪里。

V.W.P 五位成员已经提供了可参考的主题色样板：

```text
花譜: KAF Bloom
理芽: RIM Neuromance
春猿火: Harusaruhi Impact
ヰ世界情緒: Isekaijoucho Dark Canvas
幸祜: KOKO Lightning Rock
```

如果你不确定某个角色该用什么颜色，宁可先不写 `theme`，也不要用随意的临时配色。

## 人物页模板

`src/content/artists/` 下的人物页，推荐统一采用维基式结构：

```md
## 概述
## 角色与创作定位
## 活动历程
## 代表作品与相关条目
## 相关企划 / 关联设定
## 参考资料
## 外部链接
```

其中：

- `概述` 用 1 到 2 段说清“她是谁、属于哪里、为什么重要”。
- `活动历程` 只保留高价值节点，不写流水账。
- `参考资料` 优先使用官方艺人页、官方新闻、官方发布、主流媒体采访。
- `外部链接` 放官方主页、团体主页、可靠百科入口即可，不要堆太多。

如果你要补的是艺人页，优先按这个结构补齐，再考虑继续扩写。

## 首页展示

首页 DATABASE 会自动扫描 `src/content/artists/` 的第一层文件夹作为分类。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ 首页分类
```

新增分类时，只需要新建第一层文件夹并放入三语条目。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder` 和 `code` 都是可选覆盖字段；不填时会使用文件夹名、条目名和默认排序。

## 元数据

`seo` 是可选字段。不填写时，站点会自动扫描：

- `name`、`romanizedName`、分类和状态作为兜底元数据。
- Markdown 正文第一段作为页面描述。
- `image` 作为 Open Graph 和 Twitter 分享图。

只有需要精确控制搜索结果或分享卡片时，才填写 `seo.title`、`seo.description`、`seo.image`、`seo.keywords` 或 `seo.noindex`。部署时设置 `PUBLIC_SITE_URL` 可以让 canonical URL 和站内图片变成绝对地址。

## 新增条目

1. 在正确的内容分类下创建文件夹。
2. 添加 `zh.md`、`ja.md`、`en.md`。
3. 三个文件使用相同的 `translationKey`。
4. 填写必要 frontmatter。
5. 正文未准备好时可以留空。
6. 运行本地验证。
7. 发起 Pull Request。

### V.W.P 首发样板

`src/content/artists/vwp/` 现在已经提供了五位成员的首发样板写法。新手最稳的方式，是先照着这些文件学习：

- 看 frontmatter 怎么写
- 看正文分节怎么组织
- 看 `参考资料` 和 `外部链接` 怎么收尾

先模仿，再扩展，通常最不容易把结构写乱。

## 本地验证

CI 和本地使用同一套命令：

```bash
pnpm test
pnpm check
pnpm build
```

如果 `pnpm check` 报内容 schema 错误，请对照 `src/content.config.ts` 检查对应文件。

## Pull Request 流程

1. 从 `main` 创建分支。
2. 修改内容或实现。
3. 运行本地验证。
4. 提交并推送分支。
5. 向 `main` 发起 Pull Request。
6. 等待 GitHub Actions CI。
7. 在同一分支修复 CI 或 review 问题。

CI 工作流在 `.github/workflows/ci.yml`。

## 合并前检查

- 没有占位正文。
- 所有必要语言文件都存在。
- `pnpm test`、`pnpm check`、`pnpm build` 通过。
- PR 只包含相关文件。
- 不提交 `dist/` 等生成目录。
