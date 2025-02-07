import StoreManager from '../store/StoreManager';
import { API_URL } from '../global.js';

export default class DownloadButton {
  #trigger;
  #filetype;
  #path;

  constructor(trigger) {
    this.#trigger = trigger;
    this.#filetype = trigger.dataset.filetype;
    this.#path = `${API_URL}/api/download/variant`;

    this.#trigger.addEventListener(
      'click',
      this.#downloadFile.bind(this, this.#filetype)
    );
  }

  #downloadFile(type) {
    switch (StoreManager.getData('searchMode')) {
      case 'simple':
        return this.#downloadFromSimpleSearch(type);
      case 'advanced':
        return this.#downloadFromAdvancedSearch(type);
    }
  }

  #downloadFromSimpleSearch(type) {
    const query = StoreManager.getData('simpleSearchConditions').term;
    const anchor = document.createElement('a');
    anchor.href = `${this.#path}.${type}?term=${query}`;
    anchor.click();
  }

  #downloadFromAdvancedSearch(type) {
    const body = { query: StoreManager.getData('advancedSearchConditions') };
    const form = document.createElement('form');
    form.action = `${this.#path}.${type}`;
    form.method = 'post';
    form.enctype = 'text/plain';
    form.setAttribute('style', 'display: none;');
    const input = document.createElement('input');
    input.setAttribute(
      'name',
      JSON.stringify(body).slice(0, -1) + ', "dummy": "'
    );
    input.setAttribute('value', '"}');
    form.appendChild(input);
    document.body.appendChild(form);

    form.submit();
  }
}
