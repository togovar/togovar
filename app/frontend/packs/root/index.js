/* eslint no-console:0 */
// This file is automatically compiled by Webpack, along with any other files
// present in this directory. You're encouraged to place your actual application logic in
// a relevant structure within app/javascript and only use these pack files to reference
// that code so it'll be compiled.
//
// To reference this file, add <%= javascript_pack_tag 'application' %> to the appropriate
// layout file, like app/views/layouts/application.html.erb

import 'bootstrap/dist/js/bootstrap'
import 'datatables.net/js/jquery.dataTables'
import 'datatables.net-bs4/js/dataTables.bootstrap4'
import 'jquery-ui/ui/widgets/autocomplete'

import '../../javascripts/root/custom-bootstrap'
import '../../javascripts/root/template.js.erb'
import Routes from '../../javascripts/js-routes.js.erb'
window.Routes = Routes;

import 'javascripts/root/index'
import 'stylesheets/root'
