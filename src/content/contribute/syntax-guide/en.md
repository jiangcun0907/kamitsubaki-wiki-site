---
locale: en
translationKey: syntax-guide
title: Markdown Syntax and Property Guide
description: A guide to the Markdown syntax and entry properties used on this site.
---

This encyclopedia uses Markdown to create entries, unlike Wikipedia and Moegirlpedia, which use wikitext syntax. This document therefore provides a simple Markdown tutorial—or, more precisely, a tutorial covering everything required to create entries on this site.

Please note that all syntax symbols must use half-width ASCII characters. Full-width punctuation entered with a Chinese or Japanese input method will not work.

## Headings

Use the `#` symbol to create headings. The number of `#` symbols determines the heading level.

For example, `#` creates a level-one heading, `##` creates a level-two heading, and so on. Markdown supports up to six heading levels.

A space must be placed after the `#` symbols for the heading syntax to work.

For example:

`# Level-one heading`

This will produce the following heading:

# Level-one heading

## Text formatting

- Bold: **bold text**

  Use two asterisks or two underscores. The syntax is `**text to make bold**` or `__text to make bold__`.

- Italic: *italic text* or _italic text_

  Use one asterisk or one underscore. The syntax is `*italic text*` or `_italic text_`.

- Bold italic: ***bold italic text***

  Use three asterisks. The syntax is `***bold italic text***`.

- Strikethrough: ~~strikethrough text~~

  Use two tildes. The syntax is `~~strikethrough text~~`.

- Inline code: wrap the content in backticks: `` `inline code` ``.

## Lists

### Unordered lists

Use `-` or `+`:

- Item one
- Item two

The syntax is:

```markdown
- List item
```

Remember to add a space after the list marker.

### Ordered lists

Use a number followed by a period:

1. First step
2. Second step
3. Third step

## Links

The link syntax is:

```markdown
[Link name](URL)
```

For example:

```markdown
[Visit this site](https://kamitsubaki.wiki/en/)
```

The result will be:

[Visit this site](https://kamitsubaki.wiki/en/)

## Tables

Use `|` to define columns and `-` to define the header separator:

```markdown
| Artist | Song | Lyrics |
| :--- | :---: | ---: |
| KAF | 糸 | Omitted |
| RIM | 1999 | Omitted |
```

This produces the following table:

| Artist | Song | Lyrics |
| :--- | :---: | ---: |
| KAF | 糸 | Omitted |
| RIM | 1999 | Omitted |

Alignment rules:

- `:---` means left-aligned.
- `:---:` means centered.
- `---:` means right-aligned.

### Frontmatter

The frontmatter block at the top of a file contains the properties of the entry being edited.

A frontmatter block begins and ends with `---`.

For example:

```yaml
---
locale: en
translationKey: example-entry
title: Example Entry
---
```

### About Markdown editors

Markdown does not require a specialized editor. You can even create a Markdown file using a basic text editor such as Notepad, as long as you save the file with the `.md` extension.

For users who are unfamiliar with Markdown, an editor with real-time preview may provide a more convenient workflow.

Obsidian is recommended because it offers a comprehensive feature set and is available on multiple platforms.

## Advanced content

After learning the basic Markdown syntax, you can explore a slightly more advanced presentation method: HTML.

Markdown supports embedded HTML, allowing us to create a wider range of formatting effects. The following sections introduce several HTML elements that are commonly used when editing this site.

### Ruby tags

Ruby text is a typesetting format commonly used in East Asian writing systems. It places pronunciation or annotation text above or beside the main characters.

For example:

```html
<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>
```

For more precise character-by-character alignment, write:

```html
<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>
```

The result is:

- <ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>

### Spoiler or concealed-text effect

This site uses the following code to create a concealed-text effect:

```html
<span style="filter: blur(5px); transition: filter 0.3s; cursor: pointer;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='blur(5px)'" onclick="this.style.filter='none'">This is a confidential passage contaminated by forbidden knowledge.</span>
```

The result is:

<span style="filter: blur(5px); transition: filter 0.3s; cursor: pointer;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='blur(5px)'" onclick="this.style.filter='none'">You cannot see me. You cannot see me.</span>

When using this effect, replace the text inside the `<span>` element with the content you want to conceal.

### Collapsible content

When an entry contains too many items, especially inside a table, use the following structure to hide excessive content by default:

```html
<details>
  <summary>Write the title that is normally visible here. Click it to expand.</summary>
  Write the content that is normally hidden here. It will appear after expansion.
</details>
```

The result is:

<details>
  <summary>Write the title that is normally visible here. Click it to expand.</summary>
  Write the content that is normally hidden here. It will appear after expansion.
</details>

*Note: You can use `<br>` to insert a line break while editing.*

### Embedding audio and video

This site supports embedding audio and video through `iframe` elements.

Most major streaming platforms can directly generate an iframe embed code. You can copy and paste the generated code into the entry.

These are the syntax formats most commonly used when editing this site. This document may be updated in the future.

## Property block guide

If you do not understand the properties in an entry's frontmatter block, refer to the explanations below.

### Common properties

The following properties are shared by every entry category:

- `locale`: Identifies the language version of the document. The available values are `zh` for Chinese, `en` for English, and `ja` for Japanese. Enter the value corresponding to the language of the entry you are editing.
- `translationKey`: A shared identifier connecting different language versions of the same entry. The Chinese, Japanese, and English files for the same entry must use the same value.

### Artist properties

| Property | Type | Required | Purpose and content |
| :---: | :---: | :---: | :--- |
| `locale` | `zh / ja / en` | Yes | Language of the current entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same person |
| `code` | String | No | Artist number, archive number, or internal identifier |
| `name` | String | Yes | Person's name as displayed in the current language |
| `romanizedName` | String | Yes | Romanized, Latin-alphabet, or international display name |
| `categoryTitle` | String | No | Main title of the category to which the artist belongs |
| `categorySubtitle` | String | No | Subtitle or English description of the category |
| `categoryOrder` | Number | No | Sorting value between categories; smaller values are usually displayed first |
| `itemOrder` | Number | No | Sorting value of the current artist within the category |
| `meta` | String | No | Short metadata shown on a list card, such as a role, affiliation, or brief summary |
| `debutDate` | String | No | Debut date. The recommended format is `YYYY-MM-DD`, although the schema does not enforce it |
| `profileTagline` | String | No | Introductory tagline displayed on the artist detail page |
| `designCredits` | String array | No | List of character designers, visual designers, modelers, and other production staff |
| `affiliations` | String array | No | Labels, groups, projects, or organizations with which the artist is affiliated |
| `officialLinks` | Object array | No | Official website and official social-media links |
| `officialLinks[].label` | String | Yes | Link name, such as `Official Site` or `YouTube` |
| `officialLinks[].href` | String | Yes | Official link URL |
| `featuredEntries` | Object array | No | Other entries prominently associated with the artist |
| `featuredEntries[].label` | String | Yes | Display name of the associated content |
| `featuredEntries[].href` | String | Yes | Path to the associated entry |
| `featuredEntries[].kind` | Fixed enum | Yes | Type of associated content. Must be `artist`, `project`, `album`, or `song` |
| `theme` | Shared theme object | No | Customized color theme for the artist detail page |
| `statusLabel` | String | Yes | Heading of the status field, such as `Activity Status` |
| `status` | String | Yes | Actual status, such as `Active` or `Inactive` |
| `inactive` | Boolean | No | Whether the artist is inactive. `true` normally indicates that activities have ended or the entry has been archived |
| `image` | String | Yes | Path to the main image, avatar, or character illustration |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information for the entry |

### Project properties

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current project entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same project |
| `kind` | String | Yes | Project type, such as `project`, `game`, or `virtual-world`. The schema does not restrict this field to predefined values |
| `title` | String | Yes | Project title |
| `description` | String | Yes | Short description of the project, normally used on list cards or as a page summary |
| `order` | Number | Yes | Sorting value in the project list |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Log properties

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current log entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same log |
| `date` | String | Yes | Date of the log. The recommended format is `YYYY-MM-DD`, although the schema does not validate it |
| `type` | String | Yes | Log type, such as `update`, `notice`, or `maintenance` |
| `title` | String | Yes | Log title |
| `summary` | String | No | Short summary of the log |
| `order` | Number | Yes | Sorting value of the log |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Song properties

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current song entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same song |
| `title` | String | Yes | Song title |
| `artist` | String | Yes | Main performer or artist name |
| `composer` | String | No | Composer |
| `lyricist` | String | No | Lyricist |
| `album` | String | No | Album containing the song |
| `duration` | String | No | Song duration. The recommended format is `03:45`, although the schema does not validate it |
| `releaseDate` | String | No | Release date. The recommended format is `YYYY-MM-DD` |
| `code` | String | No | Song number, archive number, or internal identifier |
| `categoryTitle` | String | No | Title of the category to which the song belongs |
| `categorySubtitle` | String | No | Subtitle of the category |
| `categoryOrder` | Number | No | Sorting value between categories |
| `itemOrder` | Number | No | Sorting value of the song within its category |
| `image` | String | No | Path to the song artwork, single cover, or album cover |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

- For specific examples, refer to completed entries in this site's GitHub repository.