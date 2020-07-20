const {environment} = require('@rails/webpacker')
const webpack = require('webpack')
const dotenv = require('dotenv')

environment.plugins.prepend('Provide',
  new webpack.ProvidePlugin({
    $: 'jquery/dist/jquery'
  })
);

const erb = require('./loaders/erb')
environment.loaders.prepend('erb', erb)

// To enable jQuery for $ in browser console
environment.loaders.append('expose', {
  test: require.resolve('jquery'),
  use: [{
    loader: 'expose-loader',
    options: '$'
  }]
});

const dotenvFiles = [
  'togovar.env',
  '.env'
]

dotenvFiles.forEach((dotenvFile) => {
  dotenv.config({ path: dotenvFile, silent: true })
})

environment.plugins.prepend('Environment',
  new webpack.EnvironmentPlugin(
    JSON.parse(JSON.stringify(process.env))
  )
)

module.exports = environment

console.log('=== Environment ===')
console.log(JSON.stringify(environment, null, 2))
console.log('===================')
