import 'jquery'

const config = require('../../config/stanza.yaml')

$(function () {
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
  const id = config.id;
  const dom = config.dom;

  if (!id) {
    console.error("Missing required key: 'id'");
    return;
  }

  if (!dom) {
    console.error("Missing required key: 'dom'");
    return;
  }

  $('head').append($(`<script type="module" src="/stanza/${config.id}.js" async></script>`));
  $(`${dom}`).append($(`<togostanza-${id}></togostanza-${id}>`).attr(base_options || {}).attr(config.options || {}));
};
