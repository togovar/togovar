import { storeManager } from '../store/StoreManager';
import * as qs from 'qs';
import { API_URL } from '../global';
import { stripAdvancedSearchMetadata } from '../store/advancedSearchURL';
import { extractSearchCondition } from '../store/simpleSearchConditions';

type DownloadFileType = 'json' | 'csv' | 'txt';

const DOWNLOAD_VARIANT_LIMIT = 100000;
const DOWNLOAD_VARIANT_LIMIT_TEXT = new Intl.NumberFormat('en-US').format(
  DOWNLOAD_VARIANT_LIMIT
);
const DOWNLOAD_LIMIT_TITLE = `Download is limited to ${DOWNLOAD_VARIANT_LIMIT_TEXT} variants.`;

/** 検索結果のダウンロードボタンを制御するクラス */
export default class DownloadButton {
  private readonly trigger: HTMLButtonElement;
  private readonly filetype: DownloadFileType;
  private readonly path = `${API_URL}/api/download/variant`;

  constructor(trigger: HTMLElement | null) {
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('DownloadButton trigger must be a button element.');
    }

    const filetype = trigger.dataset.filetype;
    if (!this.isDownloadFileType(filetype)) {
      throw new Error(`Unsupported download file type: ${filetype ?? ''}`);
    }

    this.trigger = trigger;
    this.filetype = filetype;

    this.trigger.addEventListener('click', () => {
      this.downloadFile(this.filetype);
    });

    const onUpdate = () => this.updateAvailability();
    storeManager.subscribe('searchMode', onUpdate);
    storeManager.subscribe('simpleSearchConditions', onUpdate);
    storeManager.subscribe('advancedSearchConditions', onUpdate);
    storeManager.subscribe('searchStatus', onUpdate);
    storeManager.subscribe('appLoadingStatus', onUpdate);
    this.updateAvailability();
  }

  private isDownloadFileType(
    filetype: string | undefined
  ): filetype is DownloadFileType {
    return filetype === 'json' || filetype === 'csv' || filetype === 'txt';
  }

  /** disabled 表示中は API にリクエストしない */
  private isDisabled(): boolean {
    return (
      this.trigger.classList.contains('-disabled') ||
      this.trigger.getAttribute('aria-disabled') === 'true'
    );
  }

  private updateAvailability(): void {
    const hasConditions = this.hasSearchConditions();
    const searchStatus = storeManager.getData('searchStatus');
    const filteredCount = searchStatus?.filtered;
    const hasValidCount = typeof filteredCount === 'number';
    const isSearching = storeManager.getData('appLoadingStatus') === 'searching';
    const isLimitExceeded =
      hasConditions && hasValidCount && filteredCount > DOWNLOAD_VARIANT_LIMIT;
    const isAvailable =
      hasConditions && hasValidCount && !isSearching && !isLimitExceeded;
    const disabledReason = this.getDisabledReason(hasConditions, isLimitExceeded);

    this.trigger.classList.toggle('-disabled', !isAvailable);
    this.trigger.setAttribute('aria-disabled', String(!isAvailable));
    this.trigger.disabled = !isAvailable;

    if (isLimitExceeded) {
      this.trigger.setAttribute('title', DOWNLOAD_LIMIT_TITLE);
    } else {
      this.trigger.removeAttribute('title');
    }

    document.body.toggleAttribute('data-download-available', isAvailable);
    DownloadButton.updateDisabledReasonMessage(disabledReason);
  }

  private hasSearchConditions(): boolean {
    switch (storeManager.getData('searchMode')) {
      case 'simple': {
        const simpleConditions = storeManager.getData('simpleSearchConditions');
        const master = storeManager.getData('simpleSearchConditionsMaster');
        return Object.keys(extractSearchCondition(simpleConditions, master)).length > 0;
      }
      case 'advanced':
        // advancedSearchConditions は {} を使わず undefined をセンチネルとするため、存在確認だけで十分
        return Boolean(storeManager.getData('advancedSearchConditions'));
      default:
        return false;
    }
  }

  private getDisabledReason(
    hasConditions: boolean,
    isLimitExceeded: boolean
  ): string {
    if (!hasConditions) {
      return 'Add a search condition to enable download.';
    }
    if (isLimitExceeded) {
      return DOWNLOAD_LIMIT_TITLE;
    }
    return '';
  }

  /** 複数ボタンが同じ理由表示を共有するため、DOM更新入口をクラス側にまとめる */
  static updateDisabledReasonMessage(message: string): void {
    const reasonNode = document.getElementById('DownloadDisabledReason');
    if (!reasonNode) {
      return;
    }

    reasonNode.textContent = message;
    const shouldHide = message === '';
    reasonNode.toggleAttribute('hidden', shouldHide);
    reasonNode
      .closest('.download-disabled-reason-item')
      ?.toggleAttribute('hidden', shouldHide);
  }

  private downloadFile(type: DownloadFileType): void {
    if (this.isDisabled()) {
      return;
    }

    const searchMode = storeManager.getData('searchMode');
    switch (searchMode) {
      case 'simple':
        this.downloadFromSimpleSearch(type);
        break;
      case 'advanced':
        this.downloadFromAdvancedSearch(type);
        break;
    }
  }

  private downloadFromSimpleSearch(type: DownloadFileType): void {
    const simpleConditions = storeManager.getData('simpleSearchConditions');
    const master = storeManager.getData('simpleSearchConditionsMaster');
    const query = qs.stringify(extractSearchCondition(simpleConditions, master));
    const anchor = document.createElement('a');
    anchor.href = `${this.path}.${type}${query ? `?${query}` : ''}`;
    anchor.click();
  }

  private downloadFromAdvancedSearch(type: DownloadFileType): void {
    const body = {
      query: stripAdvancedSearchMetadata(
        storeManager.getData('advancedSearchConditions')
      ),
    };
    const form = document.createElement('form');
    form.action = `${this.path}.${type}`;
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
