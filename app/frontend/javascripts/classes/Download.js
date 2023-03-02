export default class Download {
  constructor(trigger) {
    this.trigger = trigger;
    this.path = 'https://stg-grch37.togovar.org/api/download/variant';
    this.options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: {
          location: {
            chromosome: '16',
            position: 48258198,
          },
        },
        limit: 1,
      }),
      mode: 'cors',
    };

    this.trigger.addEventListener('click', () => {
      this.downloadFile();
    });
  }

  async downloadFile() {
    try {
      const response = await fetch(this.path, this.options);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'togovar.json';
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
