import StoreManager from './StoreManager.js';
import { API_URL } from '../global.js';

export default class DownloadButton {
  #trigger;
  #filetype;
  #path;
  #options;

  constructor(trigger, accept, filetype) {
    this.#trigger = trigger;
    this.#filetype = filetype;
    this.#path = `${API_URL}/api/download/variant`;
    this.#options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: accept,
      },
      mode: 'cors',
    };

    this.#switchDisplayWithTabs();
    this.#trigger.addEventListener('click', this.#downloadFile.bind(this));
  }

  static switchDisplayWithConditions() {
    const buttonGroupEl = document.querySelectorAll('.right > li > button');
    const conditions = StoreManager._store.advancedSearchConditions;
    const hasConditions = Object.keys(conditions).length > 0;
    buttonGroupEl.forEach((button) => {
      button.classList.toggle('-disabled', !hasConditions);
    });
  }

  #switchDisplayWithTabs() {
    const tabs = document.querySelectorAll('[data-tab-group]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const selectTab = tab.getAttribute('data-target');
        const downloadGroupEl = document.querySelector('.right');
        downloadGroupEl.style.display = selectTab === 'simple' ? 'none' : '';
      });
    });
  }

  #downloadQuery() {
    this.#options.body = { query: {} };
    if (StoreManager._URIParameters.mode === 'advanced') {
      this.#options.body.query = StoreManager._store.advancedSearchConditions;
      this.#options.body = JSON.stringify(this.#options.body);
    }
  }

  async #downloadFile() {
    this.#downloadQuery();
    try {
      const response = await fetch(this.#path, this.#options, this.#filetype);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `togovar.${this.#filetype}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    }
  }
}
