/* eslint-disable global-require */

/**
 * Front-end middleware
 */
module.exports = (app, options) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const setSecurityHeaders = require('./securityHeaders');
    const addProdMiddlewares = require('./addProdMiddlewares');
    app.use(setSecurityHeaders);
    addProdMiddlewares(app, options);
  } else {
    const webpackConfig = require('../../config/webpack.config.dev');
    const addDevMiddlewares = require('./addDevMiddlewares');
    addDevMiddlewares(app, webpackConfig);
  }

  return app;
};
