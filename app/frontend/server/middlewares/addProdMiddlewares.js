const path = require('path');
const express = require('express');
const compression = require('compression');
const fs = require('fs');

// リクエストされたURL自身をcanonical URLとして組み立てる。
// reverse proxy配下では x-forwarded-proto を優先し、https/http の判定を合わせる。
function getCanonicalUrl(req) {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  return `${protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
}

// ビルド済みHTML内のプレースホルダーを、実際にアクセスされたURLへ置き換える。
// /variant/:id, /gene/:id, /disease/:id は同じHTMLを使い回すため、ここでcanonicalを個別化する。
function withCanonicalUrl(html, req) {
  return html.replace(/__TOGOVAR_CANONICAL_URL__/g, getCanonicalUrl(req));
}

// レポート種別に対応するビルド済みHTMLを非同期で読み込む。
function readReportHtml(outputPath, report, callback) {
  fs.readFile(path.resolve(outputPath, report, 'index.html'), 'utf8', callback);
}

// 本番環境用のExpressミドルウェアを追加する。
// dist配下のビルド済みファイルを配信し、レポート詳細ページだけcanonicalを差し替えて返す。
module.exports = function addProdMiddlewares(app, options) {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'dist');

  // レスポンスをgzip圧縮して転送サイズを小さくする。
  // HTMLだけでなく、CSS/JSなどの静的アセットにも適用される。
  app.use(compression());
  app.use(publicPath, express.static(outputPath));

  // 詳細ページはURLごとにcanonicalが違うため、HTML文字列を読み込んで差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    readReportHtml(outputPath, req.params.report, (err, html) => {
      if (err) {
        return res.sendStatus(err.code === 'ENOENT' ? 404 : 500);
      }

      return res.send(withCanonicalUrl(html, req));
    });
  });

  // トップページはビルド済みの dist/index.html をそのまま返す。
  app.get('/', (req, res) => {
    return res.sendFile(path.resolve(outputPath, 'index.html'));
  });
};
