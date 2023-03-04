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
      body: JSON.stringify({
        query: {
          location: {
            chromosome: '16',
            position: 48258198,
          },
        },
      }),
      mode: 'cors',
    };

    this.trigger.addEventListener('click', () => {
      this.downloadFile();
    });
  }

  async downloadFile() {
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
      throw error;
    }
  }
}
