import path from 'path';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import {
  withCanonicalUrl,
  getTrailingSlashUrl,
  getNoTrailingSlashUrl,
} from './middlewareHelpers.js';
import { applyCspNonce } from './securityHeaders.js';

function createWebpackMiddleware(compiler, publicPath) {
  return webpackDevMiddleware(compiler, {
    publicPath,
    stats: 'errors-only',
  });
}

function getTrustedDevOrigin(req) {
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const port =
    req.socket && typeof req.socket.localPort === 'number'
      ? `:${req.socket.localPort}`
      : '';

  return `${protocol}://localhost${port}`;
}

function getCanonicalUrl(req) {
  return `${getTrustedDevOrigin(req)}${req.originalUrl.split('?')[0]}`;
}

// 詳細ページ用HTML内のプレースホルダーを、アクセスされたURL自身のcanonicalへ置き換える。
function sendReportHtml(outputFileSystem, outputPath, req, res) {
  outputFileSystem.readFile(
    path.resolve(outputPath, req.params.report, 'index.html'),
    (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(
          applyCspNonce(
            withCanonicalUrl(file.toString(), getCanonicalUrl(req)),
            res.locals.cspNonce
          )
        );
      }
    }
  );
}

export default function addDevMiddlewares(app, webpackConfig) {
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

  // webpack-dev-middleware はビルド結果をメモリ上に保持するため、
  // ディスク上のdistではなく、middlewareが持つファイルシステムからHTMLを読む。
  const outputFileSystem = middleware.context.outputFileSystem;

  // /variant, /gene, /disease は末尾スラッシュ付きURLへ統一する。
  app.get('/:report(variant|gene|disease)/?', (req, res) => {
    if (!req.path.endsWith('/')) {
      return res.redirect(302, getTrailingSlashUrl(req));
    }

    sendReportHtml(outputFileSystem, outputPath, req, res);
  });

  // /variant/:id, /gene/:id, /disease/:id も同じHTMLを使い、canonicalだけURLごとに差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    if (req.path.endsWith('/')) {
      return res.redirect(302, getNoTrailingSlashUrl(req));
    }

    sendReportHtml(outputFileSystem, outputPath, req, res);
  });

  // トップページも、開発中はメモリ上の最新HTMLを返す。
  app.get('/', (req, res) => {
    outputFileSystem.readFile(
      path.resolve(outputPath, 'index.html'),
      (err, file) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.send(applyCspNonce(file.toString(), res.locals.cspNonce));
        }
      }
    );
  });

  // dist配下の静的ファイルを配信する。
  app.use(publicPath, express.static(outputPath));
}
