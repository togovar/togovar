const path = require('path');
const express = require('express');
const compression = require('compression');
const fs = require('fs');

const SITE_ORIGINS = {
  GRCh37: 'https://grch37.togovar.org',
  GRCh38: 'https://grch38.togovar.org',
};

const reportHtmlCache = new Map();
const LONG_TERM_CACHE_PATTERN =
  /\.(?:css|js|woff2?|eot|ttf|otf|png|jpe?g|gif|svg|webp|jsonld)$/i;

function getSiteOrigin() {
  return SITE_ORIGINS[process.env.TOGOVAR_REFERENCE] || SITE_ORIGINS.GRCh38;
}

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

// 信頼済みの設定値からcanonical URLを組み立てる。
// Hostやx-forwarded-protoなどのリクエストヘッダーは、canonicalには使わない。
function getCanonicalUrl(req) {
  return `${getSiteOrigin()}${req.originalUrl.split('?')[0]}`;
}

// ビルド済みHTML内のプレースホルダーを、実際にアクセスされたURLへ置き換える。
// /variant/:id, /gene/:id, /disease/:id は同じHTMLを使い回すため、ここでcanonicalを個別化する。
function withCanonicalUrl(html, req) {
  const canonicalUrl = escapeHtmlAttribute(getCanonicalUrl(req));

  return html.replace(
    /__TOGOVAR_CANONICAL_URL__/g,
    () => canonicalUrl
  );
}

// 本番のビルド済みHTMLはデプロイ中に変わらない前提なので、初回読み込み後はメモリに保持する。
function getReportHtml(outputPath, report, callback) {
  const htmlPath = path.resolve(outputPath, report, 'index.html');
  const cachedHtml = reportHtmlCache.get(htmlPath);

  if (cachedHtml) {
    callback(null, cachedHtml);
    return;
  }

  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      callback(err);
      return;
    }

    reportHtmlCache.set(htmlPath, html);
    callback(null, html);
  });
}

function sendReportHtml(outputPath, req, res) {
  getReportHtml(outputPath, req.params.report, (err, html) => {
    if (err) {
      return res.sendStatus(err.code === 'ENOENT' ? 404 : 500);
    }

    res.setHeader('Cache-Control', 'no-cache');
    return res.send(withCanonicalUrl(html, req));
  });
}

function getTrailingSlashUrl(req) {
  return `${req.path}/${req.originalUrl.slice(req.path.length)}`;
}

function isLongTermCacheAsset(filePath) {
  return LONG_TERM_CACHE_PATTERN.test(filePath);
}

function setStaticAssetCacheHeaders(res, filePath) {
  if (isLongTermCacheAsset(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
}

// 本番環境用のExpressミドルウェアを追加する。
// dist配下のビルド済みファイルを配信し、レポート詳細ページだけcanonicalを差し替えて返す。
module.exports = function addProdMiddlewares(app, options) {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'dist');

  // レスポンスをgzip圧縮して転送サイズを小さくする。
  // HTMLだけでなく、CSS/JSなどの静的アセットにも適用される。
  app.use(compression());

  // /variant, /gene, /disease は末尾スラッシュ付きURLへ統一する。
  app.get('/:report(variant|gene|disease)/?', (req, res) => {
    if (!req.path.endsWith('/')) {
      return res.redirect(301, getTrailingSlashUrl(req));
    }

    sendReportHtml(outputPath, req, res);
  });

  // 詳細ページはURLごとにcanonicalが違うため、HTML文字列を読み込んで差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    sendReportHtml(outputPath, req, res);
  });

  app.use(
    publicPath,
    express.static(outputPath, {
      setHeaders: setStaticAssetCacheHeaders,
    })
  );
};
