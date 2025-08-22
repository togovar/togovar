import { Task } from '@lit-labs/task';
import { axios } from '../../../../utils/cachedAxios';
import { debounce } from '../../../../utils/debounce';
import { SearchFieldHost, SuggestionData } from '../SearchFieldWithSuggestions';

/** SearchFieldController - API呼び出しとデータ管理を担当するクラス */
export class SearchFieldController {
  private host: SearchFieldHost;
  apiTask: Task;
  private _getSuggestURL: ((text: string) => string) | null = null;

  /** @param host - ホストとなるLitElementインスタンス */
  constructor(host: SearchFieldHost) {
    this.host = host;
    this._initializeApiTask();
  }

  /** APIタスクを初期化 */
  private _initializeApiTask(): void {
    this.apiTask = new Task(
      this.host, // SearchFieldHostはReactiveControllerHostを継承
      debounce(async (dependencies: readonly unknown[]) => {
        const term = dependencies[0] as string;
        if (term && term.length >= 3) {
          this.host.showSuggestions = true;

          if (!this._getSuggestURL) {
            throw new Error('Suggest URL function is not set');
          }

          const { data } = await axios.get(this._getSuggestURL(term));
          let dataToReturn: { [key: string]: SuggestionData[] };

          // Make suggestion data same format for simple & gene etc search
          if (Array.isArray(data)) {
            // for AdvancedSearch
            dataToReturn = { data: data as SuggestionData[] };
            this.host._suggestionKeysArray = ['data'];
          } else {
            // for SimpleSearch
            dataToReturn = data as { [key: string]: SuggestionData[] };
            this.host._suggestionKeysArray = Object.keys(data);
          }

          this.host.suggestData = dataToReturn;
          return dataToReturn;
        }
        this.host.showSuggestions = false;
        return {};
      }, 300),
      () => [this.host.term]
    );
  }

  /**
   * サジェストAPIのURLを生成する関数を設定
   * @param suggestAPIURL - API URL
   * @param suggestAPIQueryParam - クエリパラメータ名
   */
  setSuggestURL(suggestAPIURL: string, suggestAPIQueryParam: string): void {
    this._getSuggestURL = (text: string): string => {
      const url = new URL(suggestAPIURL);
      url.searchParams.set(suggestAPIQueryParam, text);
      return url.toString();
    };
  }

  /** サジェストを非表示にし、storeManagerを更新 */
  hideSuggestions(): void {
    this.host.showSuggestions = false;
  }

  /** サジェストを表示し、storeManagerを更新 */
  showSuggestions(): void {
    this.host.showSuggestions = true;
  }

  /** サジェストデータをクリア */
  clearSuggestData(): void {
    this.host.suggestData = {};
  }
}
