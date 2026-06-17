import type { Config } from 'stylelint';

const config: Config = {
  extends: [
    'stylelint-config-recommended',
    'stylelint-config-recommended-scss',
    'stylelint-config-recess-order',
  ],
  rules: {
    // プロジェクト独自の命名規則（BEMベース）があり、
    // stylelint のデフォルトパターン（kebab-case 強制）と競合するため無効にする
    'selector-class-pattern': null,

    // クラスと同様に、ID セレクターもプロジェクト側の命名に委ねるため無効にする
    'selector-id-pattern': null,

    // このルールは CSS @import の string/url 形式を制御するもので、
    // Sass の @use / @import の使い分けには適用されないため無効にする
    'import-notation': null,

    // ブラウザ固有の疑似クラス（:focus-visible など）を誤検出しないよう有効にする
    'selector-pseudo-class-no-unknown': true,

    // 疑似要素は :: （ダブルコロン）を使う。: （シングルコロン）は疑似クラス専用。
    // ::before / ::after / ::first-letter など全て対象
    'selector-pseudo-element-colon-notation': 'double',

    // コメント前の空行ルールがプロジェクトの既存スタイルと合わないため無効にする
    'comment-empty-line-before': null,

    // CSS カスタムプロパティの記述スタイルが場所によって異なるため制約しない
    'custom-property-empty-line-before': null,

    // Sass 変数の命名規則はプロジェクト内で統一されており、
    // stylelint のパターン強制は不要なため無効にする
    'scss/dollar-variable-pattern': null,

    // 長い演算式を改行で分割する記述が既存コードにあるため許容する
    'scss/operator-no-newline-after': null,

    // @use 'partial' と書くのが正規形（アンダースコア・拡張子は省略）
    // 旧来の @use '_variables.scss' 記述が残っていても許容する
    'scss/load-no-partial-leading-underscore': null,
  },
  overrides: [
    {
      // .sass（インデント構文）は空ファイルが有効なケースがあるため、
      // no-empty-source を無効にして誤検出を防ぐ
      files: ['**/*.sass'],
      customSyntax: 'postcss-sass',
      rules: {
        'no-empty-source': null,
      },
    },
  ],
};

export default config;
