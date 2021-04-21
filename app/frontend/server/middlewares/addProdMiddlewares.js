const path = require('path');
const express = require('express');
const compression = require('compression');

module.exports = function addProdMiddlewares(app, options) {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'dist');

  // compression middleware compresses your server responses which makes them
  // smaller (applies also to assets). You can read more about that technique
  // and other good practices on official Express.js docs http://mxs.is/googmy
  app.use(compression());
  app.use(publicPath, express.static(outputPath));

  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    return res.sendFile(path.resolve(outputPath, req.params.report, 'index.html'))
  });

  app.get('/', (req, res) => {
    return res.sendFile(path.resolve(outputPath, 'index.html'))
  });
};
