import StoreManager from './StoreManager.js';
const DOWNLOAD_API_URL = 'https://stg-grch37.togovar.org';

export default class Download {
  constructor(trigger, accept, filetype) {
    this.trigger = trigger;
    this.filetype = filetype;
    this.path = `${DOWNLOAD_API_URL}/api/download/variant`;
    this.options = {
      method: 'POST',
      headers: {
        'Content-Type': accept,
        Accept: accept,
      },
      mode: 'cors',
    };

    this.trigger.addEventListener('click', () => {
      this.downloadFile();
    });
  }

  _downloadquery() {
    this.options.body = {
      query: {
        gene: {
          relation: 'eq',
          terms: [404],
        },
      },
    };

    switch (StoreManager._URIParameters.mode) {
      case 'simple':
        break;

      case 'advanced':
        if (
          StoreManager._store.advancedSearchConditions &&
          Object.keys(StoreManager._store.advancedSearchConditions).length > 0
        ) {
          this.options.body.query =
            StoreManager._store.advancedSearchConditions;
        }
        break;
    }

    this.options.body = JSON.stringify(this.options.body);
  }

  async downloadFile() {
    this._downloadquery();
    try {
      const response = await fetch(this.path, this.options, this.filetype);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `togovar.${this.filetype}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    }
  }
}
