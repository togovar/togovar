import { storeManager } from '../store/StoreManager';
import { API_URL } from '../global';
import type { SearchMode } from '../types';

type DownloadFileType = 'json' | 'csv' | 'txt';

/** 検索結果のダウンロードボタンを制御するクラス */
export default class DownloadButton {
  /** クリック対象のボタン要素 */
  readonly #trigger: HTMLButtonElement;
  /** data-filetype から取得したダウンロード形式 */
  readonly #filetype: DownloadFileType;
  /** API のダウンロードエンドポイント */
  readonly #path = `${API_URL}/api/download/variant`;

  constructor(trigger: HTMLElement | null) {
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('DownloadButton trigger must be a button element.');
    }

    const filetype = trigger.dataset.filetype;
    if (!this.#isDownloadFileType(filetype)) {
      throw new Error(`Unsupported download file type: ${filetype ?? ''}`);
    }

    this.#trigger = trigger;
    this.#filetype = filetype;

    this.#trigger.addEventListener('click', () => {
      this.#downloadFile(this.#filetype);
    });
  }

  /** data-filetype の値が対応済み形式かどうかを判定 */
  #isDownloadFileType(filetype: string | undefined): filetype is DownloadFileType {
    return filetype === 'json' || filetype === 'csv' || filetype === 'txt';
  }

  /** disabled 表示中は API にリクエストしない */
  #isDisabled(): boolean {
    return (
      this.#trigger.classList.contains('-disabled') ||
      this.#trigger.getAttribute('aria-disabled') === 'true'
    );
  }

  /** 現在の検索モードに応じてダウンロード処理を振り分ける */
  #downloadFile(type: DownloadFileType): void {
    if (this.#isDisabled()) {
      return;
    }

    const searchMode = storeManager.getData<SearchMode>('searchMode');
    switch (searchMode) {
      case 'simple':
        this.#downloadFromSimpleSearch(type);
        break;
      case 'advanced':
        this.#downloadFromAdvancedSearch(type);
        break;
    }
  }

  /** Simple search 用の GET ダウンロード */
  #downloadFromSimpleSearch(type: DownloadFileType): void {
    const query = storeManager.getData<{ term?: string }>(
      'simpleSearchConditions'
    ).term;
    const anchor = document.createElement('a');
    anchor.href = `${this.#path}.${type}?term=${encodeURIComponent(query ?? '')}`;
    anchor.click();
  }

  /** Advanced search 用の POST ダウンロード */
  #downloadFromAdvancedSearch(type: DownloadFileType): void {
    const body = { query: storeManager.getData('advancedSearchConditions') };
    const form = document.createElement('form');
    form.action = `${this.#path}.${type}`;
    form.method = 'post';
    form.enctype = 'text/plain';
    form.setAttribute('style', 'display: none;');

    // API 側が text/plain の body として JSON を受け取るための既存形式を維持する。
    const input = document.createElement('input');
    input.setAttribute(
      'name',
      JSON.stringify(body).slice(0, -1) + ', "dummy": "'
    );
    input.setAttribute('value', '"}');
    form.appendChild(input);
    document.body.appendChild(form);

    form.submit();
    form.remove();
  }
}
