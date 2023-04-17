import StoreManager from './StoreManager.js';
import { API_URL } from '../global.js';

export default class DownloadButton {
  #trigger;
  #filetype;
  #path;
  #simpleOptions;
  #advancedOptions;

  constructor(trigger) {
    this.#trigger = trigger;
    this.#filetype = trigger.dataset.filetype;
    this.#path = `${API_URL}/api/download/variant`;
    this.#simpleOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: trigger.dataset.accept,
      },
    };
    this.#advancedOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: trigger.dataset.accept,
      },
      mode: 'cors',
    };

    this.#trigger.addEventListener('click', this.#downloadFile.bind(this));
  }

  #advancedDownloadQueryBody() {
    const query = StoreManager.getData('advancedSearchConditions');
    this.#advancedOptions.body = JSON.stringify({ query });
  }

  async #downloadFile() {
    try {
      let response;
      switch (StoreManager.getData('searchMode')) {
        case 'simple':
          response = await fetch(
            `${this.#path}?term=${
              StoreManager.getData('simpleSearchConditions').term
            }`,
            this.#simpleOptions
          );
          break;

        case 'advanced':
          this.#advancedDownloadQueryBody();
          response = await fetch(this.#path, this.#advancedOptions);
          break;
      }
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
