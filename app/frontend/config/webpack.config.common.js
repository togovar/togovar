const webpack = require('webpack');
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const env = require('dotenv').config().parsed || {};
Object.assign(process.env, env);

const config = {
  entry: {
    main: './app/frontend/packs/index.js',
    report: './app/frontend/packs/report/index.js',
    api: './app/frontend/packs/api/index.js',
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
        use: {
          loader: 'pug-loader',
          options: {
            globals: ['GLOBALS'],
            pretty: true,
          },
        },
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|c)ss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'lit-scss-loader',
            options: {
              minify: true,
            },
          },
          'extract-loader',
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
      {
        test: /\.ya?ml$/,
        use: [{ loader: 'json-loader' }, { loader: 'yaml-loader' }],
      },
      {
        test: /\.ya?ml\.erb$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          { loader: 'json-loader' },
          { loader: 'yaml-loader' },
          {
            loader: 'rails-erb-loader',
            options: {
              runner:
                (/^win/.test(process.platform) ? 'ruby ' : '') +
                'bin/rails runner',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery/dist/jquery',
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/index.pug',
      filename: 'index.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/variant/index.pug',
      filename: 'variant/index.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/gene/index.pug',
      filename: 'gene/index.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/disease/index.pug',
      filename: 'disease/index.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/api/index.pug',
      filename: 'api/index.html',
      inject: false,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash].css',
    }),
    new WebpackManifestPlugin(),
    new webpack.DefinePlugin({
      TOGOVAR_FRONTEND_API_URL: JSON.stringify(
        process.env.TOGOVAR_FRONTEND_API_URL
      ),
      TOGOVAR_FRONTEND_REFERENCE: JSON.stringify(
        process.env.TOGOVAR_REFERENCE
      ),
      TOGOVAR_FRONTEND_STANZA_URL: JSON.stringify(
        process.env.TOGOVAR_FRONTEND_STANZA_URL
      ),
      TOGOVAR_ENDPOINT_SPARQL: JSON.stringify(
        process.env.TOGOVAR_ENDPOINT_SPARQL
      ),
      TOGOVAR_ENDPOINT_SPARQLIST: JSON.stringify(
        process.env.TOGOVAR_ENDPOINT_SPARQLIST
      ),
      TOGOVAR_ENDPOINT_SEARCH: JSON.stringify(
        process.env.TOGOVAR_ENDPOINT_SEARCH
      ),
      TOGOVAR_ENDPOINT_JBROWSE: JSON.stringify(
        process.env.TOGOVAR_ENDPOINT_JBROWSE
      ),
    }),
  ],
};

const pages = function (assembly) {
  switch (assembly) {
    case 'GRCh37':
      return [
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
    case 'GRCh38':
      return [
        'about',
        'contact',
        'datasets',
        'datasets/analysis',
        'datasets/gem_j_wga',
        'datasets/jga_ngs',
        'datasets/jga_snp',
        'datasets/ncbn',
        'downloads',
        'help',
        'history',
        'policy',
        'terms',
      ];
  }
}(process.env.TOGOVAR_REFERENCE);

pages.forEach(function (name) {
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/ja/${name}.pug`,
      filename: `doc/ja/${name}/index.html`,
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/en/${name}.pug`,
      filename: `doc/${name}/index.html`,
      inject: false,
    })
  );
});

module.exports = config;
