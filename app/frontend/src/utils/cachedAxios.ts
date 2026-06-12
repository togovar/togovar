import Axios, { type AxiosInstance } from 'axios';
import { setupCache } from 'axios-cache-interceptor';

type CachedAxiosResponse<T> = {
  data: T;
};

export const axios = setupCache(
  Axios.create({
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })
);

/** APIごとの小さなキャッシュを持つ既存呼び出しを維持するため、小文字クラス名を互換用に残す。 */
export class cachedAxios {
  private readonly axios: AxiosInstance;
  private readonly maxCacheSize: number;
  private readonly cache = new Map<string, CachedAxiosResponse<unknown>>();

  /**
   * 同じURLへの繰り返しアクセスを抑えつつ、APIごとにbaseURLを分けるためインスタンス化する。
   * maxCacheSizeを超えた場合は、古い順にキャッシュを削除する。
   */
  constructor(baseURL: string, maxCacheSize = 100) {
    this.axios = Axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    this.maxCacheSize = maxCacheSize;
  }

  /** 呼び出し元がaxiosと同じ `{ data }` 形式で扱えるよう、レスポンス形状を固定する。 */
  get<T = unknown>(url: string): Promise<CachedAxiosResponse<T>> {
    const cachedResponse = this.cache.get(url);
    if (cachedResponse) {
      return Promise.resolve(cachedResponse as CachedAxiosResponse<T>);
    }

    return this.axios.get<T>(url).then(({ data }) => {
      const response = { data };
      this.cache.set(url, response);

      if (this.cache.size > this.maxCacheSize) {
        const firstUrl = this.cache.keys().next().value;
        if (firstUrl !== undefined) {
          this.cache.delete(firstUrl);
        }
      }

      return response;
    });
  }
}
