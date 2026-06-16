# AGENTS.md

このファイルはAIエージェント向けの作業指示です。人間向けの詳しい説明、セットアップ、運用手順は原則 `README.md` に書いてください。

## 役割分担

- `AGENTS.md`: AIが実装時に守る設計方針、作業ルール、判断基準、間違えやすい仕様を書く。
- `README.md`: アプリ概要、開発手順、環境変数、起動手順、デプロイ手順、画面説明、トラブルシューティングを書く。
- 技術スタック、ディレクトリ構成、URL仕様、検索条件データ構造、API方針を変えた場合は、`AGENTS.md` と `README.md` の更新要否を確認する。
- 小さなUI調整や一時的な実験だけなら、ドキュメント更新は必須ではない。

## 作業ルール

- `AGENTS.md` だけを根拠にせず、変更前に必ず該当ファイルと周辺の呼び出し元を読む。
- 既存の設計、命名、TypeScript/JavaScript混在方針、Sass/SCSS構成、Store/API層の使い方に合わせる。
- ユーザーの未コミット変更を勝手に戻さない。
- 生成物や依存関係の大きな更新は、明確に必要な場合だけ行う。
- 依存を移動・追加・削除する場合は、実行時依存かビルド時依存かを確認し、`package.json` と `package-lock.json` を揃える。

## 技術スタック

| レイヤー         | 技術                                           |
| ---------------- | ---------------------------------------------- |
| フロントエンド   | TypeScript / JavaScript / Lit / Web Components |
| ビルド           | Webpack 5 / ts-loader                          |
| スタイル         | Sass / SCSS / CSS                              |
| テンプレート     | Pug                                            |
| サーバー         | nginx などの静的ファイルサーバー               |
| バックエンド連携 | TogoVar API                                    |
| パッケージ       | npm                                            |

- Node.js は `22.x` 前提。`.nvmrc` と `package.json` の `engines.node` を確認する。
- `tsconfig.json` は `strict: true` かつ `allowJs: true`。既存JSとTSが共存しているため、周辺ファイルの粒度に合わせて変更する。
- 型チェックは `npm run typecheck`（= `tsc --noEmit`）で確認する。

## ディレクトリ方針

```txt
app/frontend/
  assets/        参照ゲノム別JSONなどの静的データ
  config/        Webpack設定
  packs/         エントリポイント
  src/
    api/         API通信
    components/  UIコンポーネント・画面部品
      AdvancedSearch/   Advanced Search全体制御
      Condition/        条件入力UI・クエリ変換
        ConditionDiseaseSearch/                  疾患検索Lit要素
        ConditionPathogenicityPredictionSearch/  病原性予測検索Lit要素
        ConditionValueEditor/                    条件値入力UI
        queryBuilders/                           条件→APIクエリ変換
      Karyotype/        染色体ビジュアライズ
      PanelView/        サイドバーパネル
      Results/          検索結果テーブル
      SearchField/      検索入力フィールド・サジェスト
    store/       StoreManagerと検索条件管理
    types/       グローバル型定義
    utils/       汎用ヘルパー
  stylesheets/   Sass/SCSS
  views/         Pugテンプレート
```

- UIクラス・Web Componentsは `app/frontend/src/components/` に置く。Lit使用の有無では分けない。
- Advanced Search 本体の制御ファイルは `app/frontend/src/components/AdvancedSearch/` に置く。
- StoreやURL反映など、アプリ状態に関わる処理は `app/frontend/src/store/` に置く。
- DOM生成の小さな共通処理は `app/frontend/src/utils/dom/` の既存ヘルパーを優先する。
- 参照ゲノム別の検索条件マスタは `app/frontend/assets/GRCh37` / `app/frontend/assets/GRCh38` を確認する。
- PugテンプレートやSass/SCSSの構成を変える場合は、関連する `app/frontend/views/` と `app/frontend/stylesheets/` の両方を確認する。

## デプロイ / 配信方針

- `npm run build` で `dist/` を生成し、nginx などの静的ファイルサーバーが配信する構成として扱う。
- GitHub Pages向けの `.github/workflows/publish.yml` も `npm run build` 後に `dist/` を公開するだけ。
- フロントエンド用 Express サーバー（`app/frontend/server/`）は削除済み。ビルド出力のみが成果物。
- Express削除により、CSP/HSTS/COOPなどのセキュリティヘッダーはこのリポジトリ内では付与されない。配信側（nginx/CDN/edge/外部Docker設定）で管理する前提で、ヘッダー方針を変える場合はREADMEと外部デプロイ設定の確認を促す。
- `__CSP_NONCE__` のようなサーバー差し替え前提のプレースホルダーは使わない。静的配信で必要なCSPは nonce 注入ではなく、配信側のCSP設計として扱う。

## Advanced Search 方針

- Advanced Search のUIは主に以下で構成される。
  - `components/AdvancedSearch/AdvancedSearchBuilderView.ts`: 全体管理、条件変更、検索条件送信
  - `components/AdvancedSearch/AdvancedSearchSelection.ts`: 条件Viewの選択状態管理
  - `components/AdvancedSearch/AdvancedSearchToolbar.ts`: ツールバーDOMとコマンド委譲
  - `components/Condition/ConditionGroupView.ts`: AND/ORグループ
  - `components/Condition/ConditionItemView.ts`: 1条件行
  - `components/Condition/ConditionValues.ts` と `components/Condition/ConditionValueEditor/*`: 条件入力UI
- 条件の検索クエリ化は `components/Condition/queryBuilders/` に集約する。
- Advanced Search のURL共有は `?mode=advanced&q=<Base64 JSON>` を使う。
- encode/decode処理は `app/frontend/src/store/advancedSearchURL.ts` に集約する。
- URLから復元した条件をViewへ戻す処理は `components/AdvancedSearch/AdvancedSearchConditionRestorer.ts` を確認する。
- Base64はURL中で壊れやすいため、生成時は `encodeURIComponent` を通す。
- `setAdvancedSearchCondition()` は検索条件をStoreへ保存し、URLへ反映し、検索を実行する。呼び出しタイミングを増やす場合は二重検索に注意する。
- 条件UIを変更した場合は、検索クエリ、URL共有、URL復元の3点が同じ構造を扱えるか確認する。

## Store / API 方針

- アプリ状態は `app/frontend/src/store/StoreManager.ts` を正として扱う。
- 検索条件のURL反映や初期復元は `app/frontend/src/store/searchManager.ts` と `initializeApp.ts` を確認する。
- API通信は `app/frontend/src/api/fetchData.ts` など既存API層に合わせる。
- 検索リクエストのURL・HTTPオプション生成は `app/frontend/src/api/searchRequest.ts` に置き、`fetchData.ts` は取得実行、レスポンス処理、Store反映に集中させる。
- 検索実行中のAbortController、進行中フラグ、取得済みrange管理、初回検索リセットは `app/frontend/src/api/searchExecutionState.ts` に置く。
- 検索APIリクエスト開始/完了時のloading制御、Abort時の無視、全体完了時のStore更新は `app/frontend/src/api/searchCompletion.ts` に置く。
- 検索APIのHTTP fetchとHTTPステータスのエラーコード変換は `app/frontend/src/api/searchFetch.ts` に置く。
- 検索APIレスポンスのdata/stat判定とStore反映は `app/frontend/src/api/searchResponse.ts` に置き、`fetchData.ts` は通信フローに集中させる。
- 検索APIレスポンス内のnotice/warning/errorのStore反映は `app/frontend/src/api/searchMessages.ts` に置く。
- StoreはAPIを直接呼ばない。仮想スクロールで未取得ページが必要な場合も、コンポーネントから `searchManager.requestNextPage()` を呼び、fetch の起動は `searchManager` / `api/fetchData.ts` 側へ集約する。
- 検索条件のブラウザURL反映（`history.pushState`、Simple/Advanced SearchのURL表現、URL長制限時のstate退避）は `store/searchURL.ts` に置き、`searchManager.ts` は検索開始タイミングとStore更新に集中させる。
- popstate時のURL/stateからの検索条件復元は `store/searchHistory.ts` に置く。
- Simple Search条件のdefault差分抽出は `store/simpleSearchConditions.ts` に置く。`api/fetchData.ts` から `searchManager.ts` を import すると循環依存になるため避ける。
- 検索結果配列のマージ・表示indexからのレコード取得・選択行レコード取得は `store/searchResultsState.ts` に置き、`StoreManager.ts` はStore公開APIとpublish順序の管理に集中させる。
- コンポーネントやViewから直接URLやfetchの仕様を増やす前に、既存のStore/API層へ寄せられるか確認する。
- 戻る/進む、URL貼り付け、モード切り替えでは、Store更新と検索実行が重複しやすい。変更時は初期表示・タブ切替・履歴操作を分けて考える。
- searchMode は内部リセットと検索開始副作用の順序が重要なため、通常操作では `storeManager.setSearchMode(mode)` を使う。
- popstate ハンドラ内での searchMode 変更は `pushState` を発火させてしまう。`setSearchModeFromHistory(mode)` を使うことで、popstate 中の pushState を防ぐ。
- `appLoadingStatus` は画面全体の検索状態、`isSearchDataFetching` は検索結果 data 取得中、`isSearchResultsUpdating` は検索結果配列の同期更新中を表す。意味を混ぜず、loading 表示を変更する場合はどの状態を見るべきか先に確認する。

## Advanced Search 型ファイルの分担

`types/conditionBuilder.d.ts`、`types/conditionDefinition.d.ts`、`types/query.d.ts` は役割が異なる。混在させない。

| ファイル | 役割 | 主な型 |
| --- | --- | --- |
| `types/query.d.ts` | Store/API層向け。コンポーネント依存を持たない（PredictionKey のみ例外） | `ConditionQuery`, `ConditionLeaf`, 各Leaf型, `ScoreRange`, `Inequality`, `Relation` |
| `types/conditionBuilder.d.ts` | UIビルダー向け。コンポーネントを import する | `BuildContext`, `BuilderMap`, `ConditionValueEditor`, `EditorCtor`, `PredictionChangeDetail` |
| `types/conditionDefinition.d.ts` | 条件UIマスタデータ向け。`advanced_search_conditions.json` の型 | `ConditionDefinition`, `AdvancedConditionMap`, `GRChConditions`, `TreeNode` |

- `ConditionQuery` は Advanced Search の Store 値の正規型。`storeManager.getData('advancedSearchConditions')` は `ConditionQuery | undefined` を返す。
- `undefined` は「条件なし」を表すセンチネル値であり、`{}` は使わない。
- Store/API層（`store/`, `Karyotype.ts` など）から `ConditionQuery` を参照するときは `types/query.d.ts` を直接 import する。`types/conditionBuilder.d.ts` は参照しない。
- `GeneLeaf.gene.labels` はURL復元用のUIメタ情報。API送信前に `stripAdvancedSearchMetadata()` で除去する。

## TypeScript / JavaScript 方針

- 新規TypeScriptでは `any` を避け、型が曖昧な値は `unknown` から絞り込む。
- `types/*.d.ts` にグローバル型が多い。新しい共有型を足す前に既存型を検索する。
- 既存JSファイルをTSへ変換する場合は、呼び出し元、Webpack設定、型定義への影響を確認する。
- ファイル名だけを `.ts` に変えるのではなく、入力値・戻り値・公開APIを明示してから変換する。
- 既存の import パスを壊さないため、拡張子なし import のまま解決できるか確認する。
- 互換性のために既存の export 名を残す必要がある場合は、命名変更を別差分に分ける。
- DOM要素取得は `selectRequired` / `selectOrNull` / `createEl` など既存ヘルパーを優先する。
- Lit要素のプロパティや `updateComplete` を使う場合は、カスタム要素型を明示して strict TypeScript で扱う。
- `structuredClone` やブラウザAPIを使う場合は、対象環境と既存使用箇所を確認する。

## スタイル方針

- Sass/SCSSは `app/frontend/stylesheets/` の既存レイヤー構成に合わせる。
- コンポーネント固有のSCSSは、既存のWeb Component内 import と同じ形に合わせる。
- 既存CSSに異なる書き方があっても、関連する変更範囲だけ段階的に整える。
- UI状態は、可能なら既存の `data-*` 属性や状態クラスを利用する。
- セレクターを追加する前に、既存の `object/component` / `object/project` に同じ責務のスタイルがないか確認する。
- `app/frontend/stylesheets/foundation/_reset.scss` は**変更禁止**。Josh W. Comeau's CSS Reset の定義をそのまま維持する。
- `tr` に `border` を使うテーブルは、必ずそのテーブルのセレクター自身に `border-collapse: collapse` を明示する。`_reset.scss` には書けないため各コンポーネントで対応する。

## コメント規約

- 新規・更新するコメントは日本語を基本にする。
- コメントは「何をしているか」だけでなく、「なぜその形にしているか」を優先する。
- 単にコードを読み上げるコメントは書かない。
- 全ての公開・非公開の関数、メソッド、getter/setter には必ず「WHY（なぜその形にしているか）」を1行目に日本語で書く。
- 必要なら2行目以降で補足してよいが、1行目のWHYは省略しない。
- リファクタリング時にコメントが古くなったら、コードと一緒に必ず更新する。
- 既存に英語コメントが残っている場合、触った範囲では日本語化を検討する。ただし大規模なコメント翻訳だけの差分は避ける。

## 検証

変更後は可能な範囲で以下を実行する。TS化や依存変更を含む場合は、まず型チェックで小さく確認してから全体検証へ進む。

```bash
npm run typecheck
```

全体確認:

```bash
npm run lint
npm run build
```

必要に応じた個別確認:

```bash
npm run lint:eslint
npm run lint:css
npm run typecheck
```

- このリポジトリには `npm run check` は定義されていない。
- 環境によって `node` / `npm` がPATHに無い場合がある。その場合は実行できなかったことを報告する。
- Rails/バックエンド側を触った場合は、READMEのBackend手順と既存のRubyコマンドを確認する。
