import { merge } from 'webpack-merge';
import path from 'path';
import { fileURLToPath } from 'url';
import commonConfig from './webpack.config.common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    static: {
      directory: path.resolve(__dirname, '../../../dist'),
    },
  },
});
