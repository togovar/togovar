module.exports = {
  test: /\.html$/,
  loader: 'webcomponents-loader',
  query: {
    // optinal parameter to use babel
    babel: {
      presets: 'es2015',
      compact: true
    },
    // optinal parameter to use minify
    minify: {
      removeAttributeQuotes: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      collapseWhitespace: true
    }
  }
};
