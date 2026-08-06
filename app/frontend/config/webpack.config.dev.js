import { merge } from 'webpack-merge';
import commonConfig from './webpack.config.common.js';

const LOCAL_SPARQLIST_PROXY_PATH = '/sparqlist';

// ローカルSPARQListはCORS設定なしで動かすことがあるため、開発サーバーから同一オリジンで中継する。
function createLocalSparqlistProxy() {
  const endpoint = process.env.TOGOVAR_ENDPOINT_SPARQLIST;

  if (!endpoint) {
    return [];
  }

  try {
    const endpointUrl = new URL(endpoint);

    if (!['localhost', '127.0.0.1', '[::1]'].includes(endpointUrl.hostname)) {
      return [];
    }

    const endpointPath = endpointUrl.pathname.replace(/\/$/, '');

    return [
      {
        context: [LOCAL_SPARQLIST_PROXY_PATH],
        target: endpointUrl.origin,
        changeOrigin: true,
        pathRewrite: {
          [`^${LOCAL_SPARQLIST_PROXY_PATH}`]: endpointPath,
        },
      },
    ];
  } catch {
    return [];
  }
}

export default merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    proxy: createLocalSparqlistProxy(),
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
