import 'jquery'

const ENV = {
  'TOGOVAR_STANZA_SPARQL': TOGOVAR_ENDPOINT_SPARQL || '/sparql',
  'TOGOVAR_STANZA_SPARQLIST': TOGOVAR_ENDPOINT_SPARQLIST || '/sparqlist',
  'TOGOVAR_STANZA_SEARCH': TOGOVAR_ENDPOINT_SEARCH || '/search',
  'TOGOVAR_STANZA_JBROWSE': TOGOVAR_ENDPOINT_JBROWSE || '/jbrowse',
};

const STANZA_PATH = TOGOVAR_FRONTEND_STANZA_URL || '/stanza';

const config = (function (obj) {
  const replace_recursive = function (obj) {
    if (typeof obj === 'string' && obj.includes('$')) {
      for (const match of [...obj.matchAll(/(\$([A-Z_]+)|\${([A-Z_]+)})/g)]) {
        const key = match[2] || match[3];
        const value = ENV[key] || '';
        obj = obj.replace(match[0], value);
      }
    } else if (Array.isArray(obj)) {
      obj = obj.map(x => replace_recursive(x));
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = replace_recursive(value);
      }
    }

    return obj;
  }

  return replace_recursive(obj);
})(require('../../config/stanza.yaml'));

const formatOption = function (config) {
  const buf = {};

  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === 'object') {
        buf[key] = JSON.stringify(value);
      } else if (typeof value === 'string' && value.match(/^https?:\/\//)) {
        const url = new URL(value);

        url.search = [...url.searchParams]
          .filter(x => x[1])
          .map(x => [x[0], encodeURIComponent(x[1])].join('='))
          .join('&');

        buf[key] = url.href;
      } else {
        buf[key] = value;
      }
    }
  }

  return buf;
}

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
  const options = formatOption(config.options);

  $('head').append($(`<script type="module" src="${src}" async></script>`));
  $(`${dom}`).append($(`<togostanza-${id}></togostanza-${id}>`).attr(base_options || {}).attr(options || {}));
};

const initialize = function () {
  const [report, id] = window.location.pathname.split('/').slice(-2);

  const base_options = config[report]?.base_options || {};
  const stanzas = config[report]?.stanza || [];

  const id_key = config[report]?.id || 'id';
  base_options[id_key] = id;

  $('.report_id').html(id);

  stanzas.forEach(stanza => {
    if (stanza.options) {
      for (const [key, value] of Object.entries(stanza.options)) {
        if (typeof value === 'string' && value.includes('$')) {
          stanza.options[key] = value.replaceAll(new RegExp(`\\$(${id_key}|{${id_key}})`, 'g'), id);
        }
      }
    }
    appendStanzaTag(stanza, base_options)
  });
};

$(function () {
  initialize();
});
