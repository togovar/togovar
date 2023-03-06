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

    this.switchDisplayWithTabs();

    this.trigger.addEventListener('click', () => {
      this.downloadFile();
    });

    this._existConditions = StoreManager._store.advancedSearchConditions;
    // this.testDisplay();
  }

  // testDisplay() {
  //   if (
  //     Object.keys(StoreManager._store.advancedSearchConditions).length === 0
  //   ) {
  //     console.log(
  //       Object.keys(StoreManager._store.advancedSearchConditions).length
  //     );
  //     this.trigger.classList.add('-disabled');
  //   } else {
  //     this.trigger.classList.remove('-disabled');
  //   }
  // }

  switchDisplayWithTabs() {
    const tabs = document.querySelectorAll('[data-tab-group]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const selectTab = tab.getAttribute('data-target');
        const downloadGroupEl = document.querySelector('.right-header');
        if (selectTab === 'simple') {
          downloadGroupEl.setAttribute('style', 'display: none');
        } else {
          downloadGroupEl.removeAttribute('style');
        }
      });
    });
  }

  _downloadquery() {
    this.options.body = {
      query: {},
    };

    if (
      StoreManager._URIParameters.mode === 'advanced' &&
      StoreManager._store.advancedSearchConditions &&
      Object.keys(StoreManager._store.advancedSearchConditions).length > 0
    ) {
      this.options.body.query = StoreManager._store.advancedSearchConditions;
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
