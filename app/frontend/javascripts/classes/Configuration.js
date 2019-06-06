/*global $ */
import {PAGE, COLUMNS, PREVIEWS, FILTERS} from "../global.js";
import StoreManager from "./StoreManager.js";

export default class Configuration {

  constructor(elm) {
    this.elm = elm;
    this.bg = elm.querySelector('.bg');

    switch (PAGE) {
      case 'home':
        this.initHome();
        break;
    }
  }

  open() {
    this.elm.classList.add('-shown');
    $(document).on('keyup.conf', this.typeEscape.bind(this));
  }

  typeEscape(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  close() {
    this.elm.classList.remove('-shown');
    $(document).off('keyup.conf');
  }

  // initialize
  initHome() {
    StoreManager.bind('columns', this);
    StoreManager.bind('filterPanels', this);
    StoreManager.bind('previewPanels', this);

    document.querySelector('#GlobalHeader > .menus > .config > .menu-button').addEventListener('click', () => {
      this.open();
    });

    this.bg.addEventListener('click', () => {
      this.close();
    });

    const CONFIGURES = [
      {
        constant: COLUMNS,
        storeKey: 'columns',
        container: document.getElementById('ConfSortColumns')
      },
      {
        constant: PREVIEWS,
        storeKey: 'previewPanels',
        container: document.getElementById('ConfSortPreviews')
      },
      {
        constant: FILTERS,
        storeKey: 'filterPanels',
        container: document.getElementById('ConfSortFilters')
      }
    ];

    for (const configure of CONFIGURES) {
      // user settings
      let stored = localStorage.getItem(configure.storeKey);
      if (stored) {
        stored = JSON.parse(stored);
      } else {
        // use defaults
        stored = configure.constant.map(item => {
          const newItem = Object.assign({}, item);
          newItem.isUsed = true;
          return newItem;
        });
      }

      configure.container.innerHTML = stored.map(item => `<li><label><input type="checkbox" value="${item.id}"${item.isUsed ? ' checked' : ''}>${item.label}</label></li>`).join('');
      configure.container.querySelectorAll('li > label > input').forEach(input => {
        input.addEventListener('change', e => {
          const stored = StoreManager.getData(configure.storeKey);
          const item = stored.find(item => item.id === e.target.value);
          item.isUsed = e.target.checked;
          StoreManager.setData(configure.storeKey, stored);
        })
      });

      // set to store
      StoreManager.setData(configure.storeKey, stored);
    }
  }

  columns(columns) {
    for (const column of columns) {
      this.elm.querySelector(`#ConfSortColumns > li > label > input[value="${column.id}"]`).checked = column.isUsed;
    }
    localStorage.setItem('columns', JSON.stringify(columns));
  }

  filterPanels(filters) {
    for (const filter of filters) {
      this.elm.querySelector(`#ConfSortFilters > li > label > input[value="${filter.id}"]`).checked = filter.isUsed;
    }
    localStorage.setItem('filterPanels', JSON.stringify(filters));
  }

  previewPanels(previews) {
    for (const preview of previews) {
      this.elm.querySelector(`#ConfSortPreviews > li > label > input[value="${preview.id}"]`).checked = preview.isUsed;
    }
    localStorage.setItem('previewPanels', JSON.stringify(previews));
  }
}
