# AGENTS.md

このファイルはAIエージェント向けの作業指示です。

- `AGENTS.md`: AIが間違えないための短い設計指示、作業ルール、判断基準を書く
- `README.md`: 人間が理解・運用するための詳しい説明、セットアップ、運用手順を書く

人間向けの詳しい説明を追加したい場合は、原則 `README.md` に書いてください。
設計判断・実装時の注意・AIに守ってほしいルールは `AGENTS.md` に書いてください。

## 作業ルール

- `AGENTS.md` だけを根拠にせず、変更前に必ず該当ファイルと周辺の呼び出し元を読む。
- 既存の設計・命名・TypeScript/JavaScript混在方針・Sass構成・Store/API層の使い方に合わせる。
- ユーザーの未コミット変更を勝手に戻さない。
- 生成物や依存関係の大きな更新は、明確に必要な場合だけ行う。
- 技術スタック、ディレクトリ構成、URL仕様、検索条件データ構造、API方針を変えた場合は、`AGENTS.md` と `README.md` の更新要否を確認する。
- 小さなUI調整や一時的な実験だけなら、ドキュメント更新は必須ではない。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| フロントエンド | TypeScript / JavaScript / Lit / Web Components |
| ビルド | Webpack 5 / ts-loader / Babel |
| スタイル | Sass / SCSS / CSS |
| テンプレート | Pug |
| サーバー | Node.js / Express系フロントエンドサーバー |
| バックエンド連携 | TogoVar API |
| パッケージ | npm |

補足:

- Node.js は `22.x` 前提。`.nvmrc` と `package.json` の `engines.node` を確認する。
- `tsconfig.json` は `strict: true` だが `allowJs: true`。既存JSとTSが共存しているため、周辺ファイルの粒度に合わせて変更する。

## 重要なディレクトリ方針

```txt
app/frontend/
  assets/        参照ゲノム別JSONなどの静的データ
  config/        Webpack設定
  packs/         エントリポイント
  server/        開発/本番フロントエンドサーバー
  src/
    api/         API通信
    classes/     既存Viewクラス、画面部品、検索UI
    components/  Lit/Web Components
    store/       StoreManagerと検索条件管理
    types/       グローバル型定義
    utils/       汎用ヘルパー
  stylesheets/   Sass/SCSS
  views/         Pugテンプレート
```

- 既存のViewクラスは `app/frontend/src/classes/` に置く。
- Advanced Search 本体の制御ファイルは `app/frontend/src/classes/AdvancedSearch/` に置く。
- Lit/Web Components は `app/frontend/src/components/` に置く。
- StoreやURL反映など、アプリ状態に関わる処理は `app/frontend/src/store/` に置く。
- DOM生成の小さな共通処理は `app/frontend/src/utils/dom/` の既存ヘルパーを優先する。
- 参照ゲノム別の検索条件マスタは `app/frontend/assets/GRCh37` / `app/frontend/assets/GRCh38` を確認する。
- PugテンプレートやSassの構成を変える場合は、関連する `views/` と `stylesheets/` の両方を確認する。

## Advanced Search 方針

- Advanced Search のUIは主に以下で構成される。
  - `classes/AdvancedSearch/AdvancedSearchBuilderView.ts`: 全体管理、条件変更、検索条件送信
  - `classes/AdvancedSearch/AdvancedSearchSelection.ts`: 条件Viewの選択状態管理
  - `classes/AdvancedSearch/AdvancedSearchToolbar.ts`: ツールバーDOMとコマンド委譲
  - `ConditionGroupView.ts`: AND/ORグループ
  - `ConditionItemView.ts`: 1条件行
  - `ConditionValues.ts` と `ConditionValueEditor/*`: 条件入力UI
- 条件の検索クエリ化は `classes/Condition/queryBuilders/` に集約する。
- Advanced Search のURL共有は `?mode=advanced&q=<Base64 JSON>` を使う。
  - encode/decode処理は `app/frontend/src/store/advancedSearchURL.ts` に集約する。
  - URLから復元した条件をViewへ戻す処理は `classes/AdvancedSearch/AdvancedSearchConditionRestorer.ts` を確認する。
  - Base64はURL中で壊れやすいため、生成時は `encodeURIComponent` を通す。
- `setAdvancedSearchCondition()` は検索条件をStoreへ保存し、URLへ反映し、検索を実行する。呼び出しタイミングを増やす場合は二重検索に注意する。
- 条件UIを変更した場合は、検索クエリ、URL共有、URL復元の3点が同じ構造を扱えるか確認する。

## Store / API 方針

- アプリ状態は `app/frontend/src/store/StoreManager.ts` を正として扱う。
- 検索条件のURL反映や初期復元は `app/frontend/src/store/searchManager.ts` と `initializeApp.ts` を確認する。
- API通信は `app/frontend/src/api/fetchData.ts` など既存API層に合わせる。
- コンポーネントやViewから直接URLやfetchの仕様を増やす前に、既存のStore/API層へ寄せられるか確認する。
- 戻る/進む、URL貼り付け、モード切り替えでは、Store更新と検索実行が重複しやすい。変更時は初期表示・タブ切替・履歴操作を分けて考える。

## TypeScript / JavaScript 方針

- 新規TypeScriptでは `any` を避け、型が曖昧な値は `unknown` から絞り込む。
- `types/*.d.ts` にグローバル型が多い。新しい共有型を足す前に既存型を検索する。
- 既存JSファイルを無理にTSへ変換しない。変換する場合は影響範囲とWebpack設定を確認する。
- DOM要素取得は `selectRequired` / `selectOrNull` / `createEl` など既存ヘルパーを優先する。
- Lit要素のプロパティや `updateComplete` を使う場合は、カスタム要素型を明示して strict TypeScript で扱う。
- `structuredClone` やブラウザAPIを使う場合は、対象環境と既存使用箇所を確認する。

## スタイル方針

- Sass/SCSSは `app/frontend/stylesheets/` の既存レイヤー構成に合わせる。
- コンポーネント固有のSCSSは、既存のWeb Component内 import と同じ形に合わせる。
- 既存CSSに異なる書き方があっても、関連する変更範囲だけ段階的に整える。
- UI状態は、可能なら既存の `data-*` 属性や状態クラスを利用する。
- セレクターを追加する前に、既存の `object/component` / `object/project` に同じ責務のスタイルがないか確認する。

## コメント規約

- 新規・更新するコメントは日本語を基本にする。
- コメントは「何をしているか」だけでなく、「なぜその形にしているか」を優先する。
- 単にコードを読み上げるコメントは書かない。
- リファクタリング時にコメントが古くなったら、コードと一緒に必ず更新する。
- 既存に英語コメントが残っている場合、触った範囲では日本語化を検討する。ただし大規模なコメント翻訳だけの差分は避ける。

## 検証

変更後は可能な範囲で以下を実行する。

```bash
npm run lint
npm run build
```

個別に確認する場合:

```bash
npm run lint:js
npm run lint:css
./node_modules/.bin/tsc --noEmit
```

注意:

- このリポジトリには `npm run check` は定義されていない。
- 環境によって `node` / `npm` がPATHに無い場合がある。その場合は実行できなかったことを報告する。
- Rails/バックエンド側を触った場合は、READMEのBackend手順と既存のRubyコマンドを確認する。

## READMEとの分担

READMEに書くもの:

- アプリ概要
- ローカル開発手順
- 環境変数
- バックエンド/フロントエンドの起動手順
- デプロイ手順
- 人間向けの詳しい画面説明
- トラブルシューティング

AGENTSに書くもの:

- AIが実装時に守るべき設計方針
- 変更時の判断基準
- 間違えやすいデータ名・URL仕様・API方針
- コード配置ルール
