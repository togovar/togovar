const webpack = require('webpack');
const {merge} = require('webpack-merge');

const path = require('path');

const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const DotenvWebpack = require('dotenv-webpack');
const GoogleTagManagerPlugin = require('webpack-google-tag-manager-plugin');

let common = {
  entry: {
    app: './app/frontend/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name]-[contenthash].js',
    chunkFilename: "js/[name]-[contenthash].chunk.js",
    hotUpdateChunkFilename: "js/[id]-[hash].hot-update.js",
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.ejs$/,
        use: [
          'html-loader',
          'ejs-html-loader'
        ]
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(jpg|jpeg|png|gif|tiff|svg)$/,
        loader: 'file-loader',
        options: {
          outputPath: 'images',
          name: '[name]-[contenthash].[ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: 'file-loader',
        options: {
          outputPath: 'fonts',
          name: '[name]-[contenthash].[ext]',
        },
      },
      {
        test: /\.(csv|tsv)$/,
        loader: 'csv-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        type: 'javascript/auto',
        loader: 'json-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.ProvidePlugin({
      $: "jquery/dist/jquery",
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: "app/frontend/index.ejs",
    }),
    new ManifestPlugin(),
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash].css',
    }),
    new DotenvWebpack(),
  ],
};

let config;

if ((process.env.ENV || process.env.NODE_ENV) === 'production') {
  const TerserJSPlugin = require('terser-webpack-plugin');
  const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

  config = merge(common, {
    mode: 'production',
    optimization: {
      minimizer: [
        new TerserJSPlugin({}),
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
  });

  const GMT_ID = process.env.TOGOVAR_FRONTEND_GTM_ID;
  if (GMT_ID) {
    GMT_ID.split(',').forEach(id => {
      config.plugins.push(new GoogleTagManagerPlugin({
        id: id,
      }));
    });
  }
} else {
  config = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      contentBase: 'dist',
    },
  });
}

module.exports = config;
