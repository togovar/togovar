import { Task } from '@lit-labs/task';
import { axios } from '../../../../../utils/cachedAxios';
import { debounce } from '../../../../../utils/debounce';
import { storeManager } from '../../../../../store/StoreManager';

/**
 * SearchFieldController - API呼び出しとデータ管理を担当するクラス
 */
export class SearchFieldController {
  /**
   * @param {LitElement} host - ホストとなるLitElementインスタンス
   */
  constructor(host) {
    this.host = host;
    this._initializeApiTask();
    this._getSuggestURL = null;
  }

  /**
   * APIタスクを初期化
   * @private
   */
  _initializeApiTask() {
    this.apiTask = new Task(
      this.host,
      debounce(async (term) => {
        if (term.length >= 3) {
          this.host.showSuggestions = true;
          const { data } = await axios.get(this._getSuggestURL(term));
          let dataToReturn;

          // Make suggestion data same format for simple & gene etc search
          if (Array.isArray(data)) {
            // for AdvancedSearch
            dataToReturn = { data: data };
            this.host._suggestionKeysArray = ['data'];
          } else {
            // for SimpleSearch
            dataToReturn = data;
            this.host._suggestionKeysArray = Object.keys(data);
          }

          storeManager.setData('showSuggest', true);
          return (this.host.suggestData = dataToReturn);
        }
        return (this.host.showSuggestions = false);
      }, 300),
      () => this.host.term
    );
  }

  /**
   * サジェストAPIのURLを生成する関数を設定
   * @param {string} suggestAPIURL - API URL
   * @param {string} suggestAPIQueryParam - クエリパラメータ名
   */
  setSuggestURL(suggestAPIURL, suggestAPIQueryParam) {
    this._getSuggestURL = (text) => {
      const url = new URL(suggestAPIURL);
      url.searchParams.set(suggestAPIQueryParam, text);
      return url.toString();
    };
  }

  /**
   * サジェストを非表示にし、storeManagerを更新
   */
  hideSuggestions() {
    this.host.showSuggestions = false;
    storeManager.setData('showSuggest', false);
  }

  /**
   * サジェストを表示し、storeManagerを更新
   */
  showSuggestions() {
    this.host.showSuggestions = true;
    storeManager.setData('showSuggest', true);
  }

  /**
   * サジェストデータをクリア
   */
  clearSuggestData() {
    this.host.suggestData = [];
  }
}
