# コントリビューションガイド

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

この文書は、Wiki を編集して Pull Request を作成するための主要なガイドです。

## どこから始めるか

- 初めての貢献、または GitHub のブラウザー編集だけを使う場合は、サイト内の [コントリビューション学習センター](https://kamitsubaki.wiki/ja/contribute/edit) を開いてください。経験に合うルートを選び、同じページで Markdown・属性リファレンスを確認できます。
- リポジトリに慣れていて、フィールドやコマンドを調べたい場合は、この文書を続けて読んでください。
- 特定の記事を編集する場合は、記事ページの「ソースを編集」から入り、正しい対象パスを学習センターへ引き継いでください。

おすすめの順序：**ルートを選ぶ → 対象を確認 → 編集中に構文を参照 → 差分を確認 → PR を作成 → CI とレビューを追う**。Markdown をすべて学んでから始める必要はありません。

## 編集する場所

ほとんどの編集は `src/content/` で行います。

```text
src/content/site/       ナビゲーション、セクション名、フッター文言 (.json)
src/content/artists/    アーティスト、クリエイター、ユニット、音楽的同位体の記事 (.md)
src/content/projects/   プロジェクトページとカード (.md)
src/content/logs/       タイムライン/更新記録 (.md)
src/content/contribute/ GitHub 編集ガイドの文言 (.md)
```

`dist/`、`.astro/`、`node_modules/` は編集しないでください。

## 三言語ファイル

サイトは次の三つの言語ルートを持ちます。

```text
/zh/  中国語、デフォルト
/ja/  日本語
/en/  英語
```

翻訳可能なレコードには三言語のファイルを用意します。新しいページを追加するときは `zh.md`、`ja.md`、`en.md` を作り、同じ `translationKey` を使ってください。

## Markdown の形

Markdown ファイルは YAML frontmatter で構造化データを持ちます。

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
    - label: "花譜ピンク"
      value: "#F29AC2"
    - label: "赤い花"
      value: "#E63145"
    - label: "観測の濃紺"
      value: "#111321"
    - label: "柔光"
      value: "#FFF6FA"
seo:
  title: "花譜 - KAMITSUBAKI WIKI"
  description: "検索結果とリンクプレビュー用のカスタム説明。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花譜"
    - "KAF"
---
```

本文は二つ目の `---` の後に書きます。本文は空でも構いませんが、仮の紹介文は入れないでください。

### コンテンツの安全性

記事 HTML は明示的なホワイトリスト方式です。一般的な文字装飾、表、`ruby`、`details`、画像は保持されますが、`script`、`style`、生の `iframe`、フォーム、インラインイベント属性、危険な URL はビルド時に削除されます。音声・動画には管理された `@[provider](ID-or-share-URL "任意のキャプション")` 短縮構文だけを使用してください。YouTube、bilibili、Apple Music、Spotify、NetEase Music、QQ Music に対応しています。

投稿者は生成後の HTML を直接書かず、`{{ruby::本文::読み}}`、`{{spoiler::隠す文字}}`、`{{mark::重要}}`、楽曲ページの `{{lyrics-controls::ja}}`、対になる `{{details::見出し}}` / `{{/details}}` などの Wiki 短縮構文を優先します。複数行コードは言語名付きの Markdown フェンスを使って構文を色分けします。HTML ホワイトリストは互換性と安全性の最終境界であり、通常の執筆インターフェースではありません。

正確な境界、移行時の挙動、拡張手順は [コンテンツ描画セキュリティポリシー](content-security.md) を参照してください。コピー可能な例はサイト内の [Markdown・項目属性ガイド](https://kamitsubaki.wiki/ja/contribute/syntax) でも確認できます。

`theme` も任意です。設定すると、記事ページに配色パネルが表示され、目次の強調、リンク、情報欄の枠色がそのキャラクター向けの色味になります。

テーマ色は、単に「きれいな色」で選ばないでください。次の順で決めるのがおすすめです。

1. 公式アーティストページ、公式キービジュアル、公式アルバムアート、公式キャラクター資料を確認します。
2. 髪色、衣装の主色、よく使われる背景色、象徴的なモチーフ色など、安定した識別色を探します。
3. `accentColor` には一番そのキャラクターらしい色を入れます。
4. `mutedColor` には補助色または対比色を入れます。
5. `surfaceColor` は濃い色にして、読み物としての見やすさを守ります。
6. `highlightColor` は明るい高光として使います。
7. `palette` には 3〜4 個以上の色を入れ、現在の言語で由来が分かる名前を付けます。

V.W.P の5人は、参考用のテーマ色サンプルとして使えます。

```text
花譜: KAF Bloom
理芽: RIM Neuromance
春猿火: Harusaruhi Impact
ヰ世界情緒: Isekaijoucho Dark Canvas
幸祜: KOKO Lightning Rock
```

色に確信が持てない場合は、仮の配色を入れるより、いったん `theme` を省略してください。

## アーティスト記事テンプレート

`src/content/artists/` 配下の人物・アーティスト記事は、できるだけ次のウィキ型構成にそろえてください。

```md
## 概要
## 役割と創作上の位置づけ
## 活動歴
## 代表作品と関連項目
## 関連企画 / 関連設定
## 参考資料
## 外部リンク
```

ポイント：

- `概要` では「誰か」「どこに属するか」「なぜ重要か」を 1〜2 段落で整理する
- `活動歴` は重要な節目だけに絞る
- `参考資料` は公式アーティストページ、公式ニュース、公式リリース、主要メディアを優先する
- `外部リンク` は少数で十分

## トップページ表示

トップページの DATABASE は `src/content/artists/` の第一階層フォルダを分類として自動取得します。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ トップページ分類
```

新しい分類を追加するときは、第一階層フォルダを作り、三言語の記事を入れてください。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder`、`code` は任意の表示上書きです。未設定の場合、フォルダ名、記事名、デフォルトの並び順を使います。

## メタデータ

`seo` ブロックは任意です。未設定の場合、サイトは記事から自動で取得します。

- `name`、`romanizedName`、カテゴリ、ステータスをフォールバックのメタデータに使います。
- Markdown 本文の最初の段落をページ説明に使います。
- `image` を Open Graph と Twitter のプレビュー画像に使います。

検索結果や共有カードを手動で制御したい場合だけ、`seo.title`、`seo.description`、`seo.image`、`seo.keywords`、`seo.noindex` を設定してください。デプロイ時に `PUBLIC_SITE_URL` を設定すると、canonical URL とローカル画像が絶対 URL になります。

## 新しい項目を追加する

1. 適切なコンテンツカテゴリにフォルダを作成します。
2. `zh.md`、`ja.md`、`en.md` を追加します。
3. 三つのファイルで同じ `translationKey` を使います。
4. 必須 frontmatter を入力します。
5. 本文がまだない場合は空のままで構いません。
6. ローカル検証を実行します。
7. Pull Request を作成します。

### V.W.P のサンプル記事

`src/content/artists/vwp/` には、5 人の初期サンプル記事が入っています。初めて編集する人は、まずそれらを見本にしてください。

- frontmatter の書き方
- 本文セクションの並び
- `参考資料` と `外部リンク` の閉じ方

既存の良い記事をまねるのが、最も安全で分かりやすい進め方です。

## ローカル検証

CI とローカル開発では同じコマンドを使います。

```bash
pnpm test
pnpm check
pnpm build
```

`pnpm check` が content schema エラーを出した場合は、該当ファイルを `src/content.config.ts` と見比べてください。

## Pull Request の流れ

1. `main` からブランチを作成します。
2. コンテンツまたは実装を編集します。
3. ローカル検証を実行します。
4. ブランチにコミットして push します。
5. `main` への Pull Request を作成します。
6. GitHub Actions CI を待ちます。
7. CI やレビューの指摘は同じブランチで修正します。

CI ワークフローは `.github/workflows/ci.yml` にあります。

## マージ前チェック

- 仮の本文がない。
- 必要な言語ファイルがすべて存在する。
- `pnpm test`、`pnpm check`、`pnpm build` が通る。
- PR が関連ファイルだけを変更している。
- `dist/` などの生成ディレクトリをコミットしていない。
