import 'jquery'

const ENV = {
  'TOGOVAR_STANZA_SPARQL_URL': process.env.TOGOVAR_STANZA_SPARQL_URL,
  'TOGOVAR_STANZA_SPARQLIST_URL': process.env.TOGOVAR_STANZA_SPARQLIST_URL,
  'TOGOVAR_STANZA_SEARCH_API_URL': process.env.TOGOVAR_STANZA_SEARCH_API_URL,
  'TOGOVAR_STANZA_JBROWSE_URL': process.env.TOGOVAR_STANZA_JBROWSE_URL,
};

const STANZA_PATH = process.env.TOGOVAR_FRONTEND_STANZA_URL || '/stanza';

const config = (function (obj) {
  const replace_recursive = function (obj) {
    if (Array.isArray(obj)) {
      for (const elem of obj) {
        replace_recursive(elem);
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
          obj[key] = replace_recursive(value);
        } else if (typeof value === 'string' && value.startsWith('$')) {
          const v = ENV[value.replace(/^\$/, '')] || '';

          if (v === '') {
            delete obj[key]
          } else {
            obj[key] = v;
          }
        }
      }
    }

    return obj;
  }

  return replace_recursive(obj);
})(require('../../config/stanza.yaml'));

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

  const src = config.src || `${STANZA_PATH}/${config.id}.js`;

  $('head').append($(`<script type="module" src="${src}" async></script>`));
  $(`${dom}`).append($(`<togostanza-${id}></togostanza-${id}>`).attr(base_options || {}).attr(config.options || {}));
};
