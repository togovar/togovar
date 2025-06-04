import Axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';

export const axios = setupCache(
  Axios.create({
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })
);

/** Cached axios */
export class cachedAxios {
  /**
   * Create cached axios instance
   * @param {string} baseURL - base URL.
   * @param {number} maxCacheSize - maximum cache entries number. After reaching this treshold, oldest entries will be deleted from cache.
   */
  constructor(baseURL, maxCacheSize = 100) {
    this.axios = Axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    this.maxCacheSize = maxCacheSize;
    this.cache = new Map();
  }

  /**
   *
   * @param {string} url - url part bo be fetched. Fetched url will be  baseURL + url
   * @returns {object} {data} - response data
   */
  get(url) {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }
    return this.axios.get(url).then(({ data }) => {
      this.cache.set(url, { data });
      if (this.cache.size > this.maxCacheSize) {
        const [first] = this.cache.keys();
        this.cache.delete(first);
      }
      return { data };
    });
  }
}
