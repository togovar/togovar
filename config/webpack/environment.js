const {environment} = require('@rails/webpacker')
const webpack = require('webpack')

environment.plugins.prepend('Provide',
    new webpack.ProvidePlugin({
      $: 'jquery/dist/jquery',
      jQuery: 'jquery/dist/jquery',
      Popper: 'popper.js/dist/popper'
    })
);

const erb = require('./loaders/erb')
environment.loaders.prepend('erb', erb)

const webcomponents = require('./loaders/webcomponents')
environment.loaders.prepend('webcomponents', webcomponents)

// To enable jQuery for $ in browser console
environment.loaders.append('expose', {
  test: require.resolve('jquery'),
  use: [{
    loader: 'expose-loader',
    options: '$'
  }]
});

module.exports = environment

console.log('=== Environment ===')
console.log(JSON.stringify(environment, null, 2))
console.log('===================')
