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
  packs/         Webpackエントリポイント（header.ts: 全ページ共通ヘッダー、index.ts: 主にHome、report/index.ts: レポート）
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
      project/         画面・機能固有スタイル
                       例: _results.scss, _detail.scss, _global-header.scss
      utility/         ヘルパークラス（状態・表示補助）
    web-components/    Lit 要素が直接 import する Shadow DOM 用 SCSS
                       例: tab-view, prediction-range-slider, frequency-block-view
  views/         Pugテンプレート
dist/             ビルド出力
```

CSSクラスの命名は RSCSS を基本方針にしています。具体的な命名・配置ルールは [AGENTS.md](./AGENTS.md) の「スタイル方針」を参照してください。

## ローカル開発

### 必要なもの

- Node.js 26.12.1 以上の 26.x
- npm

Node.js の開発・CI環境は `.nvmrc` で 26.12.1 に固定し、`package.json` の `engines.node` で 26.12.1 以上の 26.x を指定しています。nvm を使う場合は `nvm install && nvm use` でインストールして切り替えてください。
`.npmrc` で `engine-strict=true` を設定しているため、古いバージョンでは `npm ci` / `npm install` が `EBADENGINE` エラーで止まります。その場合は Node.js を更新してください。
バージョン管理ツールを使っている場合は、プロジェクトルートで以下を実行してください（`.nvmrc` で指定したバージョンがインストールされます）。

| Tool | Command                     | URL                           |
| ---- | --------------------------- | ----------------------------- |
| nvm  | `nvm install`               | https://github.com/nvm-sh/nvm |
| fnm  | `fnm install && fnm use`    | https://github.com/Schniz/fnm |
| mise | `mise install`              | https://github.com/jdx/mise   |

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

開発サーバーでは、`TOGOVAR_ENDPOINT_SPARQLIST` に `http://localhost:3000` などのローカルURLを指定した場合、ブラウザへは `/sparqlist` として渡し、webpack-dev-server がローカルSPARQListへプロキシします。これにより、stanza からの取得時に `localhost:8000` と `localhost:3000` のオリジン差で CORS エラーになることを避けます。

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

`app/frontend/config/` の Webpack 設定（エントリポイントなど）を変更した場合は、開発サーバーを停止して `npm run dev` で再起動してください。起動済みのサーバーには設定変更が自動反映されません。

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
npm run typecheck
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
- 環境によって `node` / `npm` が PATH に無い場合があります。その場合は Node.js 26.x（26.12.1 以上）を有効化してください。

### API 仕様との整合性チェック

`search_conditions.json`・`advanced_search_conditions.json` の検証対象定義（consequence・type・significance・sscv_db・dataset・genotype）を変更した場合、または TogoVar API の仕様（参照ゲノム別の `openapi.yaml`）が更新された場合は、以下を実行してください。

```bash
python3 scripts/check_conditions.py              # GRCh38（デフォルト）
python3 scripts/check_conditions.py --build GRCh37
```

参照ゲノム別の `scripts/<BUILD>/openapi.yaml`（TogoVar API の Swagger 仕様）を使い、consequence・type・significance・sscv_db・dataset、およびgenotypeのデータセット定義を検証します。GRCh38はデフォルト、GRCh37は `--build GRCh37` で選択します。API仕様が変わった場合は、対象ゲノムの仕様ファイルとJSONを手動で更新してから検証してください。スクリプトはJSONを自動更新せず、Python 3標準ライブラリのみで動作します。

## 検索結果画面

- Columnsメニューで列の表示・非表示と並び順を変更できます。
- 列境界のドラッグで幅を変更し、ダブルクリックで内容に合わせて調整できます。一部の列は初期幅を維持します。自動調整では、手動変更した列幅を優先します。
- ダウンロードには検索条件が必要です。検索結果総件数が100,000件を超える場合はボタンを無効にし、理由を表示します。画面に取得できる件数とは別の上限です。
- 件数表示の下に、検索した遺伝子・疾患のレポートページ（Gene report / Disease report）へのリンクを表示します。Simple Searchでは取得済みの結果に含まれる遺伝子名・別名・疾患名と検索語を照合し、Advanced Searchでは遺伝子・疾患条件（除外条件を除く）から作ります。種類ごとに最大10件を表示し、残りは件数だけを示します。
- 利用者の検索操作で結果が1件になった場合は、バリアント詳細ページへ自動遷移します。遷移先URLを生成できない場合は一覧に留まります。戻る操作や初期表示・履歴復元では再度自動遷移しません。
- TogoVar IDがないバリアントは、染色体・座標・REF・ALTによるlocus形式のURLで詳細ページを開きます。表示できる情報は、各Stanzaとデータ提供APIの対応状況に依存します。

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
app/frontend/src/store/search/searchManager.ts
app/frontend/src/store/search/advancedSearchURL.ts
```

### URL共有

Advanced Search の条件は URL に保存できます。常に圧縮形式の `qz` を使用します。

```txt
/?mode=advanced&qz=<compressed Base64URL JSON>
```

処理の流れ:

1. 条件オブジェクトを `JSON.stringify()` する
2. ブラウザ標準の Compression Streams API で圧縮し、Base64URL へ変換して `qz` パラメータへ入れる
3. ページ読み込み時に `qz` をデコードして Store へ復元する
4. `AdvancedSearchConditionRestorer` が Store の条件を UI へ戻す

条件が長すぎる場合、またはブラウザが Compression Streams API に対応しておらず `qz` を発行できない場合、検索自体は実行しますが URL には `?mode=advanced` のみを反映し、条件は `history.state`（ブラウザの戻る/進む用の内部状態）へ退避します。共有URL自体には載りませんが、同一ブラウザでの戻る/進む・リロードでは条件を復元できます。

URLに保存できなかった場合は警告を表示します。`history.state`は共有URLの一部ではないため、別のブラウザで開いても退避した条件は復元されません。URLで共有するのは検索条件であり、データ更新や認証状態によって検索結果は変わる場合があります。

## Simple Search

Simple Search の共有URLは、キーワードを `term` パラメータへそのまま反映し、フィルタ条件だけを圧縮形式の `filter` パラメータへ反映します。

```txt
/?mode=simple&term=rs671
/?mode=simple&filter=<compressed Base64URL JSON>
/?mode=simple&term=rs671&filter=<compressed Base64URL JSON>
```

従来のフラットなURLクエリ（例: `dataset[jga_wgs]=0`）は、互換性維持のため読み込み時には引き続き復元できます。

フィルタ条件が長すぎる場合、またはブラウザが Compression Streams API に対応しておらず `filter` を発行できない場合、検索自体は実行しますが URL には `?mode=simple` と `term` のみを反映し、Advanced Searchと同様に条件全体は `history.state` へ退避します。`term` 自体が長すぎる場合は `term` はURLには反映されません（`filter` は生成できれば反映されます）。`term` と `filter` のどちらもURLに載せられない場合は `?mode=simple` のみになります。

チェックボックス形式のフィルターは、すべて未選択の場合に「絞り込みなし」として扱います。各フィルターパネルはタイトルから折りたためます。これはサイドバー全体の幅を縮小する機能とは異なります。

主な関連ファイル:

```txt
app/frontend/src/components/SearchField/
app/frontend/src/components/SideBar.ts
app/frontend/src/components/PanelView/
app/frontend/src/store/search/searchManager.ts
app/frontend/src/store/search/searchURL.ts
app/frontend/src/store/search/searchHistory.ts
app/frontend/src/store/search/simpleSearchURL.ts
app/frontend/src/api/searchExecutor.ts
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
| `"peculiar"`  | 専用の特殊UI（ツリー選択・座標入力・スライダー）| dataset, genotype, location, deleteriousness_prediction |
| `"enumeration"` | チェックボックスのリスト | significance, sscv_db（GRCh38のみ）, type |
| `"tree"` | 文字列IDで参照する階層ツリー | consequence |
| `"text"` | テキスト入力 | disease, gene, id |

`"genotype"` 条件には、ジェノタイプカウント検索をサポートするデータセットのみを列挙し、`"dataset"` 条件のサブセットとします。現在の入力UIはAlt/Alt（`aac`）・Alt/Ref（`arc`）・Hemi_Alt（`hac`）に対応しています。APIやクエリ型の対応項目と、UIで入力できる項目は区別してください。

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

## レポートページと外部Stanza

Stanzaの定義は `app/frontend/assets/stanza.json` にあります。`scriptUrl`がある場合はそのURLを使い、省略時は `TOGOVAR_FRONTEND_STANZA_URL`、未設定なら `https://togovar.github.io/stanza` から読み込みます。`references`で対象外になっている参照ゲノムではセクションを非表示にしますが、scriptの読み込み失敗だけではセクションを隠しません。

CREはGRCh38のみが対象で、scriptとSPARQListの配信先を個別に指定しています。共通の環境変数を変更しても、明示された配信先は切り替わりません。

レポートのpagination-tableは外部Stanzaです。表示・検索・ソート用JSONの拡張には、Stanza本体とデータ提供APIの対応確認が必要で、このリポジトリの設定変更だけでは完結しません。

## Issue管理

未実装項目・仕様確認・受入確認はtogovar/meeting の GitHub Issuesで管理し、READMEやAGENTSには進捗表を持たせません。コード上の実装、対象ブランチへの取り込み、実画面での確認、本番反映は別々に記録してください。

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
