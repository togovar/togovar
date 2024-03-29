const {merge} = require('webpack-merge');
const commonConfig = require('./webpack.config.common');

const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const GoogleTagManagerPlugin = require('webpack-google-tag-manager-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const TerserJSPlugin = require('terser-webpack-plugin');

const GMT_ID = process.env.TOGOVAR_FRONTEND_GTM_ID;
if (GMT_ID) {
  GMT_ID.split(',').forEach(id => {
    commonConfig.plugins.push(new GoogleTagManagerPlugin({
      id: id,
      dataLayerName: 'dataLayer', // workaround for https://github.com/timjorjev/webpack-google-tag-manager-plugin/issues/1
    }));
  });
}

module.exports = merge(commonConfig, {
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin(),
  ],
  optimization: {
    minimizer: [
      new TerserJSPlugin({
        terserOptions: {
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default', {
              discardComments: {
                removeAll: true,
              },
            },
          ],
        },
      }),
    ],
  },
});
