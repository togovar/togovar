import { merge } from 'webpack-merge';
import commonConfig from './webpack.config.common.js';

export default merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: 'dist',
  },
});
