import 'jquery'

const config = require('../../config/stanza.yaml')

const webcomponentsjs = config.global?.webcomponents;

$(function () {
  if (webcomponentsjs) {
    $('head').append($(`<script src="${webcomponentsjs}"></script>`));
  }

  initialize();
});

const initialize = function () {
  const [report, id] = window.location.pathname.split('/').slice(-2);

  const base_options = config[report]?.base_options || {};
  const stanza = config[report]?.stanza || [];

  base_options[config[report]?.id || 'id'] = id;

  $('.report_id').html(id);

  stanza.forEach(x => appendStanzaTag(x, base_options));
};

const appendStanzaTag = function (config, base_options) {
  const name = config.name;
  const dom = config.dom;

  if (!name) {
    console.error("Missing required key: 'name'");
    return;
  }

  if (!dom) {
    console.error("Missing required key: 'dom'");
    return;
  }

  $('head').append($(`<link rel="import" href="${config.url}" />`))
  $(`${dom}`).append($(`<togostanza-${name}></togostanza-${name}>`).attr(base_options || {}).attr(config.options || {}));
};
