---
locale: zh
translationKey: syntax-guide
title: Markdown语法与属性指南
description: 本站使用的Markdown语法及词条属性填写指南。
---

本百科站点构建词条的方式使用Markdown格式，不同于Wikipedia和萌娘百科使用的wikitext语法，故在此提供简易（或者说，在本站构建词条足够使用）的Markdown语法教程文档。
额外注意的是，所有语法符号均使用半角符号，使用中文输入法输入的全角符号不会起效。
## 标题 

使用#号，数量对应标题级别。例如，#即为一级标题，##为二级标题，依次类推，最多出现六级标题。值得注意的是，在#号后需要接入空格才会使标题语法生效。
    `例如：# 一级标题才会出现下方的一级标题
# 一级标题  

## 文本格式 

- 加粗:**加粗文本**
    `使用双星号或双底线来进行加粗，格式结构为**需要加粗的文本**或__需要加粗的文本__
- 斜体: *斜体文本* 或 _斜体文本_
    `使用单星号或单底线来使用斜体，格式结构为*斜体文本*或_斜体文本_
- 粗斜体: ***粗斜体文本***
    `使用三个星号来使用粗斜体，格式结构为***斜体文本***
- 删除线: ~~删除线文本~~
    `使用双波浪号来使用删除线，格式结构为~~删除线~~
- 行内代码: 使用反引号 ` 包裹

## 列表

### 无序列表

使用-, 或+：

- 项目一
    `标记形式为”- 列表文本“，切记在列表符号后需加入空格来启用。
- 项目二

### 有序列表

使用数字加点：

1. 第一步
    
2. 第二步
    
3. 第三步


## 超链接

- 链接: `[链接名称](URL)  
    例如: `[本站地址](https://kamitsubaki.wiki/zh/)
    你将会得到这个结果：[本站地址](https://kamitsubaki.wiki/zh/)

## 表格

使用 | 定义列，- 定义表头分隔线：

`|   |   |   |
`|:---|:---:|---:|
`|艺人|歌名|歌词|
`|KAF|糸|略|
`|RIM|1999|略|
将得到以下表格：

| 艺人  |  歌名  |  歌词 |
| :-- | :--: | --: |
| KAF |  糸   |   略 |
| RIM | 1999 |   略 |
注：:--- 左对齐, :---: 居中, ---: 右对齐

### frontmatter

在顶部frontmatter中，我们将写入所编辑词条的属性。
frontmatter的始/终符号均为---。
### 关于markdown编辑器

实际上，markdown格式并不需要特殊的编辑器。你甚至可以用备忘录和记事本写md文件（只需在保存时更改扩展名为.md即可）。
对于没有接触过markdown格式的各位朋友，一个即时可视化的编辑器可能会更加适合你的编辑流程。在这里，本人推荐使用Obsidian进行编辑，功能较为全面且同时有多平台客户端。

## 进阶内容

在学会基本的markdown语法后，我们可以稍微了解一点进阶的表现形式：html语法。因为markdown支持html，所以我们可以通过html来获得一些多样的格式。下面将介绍几种在本站编辑过程中较为常用的html语法。

### Ruby标签

ruby是在汉字文化圈常用的排版形式，各位所看到的如<ruby>局部坏死<rt>zheng ge hao huo</rt></markdown>之类形式即使用ruby进行表记。
ruby字语法如下：
`<ruby>局部坏死<rt>zheng ge hao huo</rt>`
如果需要精准对齐，可以这样写：
`<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>
显示如下：
- <ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>

### 黑幕效果

在实现这样的黑幕效果时，本站使用如下的代码：
`<span style="filter: blur(5px); transition: filter 0.3s; cursor: pointer;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='blur(5px)'" onclick="this.style.filter='none'">这是一段被精神污染的机密文本</span>`
表现效果如下：
<span style="filter: blur(5px); transition: filter 0.3s; cursor: pointer;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='blur(5px)'" onclick="this.style.filter='none'">你看不到我看不到我</span>
在使用时，可以直接替换代码中的汉字文本来进行使用。

### 收起与展开

在项目过多时（尤其在表格中），我们使用以下格式来默认隐藏过多内容：
`<details>
`<summary>
`这里写平时显示的标题（点击可以展开）</summary>`
`这里写平时隐藏的内容，展开后才会看到。
`</details>
显示效果如下：
<details>
  <summary>这里写平时显示的标题（点击可以展开）</summary>
  这里写平时隐藏的内容，展开后才会看到。
</details>

*注：在编辑时，可以使用`<br>`来进行换行*

### 插入音频/视频

本站支持iframe格式嵌入视频/音频。
各大流媒体站点均支持直接生成iframe格式嵌入链接，可直接粘贴使用。

以上便是本站编辑过程中较为常用的语法格式。此文档可能会进行更新。

## 属性块指南

在编辑词条时，看不懂属性块的含义？在这里将会进行解释：

### 公有部分

以下属性是各类别词条共有的内容：
- locale：表记该文档版本，分为zh(中文)、en(英文)、ja(日文)三类。请按照所编辑词条的语言来填写。
- translationKey：多语言版本之间的共同标识。中文、日文、英文对应文件填写相同值。

### 艺人部分

|            属性             |       类型       | 必填  |                   作用与填写内容                    |
| :-----------------------: | :------------: | :-: | :------------------------------------------: |
|         `locale`          | `zh / ja / en` |  是  |                    当前词条语言                    |
|     `translationKey`      |      字符串       |  是  |               同一人物不同语言版本的共同标识                |
|          `code`           |      字符串       |  否  |                人物编号、档案编号或内部代码                |
|          `name`           |      字符串       |  是  |                 当前语言中显示的人物名称                 |
|      `romanizedName`      |      字符串       |  是  |               罗马字、拉丁字母名称或国际显示名               |
|      `categoryTitle`      |      字符串       |  否  |                   所属分类的主标题                   |
|    `categorySubtitle`     |      字符串       |  否  |                所属分类的副标题或英文说明                 |
|      `categoryOrder`      |       数字       |  否  |              分类之间的排序值，较小值通常排在前面              |
|        `itemOrder`        |       数字       |  否  |                当前人物在所属分类内的排序值                |
|          `meta`           |      字符串       |  否  |           列表卡片上的简短元信息，例如身份、所属或一句概括           |
|        `debutDate`        |      字符串       |  否  |    出道日期。建议统一写为 `YYYY-MM-DD`，但 Schema 不强制     |
|     `profileTagline`      |      字符串       |  否  |                 人物详情页上的简介标语                  |
|      `designCredits`      |     字符串数组      |  否  |             角色设计、视觉设计、建模等制作人员名单              |
|      `affiliations`       |     字符串数组      |  否  |                所属厂牌、组合、企划或机构                 |
|      `officialLinks`      |      对象数组      |  否  |                 官方网站和官方社交链接                  |
|  `officialLinks[].label`  |      字符串       |  是  |      链接名称，例如 `Official Site`、`YouTube`       |
|  `officialLinks[].href`   |      字符串       |  是  |                    官方链接地址                    |
|     `featuredEntries`     |      对象数组      |  否  |                 人物页重点关联的其他词条                 |
| `featuredEntries[].label` |      字符串       |  是  |                   关联内容显示名称                   |
| `featuredEntries[].href`  |      字符串       |  是  |                    对应词条路径                    |
| `featuredEntries[].kind`  |      固定枚举      |  是  | 关联内容类型，只能是 `artist`、`project`、`album`、`song` |
|          `theme`          |     公共主题对象     |  否  |                当前人物详情页的个性化配色                 |
|       `statusLabel`       |      字符串       |  是  |               状态字段的标题，例如“活动状态”               |
|         `status`          |      字符串       |  是  |             实际状态，例如“活动中”“已停止活动”              |
|        `inactive`         |      布尔值       |  否  |        是否为非活动状态。通常 `true` 表示已停止活动或归档         |
|          `image`          |      字符串       |  是  |                 人物主图、头像或立绘路径                 |
|           `seo`           |   公共 SEO 对象    |  否  |                 当前词条的搜索和分享信息                 |

### 企划部分

|属性|类型|必填|作用与填写内容|
|---|---|--:|---|
|`locale`|`zh / ja / en`|是|当前企划词条的语言|
|`translationKey`|字符串|是|同一企划多语言版本的共同标识|
|`kind`|字符串|是|企划类型，例如 `project`、`game`、`virtual-world`；Schema 不限制固定值|
|`title`|字符串|是|企划名称|
|`description`|字符串|是|企划简短介绍，通常用于列表卡片或页面摘要|
|`order`|数字|是|企划列表排序值|
|`seo`|公共 SEO 对象|否|搜索与分享信息|

### logs部分

|属性|类型|必填|作用与填写内容|
|---|---|--:|---|
|`locale`|`zh / ja / en`|是|当前日志语言|
|`translationKey`|字符串|是|同一日志多语言版本的共同标识|
|`date`|字符串|是|日志日期。建议写 `YYYY-MM-DD`，但 Schema 不验证格式|
|`type`|字符串|是|日志类型，例如 `update`、`notice`、`maintenance`|
|`title`|字符串|是|日志标题|
|`summary`|字符串|否|日志简短摘要|
|`order`|数字|是|日志排序值|
|`seo`|公共 SEO 对象|否|搜索和分享信息|

### 歌曲部分

|属性|类型|必填|作用与填写内容|
|---|---|--:|---|
|`locale`|`zh / ja / en`|是|当前歌曲词条语言|
|`translationKey`|字符串|是|同一歌曲多语言版本的共同标识|
|`title`|字符串|是|歌曲标题|
|`artist`|字符串|是|主演唱者或艺人名称|
|`composer`|字符串|否|作曲者|
|`lyricist`|字符串|否|作词者|
|`album`|字符串|否|所属专辑|
|`duration`|字符串|否|歌曲时长。建议统一写 `03:45`，但 Schema 不验证格式|
|`releaseDate`|字符串|否|发行日期。建议使用 `YYYY-MM-DD`|
|`code`|字符串|否|歌曲编号、档案编号或内部代码|
|`categoryTitle`|字符串|否|所属分类标题|
|`categorySubtitle`|字符串|否|所属分类副标题|
|`categoryOrder`|数字|否|分类排序值|
|`itemOrder`|数字|否|歌曲在分类内的排序值|
|`image`|字符串|否|歌曲封面、单曲封面或专辑图片路径|
|`seo`|公共 SEO 对象|否|搜索和分享信息|
- 关于具体的填写示例，可在本站GitHub仓库寻找已填写完毕的词条内容进行查看。