/* eslint no-console:0 */

require.context('../images', true, /\.(png|jpg|jpeg|svg)$/);

import Routes from '../javascripts/js-routes.js.erb'
window.Routes = Routes;

import 'stylesheets/application'
