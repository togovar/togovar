import { merge } from 'webpack-merge';
import commonConfig from './webpack.config.common.js';

export default merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    historyApiFallback: {
      rewrites: [
        { from: /^\/variant(?:\/.*)?$/, to: '/variant/index.html' },
        { from: /^\/gene(?:\/.*)?$/, to: '/gene/index.html' },
        { from: /^\/disease(?:\/.*)?$/, to: '/disease/index.html' },
        {
          from: /^\/doc\/(?!.*(?:\/index)?\.html$)(.+?)(?:\/)?$/,
          to: (context) => `/doc/${context.match[1]}/index.html`,
        },
      ],
    },
    setupMiddlewares: (middlewares) => {
      middlewares.unshift({
        name: 'normalize-report-detail-url',
        middleware: (req, res, next) => {
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const normalizedPath = requestUrl.pathname.replace(
            /^\/(variant|gene|disease)\/([^/]+)\/$/,
            '/$1/$2'
          );

          if (normalizedPath !== requestUrl.pathname) {
            // レポート詳細は末尾スラッシュなしを正規形にし、旧Express配信時のURL解釈と揃える。
            res.statusCode = 302;
            res.setHeader(
              'Location',
              `${normalizedPath}${requestUrl.search}`
            );
            res.end();
            return;
          }

          next();
        },
      });
      return middlewares;
    },
    static: false,
  },
});
