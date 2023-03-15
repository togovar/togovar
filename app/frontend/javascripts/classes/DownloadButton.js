import StoreManager from './StoreManager.js';
import { API_URL } from '../global.js';

export default class DownloadButton {
  #trigger;
  #filetype;
  #path;
  #options;

  constructor(trigger) {
    this.#trigger = trigger;
    this.#filetype = trigger.dataset.filetype;
    this.#path = `${API_URL}/api/download/variant`;
    this.#options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: trigger.dataset.accept,
      },
      mode: 'cors',
    };

    this.#trigger.addEventListener('click', this.#downloadFile.bind(this));
  }

  #downloadQuery() {
    this.#options.body = { query: {} };
    if (document.body.getAttribute('data-search-mode') === 'advanced') {
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
