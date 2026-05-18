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
function withCanonicalUrl(html, req) {
  const canonicalUrl = escapeHtmlAttribute(getCanonicalUrl(req));

  return html.replace(
    /__TOGOVAR_CANONICAL_URL__/g,
    () => canonicalUrl
  );
}

function sendReportHtml(outputFileSystem, outputPath, req, res) {
  outputFileSystem.readFile(
    path.resolve(outputPath, req.params.report, 'index.html'),
    (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(withCanonicalUrl(file.toString(), req));
      }
    }
  );
}

function getTrailingSlashUrl(req) {
  return `${req.path}/${req.originalUrl.slice(req.path.length)}`;
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

  // webpack-dev-middleware はビルド結果をメモリ上に保持するため、
  // ディスク上のdistではなく、middlewareが持つファイルシステムからHTMLを読む。
  const outputFileSystem = middleware.context.outputFileSystem;

  // /variant, /gene, /disease は末尾スラッシュ付きURLへ統一する。
  app.get('/:report(variant|gene|disease)/?', (req, res) => {
    if (!req.path.endsWith('/')) {
      return res.redirect(302, getTrailingSlashUrl(req));
    }

    sendReportHtml(outputFileSystem, compiler.outputPath, req, res);
  });

  // /variant/:id, /gene/:id, /disease/:id も同じHTMLを使い、canonicalだけURLごとに差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    sendReportHtml(outputFileSystem, compiler.outputPath, req, res);
  });

  // トップページも、開発中はメモリ上の最新HTMLを返す。
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

  // dist配下の静的ファイルを配信する。
  app.use(publicPath, express.static(outputPath));
};
