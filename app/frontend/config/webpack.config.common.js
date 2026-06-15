import webpack from 'webpack';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import dotenv from 'dotenv';
import { getSiteOrigin } from './siteOrigin.js';

// ESM では __dirname が使えないため、import.meta.url から再現する。
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = dotenv.config().parsed || {};
Object.assign(process.env, env);

const STRUCTURED_DATA_TEMPLATE_PATH = path.resolve(
  __dirname,
  '../assets/togovar.jsonld'
);

// 検索エンジン向けの robots.txt を生成する。
// ここではクロールを許可し、同時に sitemap.xml の場所を知らせる。
function createRobotsTxt(siteOrigin) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

// webpackで生成している静的ページ一覧から sitemap.xml を生成する。
// トップページ、英語ドキュメント、日本語ドキュメントを検索エンジンへ伝える。
function createSitemapXml(siteOrigin, pages) {
  const urls = [
    `${siteOrigin}/`,
    ...pages.map((page) => `${siteOrigin}/doc/${page}/`),
    ...pages.map((page) => `${siteOrigin}/doc/ja/${page}/`),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

// JSON-LD内のサイトURLを、GRCh37/GRCh38などビルド対象のoriginに合わせる。
function createStructuredDataJson(siteOrigin) {
  try {
    const template = readFileSync(STRUCTURED_DATA_TEMPLATE_PATH, 'utf8');
    const json = template.replace(/__TOGOVAR_SITE_ORIGIN__/g, siteOrigin);

    return JSON.stringify(JSON.parse(json), null, 2).replace(/</g, '\\u003c');
  } catch (error) {
    throw new Error(
      `Failed to create structured data JSON from ${STRUCTURED_DATA_TEMPLATE_PATH}`,
      { cause: error }
    );
  }
}

// webpack watch が JSON-LD テンプレート変更を検知できるようにする。
class StructuredDataTemplateDependencyPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'StructuredDataTemplateDependencyPlugin',
      (compilation) => {
        compilation.fileDependencies.add(STRUCTURED_DATA_TEMPLATE_PATH);
      }
    );
  }
}

function createIndexTemplateParameters(
  compilation,
  assets,
  assetTags,
  options
) {
  const siteOrigin = getSiteOrigin();

  return {
    compilation,
    webpackConfig: compilation.options,
    htmlWebpackPlugin: {
      tags: assetTags,
      files: assets,
      options,
    },
    canonicalUrl: `${siteOrigin}/`,
    structuredDataJson: createStructuredDataJson(siteOrigin),
  };
}

// webpackのビルド結果へ robots.txt と sitemap.xml を追加するための独自プラグイン。
// 実ファイルを手で管理せず、ビルド対象ページとTOGOVAR_REFERENCEに合わせて自動生成する。
class StaticSeoFilesPlugin {
  constructor(pages) {
    this.pages = pages;
  }

  apply(compiler) {
    // webpackのコンパイルごとに、アセット追加のタイミングでSEO用ファイルを差し込む。
    compiler.hooks.thisCompilation.tap(
      'StaticSeoFilesPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'StaticSeoFilesPlugin',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          () => {
            const { RawSource } = compiler.webpack.sources;
            const siteOrigin = getSiteOrigin();

            // dist/robots.txt として出力される。
            compilation.emitAsset(
              'robots.txt',
              new RawSource(createRobotsTxt(siteOrigin))
            );
            // dist/sitemap.xml として出力される。
            compilation.emitAsset(
              'sitemap.xml',
              new RawSource(createSitemapXml(siteOrigin, this.pages))
            );
          }
        );
      }
    );
  }
}

const config = {
  entry: {
    main: './app/frontend/packs/index.ts',
    report: './app/frontend/packs/report/index.ts',
  },
  output: {
    path: path.resolve(__dirname, '../../../dist'),
    filename: 'js/[name]-[contenthash].js',
    chunkFilename: 'js/[name]-[contenthash].js',
    publicPath: '/',
  },
  resolve: {
    alias: {
      axios$: 'axios/dist/browser/axios.cjs',
    },
    extensions: ['.ts', '.js', '...'],
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: {
          loader: '@webdiscus/pug-loader',
          options: {
            globals: ['GLOBALS'],
          },
        },
      },
      // "type": "module" により .js が strict ESM 扱いになるため、
      // 拡張子なしのインポートを引き続き解決できるよう fullySpecified を無効にする。
      { test: /\.js$/, resolve: { fullySpecified: false } },
      { test: /\.[tj]s$/, loader: 'ts-loader', exclude: /node_modules/ },
      {
        test: /\.(sa|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              esModule: false,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                silenceDeprecations: ['import', 'global-builtin'],
              },
            },
          },
        ],
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
          {
            loader: 'css-loader',
            options: {
              esModule: false,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                silenceDeprecations: ['import', 'global-builtin'],
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(jpg|jpeg|png|gif|tiff|svg|webp)$/,
        loader: 'file-loader',
        options: {
          outputPath: 'images',
          name: '[name]-[contenthash].[ext]',
          esModule: false,
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: 'file-loader',
        options: {
          outputPath: 'fonts',
          name: '[name]-[contenthash].[ext]',
          esModule: false,
        },
      },
      {
        test: /\.(csv|tsv)$/,
        loader: 'csv-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/index.pug',
      filename: 'index.html',
      templateParameters: createIndexTemplateParameters,
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: 'app/frontend/views/404.pug',
      filename: '404.html',
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
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash].css',
    }),
    new WebpackManifestPlugin(),
    new StructuredDataTemplateDependencyPlugin(),
    new webpack.DefinePlugin({
      TOGOVAR_FRONTEND_API_URL: JSON.stringify(
        process.env.TOGOVAR_FRONTEND_API_URL
      ),
      TOGOVAR_FRONTEND_REFERENCE: JSON.stringify(process.env.TOGOVAR_REFERENCE),
      TOGOVAR_FRONTEND_SITE_ORIGIN: JSON.stringify(getSiteOrigin()),
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
  experiments: {
    topLevelAwait: true,
  },
};

const pages = (function (assembly) {
  switch (assembly) {
    case 'GRCh37':
      return [
        'about',
        'contact',
        'datasets',
        'datasets/analysis',
        'datasets/gem_j_wga',
        'datasets/jga_wes',
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
        'datasets/jga_wes',
        'datasets/jga_wgs',
        'datasets/jga_snp',
        'datasets/ncbn',
        'downloads',
        'help',
        'history',
        'policy',
        'terms',
      ];
    default:
      // TOGOVAR_REFERENCE が未設定または想定外の場合は、現在の標準であるGRCh38のページを生成する。
      return [
        'about',
        'contact',
        'datasets',
        'datasets/analysis',
        'datasets/gem_j_wga',
        'datasets/jga_wes',
        'datasets/jga_wgs',
        'datasets/jga_snp',
        'datasets/ncbn',
        'downloads',
        'help',
        'history',
        'policy',
        'terms',
      ];
  }
})(process.env.TOGOVAR_REFERENCE);

// pages に定義したドキュメントページを、英語版・日本語版それぞれHTMLとして出力する。
// 例: name が "datasets" の場合
//   app/frontend/views/doc/en/datasets.pug -> dist/doc/datasets/index.html
//   app/frontend/views/doc/ja/datasets.pug -> dist/doc/ja/datasets/index.html
pages.forEach(function (name) {
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/ja/${name}.pug`,
      filename: `doc/ja/${name}/index.html`,
      // 各ドキュメントページ自身のURLを canonical としてテンプレートへ渡す。
      templateParameters: {
        canonicalUrl: `${getSiteOrigin()}/doc/ja/${name}/`,
      },
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: `app/frontend/views/doc/en/${name}.pug`,
      filename: `doc/${name}/index.html`,
      // 英語ページは /doc/{name} を正規URLとして扱う。
      templateParameters: {
        canonicalUrl: `${getSiteOrigin()}/doc/${name}/`,
      },
      inject: false,
    })
  );
});

// robots.txt と sitemap.xml を dist 直下に追加する。
// sitemap.xml には、上で生成したドキュメントページのURL一覧を含める。
config.plugins.push(new StaticSeoFilesPlugin(pages));

export default config;
