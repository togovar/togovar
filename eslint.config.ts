import { defineConfig } from 'eslint/config';
import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  // ビルド成果物・外部依存・開発サーバーはLint対象外にするため除外する
  {
    ignores: ['dist/', 'node_modules/', 'app/frontend/server/'],
  },

  // ESLint組み込み推奨ルールセット
  eslintJs.configs.recommended,

  // TypeScriptの型情報を活かした推奨ルールセット
  tseslint.configs.recommended,

  // PrettierのフォーマットルールとESLintの競合を防ぐため最後に置く
  eslintConfigPrettier,

  // プロジェクト全体に適用するランタイム環境とルール
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // フロントエンドはブラウザ、webpack設定はNode.jsで動作するため両方を有効にする
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // webpackのDefinePluginでビルド時に注入される定数。型チェックのためreadonlyで宣言する
        TOGOVAR_FRONTEND_REFERENCE: 'readonly',
        TOGOVAR_FRONTEND_API_URL: 'readonly',
        TOGOVAR_STANZA_SPARQL_URL: 'readonly',
        TOGOVAR_STANZA_SPARQLIST_URL: 'readonly',
        TOGOVAR_STANZA_SEARCH_API_URL: 'readonly',
        TOGOVAR_STANZA_JBROWSE_URL: 'readonly',
        TOGOVAR_FRONTEND_STANZA_URL: 'readonly',
      },
    },
    rules: {
      // デバッグ用のconsole残留を防ぐが、ログ・警告・エラー出力は運用上必要なため許容する
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
    },
  },

  // TypeScriptファイル固有のルール
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScriptの型チェックがno-undefを代替するため、JSのルールと二重チェックを避ける
      'no-undef': 'off',
      // TypeScript版の未使用変数ルールを使うため、JSのルールを無効にする
      'no-unused-vars': 'off',
      // _プレフィックスの引数・catch変数・webpackグローバルは意図的に未使用のため無視する
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^TOGOVAR_',
        },
      ],
      // 型拡張のための空インターフェースはTypeScriptで有効なパターンのため許容する
      '@typescript-eslint/no-empty-object-type': 'off',
      // 関数・クラスは巻き上げが自然な利用パターンのため前方参照を許容し、変数のみ制限する
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: false, classes: false, variables: true },
      ],
      // 型情報のみのimportを明示してバンドルサイズを削減するため強制する
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  // JavaScriptファイル固有のルール（TS移行途中のファイルに適用）
  {
    files: ['**/*.js'],
    rules: {
      // _プレフィックスの引数とwebpackグローバルは意図的に未使用のため無視する
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^TOGOVAR_' },
      ],
    },
  }
);
