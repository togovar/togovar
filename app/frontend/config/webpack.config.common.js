const webpack = require('webpack');
const path = require('path');

const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const DotenvWebpack = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const config = {
  entry: {
    main: './app/frontend/packs/index.js',
    report: './app/frontend/packs/report/index.js',
  },
  output: {
    path: path.resolve(__dirname, '../../../dist'),
    filename: 'js/[name]-[contenthash].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: 'pug-loader',
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
      template: "app/frontend/views/index.pug",
      filename: "index.html",
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: "app/frontend/views/variant/index.pug",
      filename: "variant/index.html",
      inject: false,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash].css',
    }),
    new ManifestPlugin(),
    new DotenvWebpack(),
    new webpack.DefinePlugin({
      TOGOVAR_FRONTEND_API_URL: JSON.stringify(process.env.TOGOVAR_FRONTEND_API_URL),
      TOGOVAR_ENDPOINT_STANZA: JSON.stringify(process.env.TOGOVAR_ENDPOINT_STANZA),
    }),
  ],
};

const pages = [
  'about',
  'contact',
  'datasets',
  'datasets/analysis',
  'datasets/gem_j_wga',
  'datasets/jga_ngs',
  'datasets/jga_snp',
  'downloads',
  'help',
  'history',
  'policy',
  'terms',
];

pages.forEach(function (name) {
  config.plugins.push(new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/ja/${name}.pug`,
      filename: `doc/ja/${name}/index.html`,
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/en/${name}.pug`,
      filename: `doc/${name}/index.html`,
      inject: false,
    }),
  );
});

module.exports = config;
