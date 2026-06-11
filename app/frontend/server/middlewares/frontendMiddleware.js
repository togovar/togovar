/**
 * Front-end middleware
 */

// dev/prod それぞれ必要なモジュールだけを動的に読み込む。
// addDevMiddlewares は devDependencies に依存しているため、本番環境での静的 import を避ける。
export default async (app, options) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const { default: setSecurityHeaders } = await import('./securityHeaders.js');
    const { default: addProdMiddlewares } = await import('./addProdMiddlewares.js');
    app.use(setSecurityHeaders);
    addProdMiddlewares(app, options);
  } else {
    const [{ default: webpackConfig }, { default: addDevMiddlewares }] =
      await Promise.all([
        import('../../config/webpack.config.dev.js'),
        import('./addDevMiddlewares.js'),
      ]);
    addDevMiddlewares(app, webpackConfig);
  }

  return app;
};
