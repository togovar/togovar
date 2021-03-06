const {merge} = require('webpack-merge');
const commonConfig = require('./webpack.config.common');

const GoogleTagManagerPlugin = require('webpack-google-tag-manager-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
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
    optimization: {
      minimizer: [
        new TerserJSPlugin({
          terserOptions: {
            output: {
              comments: false,
            },
          },
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessor: require('cssnano'),
          cssProcessorPluginOptions: {
            preset: [
              'default',
              {
                discardComments: {
                  removeAll: true,
                },
              },
            ],
          },
        }),
      ],
    },
  }
);
