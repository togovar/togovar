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
      body: { query: {} },
      mode: 'cors',
    };

    this._switchDisplayWithTabs();
    this.trigger.addEventListener('click', this._downloadFile.bind(this));
  }

  static switchDisplayWithConditions() {
    const buttonGroupEl = document.querySelectorAll(
      '.right-header > li > button'
    );
    const conditions = StoreManager._store.advancedSearchConditions;
    const hasConditions = Object.keys(conditions).length > 0;
    buttonGroupEl.forEach((button) => {
      button.classList.toggle('-disabled', !hasConditions);
    });
  }

  _switchDisplayWithTabs() {
    const tabs = document.querySelectorAll('[data-tab-group]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const selectTab = tab.getAttribute('data-target');
        const downloadGroupEl = document.querySelector('.right-header');
        downloadGroupEl.style.display = selectTab === 'simple' ? 'none' : '';
      });
    });
  }

  _downloadQuery() {
    if (StoreManager._URIParameters.mode === 'advanced') {
      this.options.body.query = StoreManager._store.advancedSearchConditions;
      this.options.body = JSON.stringify(this.options.body);
    }
  }

  async _downloadFile() {
    this._downloadQuery();
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
