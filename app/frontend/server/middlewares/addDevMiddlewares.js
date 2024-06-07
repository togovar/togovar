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

module.exports = function addDevMiddlewares(app, webpackConfig) {
  const compiler = webpack(webpackConfig);
  const middleware = createWebpackMiddleware(
    compiler,
    webpackConfig.output.publicPath,
  );

  const publicPath = webpackConfig.output.publicPath || '/';
  const outputPath = webpackConfig.output.path || path.resolve(process.cwd(), 'dist');

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));

  // proxy
  const proxyOptions = {
    target: 'http://localhost:8080',
    pathRewrite: {
      '^/stanza/': '/',
    },
  };
  app.use('/stanza', createProxyMiddleware(proxyOptions));

  // serve static assets under /dist
  app.use(publicPath, express.static(outputPath));

  // Since webpackDevMiddleware uses memory-fs internally to store build
  // artifacts, we use it instead
  const fs = middleware.fileSystem;

  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    fs.readFile(path.resolve(compiler.outputPath, req.params.report, 'index.html'), (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(file.toString());
      }
    });
  });

  app.get('/', (req, res) => {
    fs.readFile(path.resolve(compiler.outputPath, 'index.html'), (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(file.toString());
      }
    });
  });
};
