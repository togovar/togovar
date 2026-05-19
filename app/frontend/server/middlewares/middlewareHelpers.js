/**
 * dev・prod 両ミドルウェアで共通して使うヘルパー関数をまとめたモジュール。
 * canonical URL の組み立てに必要な HTML エスケープ処理と、
 * 末尾スラッシュの付け外しに使う URL 変換処理を提供する。
 */

/**
 * HTML 属性値に埋め込む文字列を安全にエスケープする。
 * XSS を防ぐため、二重引用符・アンパサンド・山括弧を HTML エンティティへ変換する。
 *
 * @param {string} value - エスケープ対象の文字列
 * @returns {string} エスケープ済みの文字列
 */
function escapeHtmlAttribute(value) {
  return value.replace(/["&<>]/g, (char) => {
    switch (char) {
      case '"':
        return '&quot;';
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      default:
        return char;
    }
  });
}

/**
 * ビルド済み HTML 内の canonical URL プレースホルダーを実際の URL へ置き換える。
 * `/variant/:id`・`/gene/:id`・`/disease/:id` は同じ HTML を使い回すため、
 * リクエストごとに canonical を差し替えて返す。
 *
 * @param {string} html - プレースホルダーを含む HTML 文字列
 * @param {string} canonicalUrl - 差し替える canonical URL（未エスケープ）
 * @returns {string} canonical URL を埋め込んだ HTML 文字列
 */
function withCanonicalUrl(html, canonicalUrl) {
  const escaped = escapeHtmlAttribute(canonicalUrl);
  return html.replace(/__TOGOVAR_CANONICAL_URL__/g, () => escaped);
}

/**
 * 末尾スラッシュなし URL を、末尾スラッシュあり URL へ変換する。
 * `/variant`・`/gene`・`/disease` へのアクセスを `/variant/` 形式へ統一するときに使う。
 * クエリ文字列はそのまま引き継ぐ。
 *
 * @param {import('express').Request} req - Express リクエストオブジェクト
 * @returns {string} 末尾スラッシュを付加した URL 文字列
 */
function getTrailingSlashUrl(req) {
  return `${req.path}/${req.originalUrl.slice(req.path.length)}`;
}

/**
 * 末尾スラッシュあり URL を、末尾スラッシュなし URL へ変換する。
 * `/:id/` へのアクセスを `/:id` 形式へ統一するときに使う。
 * クエリ文字列はそのまま引き継ぐ。
 *
 * @param {import('express').Request} req - Express リクエストオブジェクト
 * @returns {string} 末尾スラッシュを除去した URL 文字列
 */
function getNoTrailingSlashUrl(req) {
  const queryString = req.originalUrl.slice(req.path.length);
  return `${req.path.replace(/\/+$/, '')}${queryString}`;
}

module.exports = {
  withCanonicalUrl,
  getTrailingSlashUrl,
  getNoTrailingSlashUrl,
};
