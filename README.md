# TogoVar

TogoVar は、日本人集団のゲノム配列差異（variant）と疾患関連情報を収集・整理した、日本人ゲノム多様性の統合データベースです。

このリポジトリは、TogoVar のフロントエンドを中心にした作業ツリーです。検索画面、variant/gene/disease レポート画面、ドキュメントページ、参照ゲノム別の検索条件定義などを管理します。

AIエージェント向けの作業指示・設計ルールは [AGENTS.md](./AGENTS.md) にまとめています。
この README は、人間がプロジェクトを理解・開発・運用するための説明書です。

## 主な機能

- Simple search: キーワードやフィルターによる variant 検索
- Advanced search: 条件を組み合わせた詳細検索
- Search results: 検索結果テーブル、列表示設定、プレビュー
- Karyotype view: 染色体上の表示領域・条件連携
- Report pages: variant / gene / disease の詳細ページ
- Download: 検索条件に基づくダウンロード
- Documentation: datasets / downloads / help / history / terms などの英語・日本語ドキュメント
- SEO files: `robots.txt` と `sitemap.xml` のビルド時生成

## 使用技術

| 役割           | 技術                                           |
| -------------- | ---------------------------------------------- |
| フロントエンド | TypeScript / JavaScript / Lit / Web Components |
| ビルド         | Webpack 5 / ts-loader                          |
| スタイル       | SCSS / CSS                                     |
| テンプレート   | Pug                                            |
| サーバー       | nginx（静的ファイル配信）                      |
| API連携        | TogoVar API                                    |
| データ定義     | JSON / TSV / YAML                              |
| 検証           | ESLint / stylelint / TypeScript                |

## ディレクトリ構成

主な構成は以下です。

```txt
app/frontend/
  assets/        参照ゲノム別JSON、karyotype.tsv、stanza設定など
  config/        Webpack設定、サイトURL生成設定
  packs/         Webpackエントリポイント
  src/
    api/         API通信
    components/  UIコンポーネント・画面部品
    store/       StoreManager、検索条件、URL反映
    types/       グローバル型定義
    utils/       汎用ヘルパー
  stylesheets/   SCSS（FLOCSS レイヤー構成）
    main.scss          エントリポイント。全ファイルを正しい順序で @use する
    foundation/        ベース層（変更頻度低）
      _variables.scss  デザイントークン。色・サイズ・z-index などを :root の CSS カスタムプロパティとして定義
      _mixins.scss     再利用ミックスイン（sprite・input-number）
      _base.scss       HTML タグのデフォルトスタイル（body・a・input など）
      _reset.scss      CSS リセット（変更禁止）
    layout/            ページ骨格（#Layout・aside・main の配置）
    object/
      component/       汎用 UI パーツ。特定画面に依存せず複数画面で使われるもの
                       例: button-view, panel-view, dropdown-view, range-slider
      utility/         ヘルパークラス（状態・表示補助）
    features/          画面・機能固有スタイル。1 つの画面・機能だけが使うもの
                       例: _results.scss, _detail.scss, _global-header.scss
    web-components/    Lit 要素が直接 import する Shadow DOM 用 SCSS
                       例: tab-view, prediction-range-slider, frequency-block-view
  views/         Pugテンプレート
dist/             ビルド出力
```

## ローカル開発

### 必要なもの

- Node.js 22.x
- npm

Node.js のバージョンは `.nvmrc` と `package.json` の `engines.node` で 22.x に固定しています。
バージョン管理ツールを使っている場合は、プロジェクトルートで以下を実行してください。

| Tool | Command        | URL                           |
| ---- | -------------- | ----------------------------- |
| nvm  | `nvm use`      | https://github.com/nvm-sh/nvm |
| fnm  | `fnm use`      | https://github.com/Schniz/fnm |
| mise | `mise install` | https://github.com/jdx/mise   |

### セットアップ

```bash
npm install
```

### 環境変数

開発時はプロジェクトルートに `.env` を置くと、Webpack設定から読み込まれます。

```dotenv
# TogoVar API endpoint
TOGOVAR_FRONTEND_API_URL=https://grch38.togovar.org

# Reference genome: GRCh37 or GRCh38
TOGOVAR_REFERENCE=GRCh38

# Site origin used for canonical URL, sitemap.xml, JSON-LD
# 未設定の場合、TOGOVAR_REFERENCE に応じて https://grch37.togovar.org / https://grch38.togovar.org を使う
TOGOVAR_SITE_ORIGIN=http://localhost:8000

# Optional: stanza base URL
TOGOVAR_FRONTEND_STANZA_URL=https://grch38.togovar.org/stanza

# Optional: endpoints passed to report/stanza configuration
TOGOVAR_ENDPOINT_SPARQL=https://grch38.togovar.org/sparql
TOGOVAR_ENDPOINT_SPARQLIST=https://grch38.togovar.org/sparqlist
TOGOVAR_ENDPOINT_SEARCH=https://grch38.togovar.org/search
TOGOVAR_ENDPOINT_JBROWSE=https://grch38.togovar.org/jbrowse
```

よく使う最小構成は以下です。

```dotenv
TOGOVAR_FRONTEND_API_URL=https://grch38.togovar.org
TOGOVAR_REFERENCE=GRCh38
```

### 開発サーバー

ローカルで画面を確認する場合は、webpack-dev-server を起動します。

```bash
npm run dev
```

起動後、以下の URL にアクセスしてください。

```txt
http://localhost:8000/
```

`/variant/tgv418765796` などのレポートページも、開発サーバーが対応する静的 HTML に fallback して表示します。

### 本番ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に生成されます。
ビルド時には、参照ゲノムに応じたドキュメントページ、`robots.txt`、`sitemap.xml` も生成されます。

### デプロイ運用メモ

`npm run build` で `dist/` を生成し、nginx などの静的ファイルサーバーが配信します。Express サーバー（`app/frontend/server/`）は削除済みです。

このリポジトリ内では、以前 `app/frontend/server/middlewares/securityHeaders.js` が付与していたセキュリティヘッダーは設定されません。静的配信へ移したため、CSP、HSTS、COOP、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` などは nginx / CDN / edge / 外部デプロイ設定側で管理してください。

テンプレートには `app/frontend/views/layouts/application.pug` などのインライン script が残っています。配信側で CSP を厳格にする場合は、`script-src` で `'unsafe-inline'` を許可する、script hash を付与する、インライン script を外部ファイルへ移すなど、静的配信に合う方針を選んでください。Express の nonce 注入は削除済みです。

実デプロイの Dockerfile、Compose、nginx 設定、起動コマンドはこのリポジトリ外で管理されている可能性があります。配信方式やヘッダーを変える場合は、外部のデプロイ設定も合わせて確認してください。

GitHub Pages ワークフロー（`.github/workflows/publish.yml`）も `npm run build` 後に `dist/` を公開するだけです。Docker 運用については [togovar-docker](https://github.com/togovar/togovar-docker) を参照してください。

## 検証

このリポジトリには `npm run check` は定義されていません。
変更後は可能な範囲で以下を実行してください。

```bash
npm run lint
npm run build
```

個別に確認する場合:

```bash
npm run lint:eslint
npm run lint:css
npm run typecheck
```

補足:

- `npm run lint` は JavaScript/TypeScript と SCSS/CSS の lint をまとめて実行します。
- `npm run typecheck` は TypeScript の型チェックのみを実行します（ビルドは行いません）。
- 環境によって `node` / `npm` が PATH に無い場合があります。その場合は Node.js 22.x を有効化してください。

### API 仕様との整合性チェック

`search_conditions.json`・`advanced_search_conditions.json` の consequence または type 定義を変更した場合、または TogoVar API の仕様が更新された場合は、以下を実行してください。

```bash
python3 scripts/check_conditions.py              # GRCh38（デフォルト）
python3 scripts/check_conditions.py --build GRCh37
```

`scripts/GRCh38/openapi.yaml`（TogoVar API の Swagger 仕様）から consequence・type の両 term を自動抽出し、`search_conditions.json` と `advanced_search_conditions.json` の両方と整合性を検証します。API 仕様が変わった場合は `openapi.yaml` を差し替えてからこのスクリプトを実行してください。Python 3 標準ライブラリのみで動作します（追加インストール不要）。

## Advanced Search

Advanced Search は、条件行と AND/OR グループを組み合わせて検索クエリを作ります。

主な関連ファイル:

```txt
app/frontend/src/components/AdvancedSearch/AdvancedSearchBuilderView.ts
app/frontend/src/components/AdvancedSearch/AdvancedSearchSelection.ts
app/frontend/src/components/AdvancedSearch/AdvancedSearchToolbar.ts
app/frontend/src/components/AdvancedSearch/AdvancedSearchConditionRestorer.ts
app/frontend/src/components/Condition/
app/frontend/src/components/Condition/queryBuilders/
app/frontend/src/store/searchManager.ts
app/frontend/src/store/advancedSearchURL.ts
```

### URL共有

Advanced Search の条件は URL に保存できます。

```txt
/?mode=advanced&q=<Base64 encoded JSON>
```

処理の流れ:

1. 条件オブジェクトを `JSON.stringify()` する
2. `btoa()` で Base64 へ変換する
3. `encodeURIComponent()` して `q` パラメータへ入れる
4. ページ読み込み時に `q` をデコードして Store へ復元する
5. `AdvancedSearchConditionRestorer` が Store の条件を UI へ戻す

URLに載せる条件JSONは 2000 文字を上限にしています。
上限を超えた場合、検索自体は実行しますが URL には `?mode=advanced` のみを反映します。

## Simple Search

Simple Search の条件は、フラットなURLクエリとして反映されます。

主な関連ファイル:

```txt
app/frontend/src/components/SearchField/
app/frontend/src/components/SideBar.ts
app/frontend/src/components/PanelView/
app/frontend/src/store/searchManager.ts
app/frontend/src/api/fetchData.ts
```

Simple Search と Advanced Search はどちらも `StoreManager` を経由して検索状態を更新し、`executeSearch()` で API リクエストを行います。

## 参照ゲノム

`TOGOVAR_REFERENCE` によって、参照ゲノム別のデータと生成ページが切り替わります。

| 値       | 主なデータ                     |
| -------- | ------------------------------ |
| `GRCh37` | `app/frontend/assets/GRCh37/*` |
| `GRCh38` | `app/frontend/assets/GRCh38/*` |

検索条件マスタは以下にあります。

```txt
app/frontend/assets/GRCh37/advanced_search_conditions.json
app/frontend/assets/GRCh38/advanced_search_conditions.json
app/frontend/assets/GRCh37/search_conditions.json
app/frontend/assets/GRCh38/search_conditions.json
```

Advanced Search の一部の選択肢は、TypeScript のクエリ型でも扱います。
`app/frontend/src/advancedCondition.ts` は Advanced Search 条件ID、relation可否、dataset名などの型定義元です。
`advanced_search_conditions.json` に dataset を追加した場合は、必要に応じて `advancedCondition.ts` の `FREQUENCY_DATASETS` も更新します。
Simple Search の `search_conditions.json` だけを変更する場合は、通常 `advancedCondition.ts` の更新は不要です。

### advanced_search_conditions.json の構造

各条件には `"type"` フィールドがあり、フロントエンドのUI描画方法を決定します。このフィールドは手動設定が必要です。

| type | UI | 該当条件 |
| ------------- | ------------------------------------------- | ------------------------------------- |
| `"peculiar"`  | 専用の特殊UI（ツリー選択・座標入力・スライダー）| dataset, genotype, location, variant_effect_prediction |
| `"enumeration"` | チェックボックスのリスト | significance, sscv_db, type |
| `"tree"` | 数値IDで参照する階層ツリー | consequence |
| `"text"` | テキスト入力 | disease, gene, id |

`"genotype"` 条件には、ジェノタイプカウント検索（Alt/Alt・Ref/Alt・Ref/Ref の件数絞り込み）をサポートするデータセットのみを列挙します。gnomAD や GEM-J WGA など対応していないデータセットは含まれないため、`"dataset"` 条件のサブセットになります。

`"dataset"` と `"genotype"` の `values` はツリー構造（`children` を持つ入れ子）で、**ラベルとツリー構造は手動管理**です。`openapi.yaml` が持つのは値キー（`value` フィールド）のみです。整合性の確認には `python3 scripts/check_conditions.py` を使います。

## API通信

検索とダウンロードは TogoVar API にリクエストします。

主な関連ファイル:

```txt
app/frontend/src/api/searchExecutor.ts
app/frontend/src/api/searchRequest.ts
app/frontend/src/api/searchResponse.ts
app/frontend/src/components/DownloadButton.ts
app/frontend/src/global.ts
```

- Simple Search は現在、GET リクエストで検索条件をクエリパラメータに展開します。
- Advanced Search は `/api/search/variant` へ POST し、`body.query` に条件オブジェクトを入れます。
- ダウンロードは現在の検索モードに応じて、Simple / Advanced の条件を送ります。

## ドキュメントページ

ドキュメントページは `app/frontend/views/doc/` にあります。

```txt
app/frontend/views/doc/en/
app/frontend/views/doc/ja/
```

Webpack設定で、`TOGOVAR_REFERENCE` に応じたページ一覧を `dist/doc/...` へ生成します。
英語ページは `/doc/{name}/`、日本語ページは `/doc/ja/{name}/` に出力されます。

## Docker

Docker を使った開発・運用については [togovar-docker](https://github.com/togovar/togovar-docker) を参照してください。

## README と AGENTS の分担

READMEに書くもの:

- アプリ概要
- ローカル開発手順
- 環境変数
- 検索やURL共有など、人間向けの仕様説明
- ビルド・検証・運用手順

AGENTSに書くもの:

- AIが実装時に守るべき設計方針
- 変更時の判断基準
- 間違えやすいデータ名・URL仕様・API方針
- コード配置ルール
