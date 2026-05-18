const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

function createWebpackMiddleware(compiler, publicPath) {
  return webpackDevMiddleware(compiler, {
    publicPath,
    stats: 'errors-only',
  });
}

function getCanonicalUrl(req) {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  return `${protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
}

// 詳細ページ用HTML内のプレースホルダーを、アクセスされたURL自身のcanonicalへ置き換える。
function withCanonicalUrl(html, req) {
  return html.replace(/__TOGOVAR_CANONICAL_URL__/g, getCanonicalUrl(req));
}

module.exports = function addDevMiddlewares(app, webpackConfig) {
  // 開発中はwebpackのビルド結果をディスクではなくメモリ上に作る。
  const compiler = webpack(webpackConfig);
  const middleware = createWebpackMiddleware(
    compiler,
    webpackConfig.output.publicPath
  );

  const publicPath = webpackConfig.output.publicPath || '/';
  const outputPath =
    webpackConfig.output.path || path.resolve(process.cwd(), 'dist');

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));

  // 開発中の /stanza/* リクエストを、ローカルのStanza開発サーバーへ転送する。
  const proxyOptions = {
    target: 'http://localhost:8080',
    pathRewrite: {
      '^/stanza/': '/',
    },
  };
  app.use('/stanza', createProxyMiddleware(proxyOptions));

  // dist配下の静的ファイルを配信する。
  app.use(publicPath, express.static(outputPath));

  // webpack-dev-middleware はビルド結果をメモリ上に保持するため、
  // ディスク上のdistではなく、middlewareが持つファイルシステムからHTMLを読む。
  const outputFileSystem = middleware.context.outputFileSystem;

  // /variant/:id, /gene/:id, /disease/:id は同じHTMLを使い、canonicalだけURLごとに差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    outputFileSystem.readFile(
      path.resolve(compiler.outputPath, req.params.report, 'index.html'),
      (err, file) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.send(withCanonicalUrl(file.toString(), req));
        }
      }
    );
  });

  app.get('/', (req, res) => {
    outputFileSystem.readFile(
      path.resolve(compiler.outputPath, 'index.html'),
      (err, file) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.send(file.toString());
        }
      }
    );
  });
};
