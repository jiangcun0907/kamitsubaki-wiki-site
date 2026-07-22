# 内容授权与来源标注

[English](licensing.en.md) / [中文](licensing.md) / [日本語](licensing.ja.md)

本站采用分层授权。公开页面以 [`/zh/license`](https://kamitsubaki.wiki/zh/license) 的说明为准；本文解释仓库中的内容作者应该怎样标注。

## 默认规则

- 除另有标注外，本站**有权许可的原创文字**采用 [CC BY-NC-SA 4.0 国际许可协议](https://creativecommons.org/licenses/by-nc-sa/4.0/)。
- 图片、封面、歌词、音视频、角色设计、Logo、商标及其他第三方素材不属于默认文字许可，相关权利归原权利人。
- 来自其他站点或作者的文字继续遵守原协议。许可标记不能代替转载许可，也不能让无权使用的内容变得可以使用。
- 程序代码和仓库软件文件不在上述 CC 内容许可范围内；仓库根目录不会用内容协议创建 `LICENSE`。
- 贡献入口目前不取得统一的 CC 授权。其他贡献者的文字只有在权利人另行明确同意，或条目记录了相应许可时，才能纳入 CC BY-NC-SA 4.0。

## 条目许可字段

艺人、企划、日志、歌曲和专辑条目可以在 YAML frontmatter 中添加 `license`：

| `code` | 用途 |
| --- | --- |
| `CC-BY-NC-SA-4.0` | 明确标记本站有权许可的原创文字 |
| `CC-BY-NC-SA-3.0-CN` | 采用 3.0 中国大陆版协议的第三方文字或其翻译、改编 |
| `rights-reserved` | 原权利人保留权利，不适用本站默认 CC 协议 |
| `authorized-use` | 仅按权利人的特定授权在本站使用 |

未知 `code` 会在 `pnpm check` 或构建时失败。

### 本站原创文字

没有 `license` 字段时，页面显示经过权利范围限定的默认 4.0 声明。需要显式记录时可以写：

```yaml
license:
  code: "CC-BY-NC-SA-4.0"
  attribution: "LinkTh1rsty"
```

### 采用旧版本 CC 协议的第三方文字

复制、翻译、改写或合并采用 3.0 CN 的第三方文字时，必须保留原许可版本，并填写来源、署名和修改说明：

```yaml
license:
  code: "CC-BY-NC-SA-3.0-CN"
  attribution: "原作者与贡献者"
  sourceTitle: "原始条目标题"
  sourceUrl: "https://example.com/original-entry"
  modifications: "基于原条目进行整理、改写并补充来源。"
```

`CC-BY-NC-SA-3.0-CN` 缺少 `attribution`、`sourceTitle`、`sourceUrl` 或 `modifications` 时，schema 校验会失败。三语翻译如果源自同一份第三方文字，也必须在各语言文件中保留该标记。

### 保留权利与特定授权

```yaml
license:
  code: "rights-reserved"
  attribution: "原作者或权利人名称"
  sourceTitle: "作品名称"
  sourceUrl: "https://example.com/original"
  note: "著作权由原作者保留。"
```

```yaml
license:
  code: "authorized-use"
  attribution: "权利人名称"
  note: "依据权利人许可，仅限本站使用。"
```

只有确实取得授权时才能使用 `authorized-use`。使用 `rights-reserved` 也不代表本站自动获得复制权；没有合法使用依据的材料不应提交。

## 图片与其他媒体

详情页会统一显示媒体排除声明，因此条目有官方封面或艺人图时，不要仅因为图片而把整篇文字标为 `rights-reserved`。文字许可与媒体权利分别判断：

- 优先使用官方公开页面、正规发行平台或已获授权的素材。
- 在正文“来源”中保留素材出处，PR 中说明图片来源和使用依据。
- 不上传来源不明、移除水印、人工放大或明显超出百科介绍需要的素材。

## Review 检查

- 这是原创文字、获得授权的文字，还是第三方协议内容？
- 许可版本是否与原来源完全一致？
- 是否提供原页面、署名和修改说明？
- 图片、歌词和嵌入媒体是否被误认为默认 CC 文字内容？
- 三种语言是否使用一致的来源和许可逻辑？
- `pnpm test`、`pnpm check` 和 `pnpm build` 是否通过？
