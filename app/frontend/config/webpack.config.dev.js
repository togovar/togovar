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
      ],
    },
    static: false,
  },
});
