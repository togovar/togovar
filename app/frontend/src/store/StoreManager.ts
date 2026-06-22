import isEqual from 'lodash/isEqual';
import { getInitialColumnWidth, normalizeColumnConfigs } from '../columns';
import {
  loadColumnsFromStorage,
  saveColumnsToStorage,
} from '../columns/columnStorage';
import {
  applyMergedSearchResults,
  createResetSearchResultsState,
  getSearchRecordByDisplayIndex,
  getSelectedSearchRecord,
  type SearchRecordLookupResult,
} from './searchResultsState';
import type { ResultData, SearchMode } from '../types';
import type { StoreState } from '../types/storeState';

type StoreListener<K extends keyof StoreState> = (value: StoreState[K]) => void;
type StoreListenerMap = {
  [K in keyof StoreState]?: Set<StoreListener<K>>;
};

/**
 * アプリ全体の状態を一元管理するシングルトンStore。
 * subscribe/publish によるオブザーバーパターンで状態変化をUIコンポーネントへ伝える。
 */
class StoreManager {
  /**
   * StoreStateのキーごとに購読値の型を保持し、publish時の値型取り違えを防ぐ。
   */
  private listeners: StoreListenerMap = {};

  /**
   * popstate経由のモード切替時にreflect*ToURIをスキップするためのフラグ。
   * setSearchModeFromHistoryとsearchModeの組み合わせでpushState二重発火を防ぐ。
   * searchManager の subscriber が fromHistory getter 経由で読む。
   */
  private isFromHistory = false;

  /** searchManager の searchMode subscriber が URL 更新をスキップするか判定するために公開する。 */
  get fromHistory(): boolean {
    return this.isFromHistory;
  }

  /**
   * アプリ全体の状態オブジェクト。外部からはgetData/setDataのみを通じてアクセスする。
   */
  private state: StoreState = {
    searchMode: '',
    simpleSearchConditionsMaster: [],
    simpleSearchConditions: {},
    columns: [],
    searchResults: [],
    numberOfRecords: 0,
    offset: 0,
    rowCount: 0,
    resultsResetVersion: 0,
    appLoadingStatus: 'preparing',
    isLogin: false,
    isSearchDataFetching: false,
    isSearchResultsUpdating: false,
    displayingRegionsOnChromosome: {},
  };

  constructor() {
    this.state.columns = loadColumnsFromStorage();
  }

  /**
   * keyからStoreState[K]を推論して返す。
   * 呼び出し側がStoreの内部オブジェクトを意図せず変更しないようにdeepCopyして渡す。
   */
  getData<K extends keyof StoreState>(key: K): StoreState[K] {
    return this.deepCopy(this.state[key]);
  }

  /**
   * columnsだけnormalizeColumnConfigsを通す（列設定の構造を正規化するため）。
   * プリミティブはObject.is、オブジェクトはisEqualで差分検出して不要なpublishをスキップする。
   */
  setData<T extends keyof StoreState>(key: T, newValue: StoreState[T]) {
    const oldValue = this.state[key];
    const normalizedValue = this.normalizeBeforeStoreUpdate(key, newValue);

    if (this.isPrimitiveValue(normalizedValue)) {
      this.setPrimitiveValueIfChanged(key, oldValue, normalizedValue);
      return;
    }

    this.setObjectValueIfChanged(key, oldValue, normalizedValue);
  }

  /**
   * widthだけをリセットしてisUsed（表示/非表示）は維持する。
   * 列の表示設定を壊さずに幅だけ初期化するユースケースのための専用メソッド。
   */
  resetColumnWidths() {
    const resetColumns = this.state.columns.map((column) => ({
      id: column.id,
      isUsed: column.isUsed,
      width: getInitialColumnWidth(column.id),
    }));
    this.setData('columns', resetColumns);
  }

  /**
   * 新規検索では過去結果を表示しないため、結果Storeと列幅の表示状態をまとめて初期化する。
   * Results系の内部キャッシュ解除も必要なため、DOMイベントではなくversion更新で通知する。
   */
  resetSearchResultsForNewSearch() {
    const resetState = createResetSearchResultsState(
      this.state.resultsResetVersion
    );
    this.setData('numberOfRecords', resetState.numberOfRecords);
    this.setData('offset', resetState.offset);
    this.setData('rowCount', resetState.rowCount);
    this.setData('isSearchDataFetching', resetState.isSearchDataFetching);
    this.setData('searchResults', resetState.searchResults);
    this.setData('displayingRegionsOnChromosome', {});
    this.resetColumnWidths();
    this.setData('resultsResetVersion', resetState.resultsResetVersion);
  }

  /**
   * Storeのキーに対してコールバックを登録する。
   * setData / publish のたびに登録済みの全コールバックが呼ばれる。
   */
  subscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    this.getListeners(key).add(callback);
  }

  /**
   * メモリリーク防止のためコンポーネント破棄時にコールバックを解除する。
   */
  unsubscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    this.listeners[key]?.delete(callback);
  }

  /**
   * state の参照を直接渡すとコールバック内での変更がStoreを汚染し得るため、基本はdeepCopyして渡す。
   * ただし searchResults は setResults() で毎回新規構築された配列が代入されており、
   * publish のたびに structuredClone するとスクロール・ページング時に大きなCPU/メモリ負荷になる。
   * そのため searchResults だけは参照をそのまま渡す（購読側は読み取り専用として扱うこと）。
   */
  publish<T extends keyof StoreState>(key: T) {
    const value = this.state[key];
    if (key === 'searchResults') {
      this.listeners[key]?.forEach((callback) =>
        callback(value as StoreState[T])
      );
      return;
    }
    this.listeners[key]?.forEach((callback) =>
      callback(this.deepCopy(value))
    );
  }

  /**
   * 購読Setの生成箇所を1つに寄せ、subscribe側で型キャストせずに登録できるようにする。
   */
  private getListeners<T extends keyof StoreState>(
    key: T
  ): Set<StoreListener<T>> {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set<StoreListener<T>>() as StoreListenerMap[T];
    }
    return this.listeners[key] as Set<StoreListener<T>>;
  }

  /**
   * nullとプリミティブはstructuredCloneをスキップして早期リターンする。
   * getDataやpublish経由でStoreの値が外部から変更されないよう保護するために使う。
   */
  private deepCopy<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    return structuredClone(value);
  }

  /**
   * columnsだけ保存前の正規形へ揃え、setData本体にキー別の特殊ルールを広げないようにする。
   */
  private normalizeBeforeStoreUpdate<T extends keyof StoreState>(
    key: T,
    newValue: StoreState[T]
  ): StoreState[T] {
    if (key !== 'columns') return newValue;

    return normalizeColumnConfigs(
      newValue as StoreState['columns']
    ) as StoreState[T];
  }

  /**
   * Store更新経路を分けるため、primitive/null をオブジェクト更新ロジックから明確に切り離す。
   */
  private isPrimitiveValue(value: unknown): boolean {
    return typeof value !== 'object' || value === null;
  }

  /**
   * primitive更新時の差分判定とsearchMode専用副作用をまとめ、publish前の順序を固定する。
   */
  private setPrimitiveValueIfChanged<T extends keyof StoreState>(
    key: T,
    oldValue: StoreState[T],
    nextValue: StoreState[T]
  ): void {
    if (Object.is(oldValue, nextValue)) {
      return;
    }

    this.state[key] = nextValue;
    this.runStoreSideEffectsBeforePublish(key, nextValue);
    this.publish(key);
  }

  /**
   * object更新時の比較・複製・永続化をまとめ、mutable参照がStoreへ残る経路を減らす。
   */
  private setObjectValueIfChanged<T extends keyof StoreState>(
    key: T,
    oldValue: StoreState[T],
    nextValue: StoreState[T]
  ): void {
    if (isEqual(oldValue, nextValue)) {
      return;
    }

    this.state[key] = structuredClone(nextValue);
    this.persistStoreDataAfterUpdate(key);
    this.publish(key);
  }

  /**
   * publish前に必要なStore内部副作用をここへ閉じ込め、setData本体から条件分岐を追い出す。
   */
  private runStoreSideEffectsBeforePublish<T extends keyof StoreState>(
    key: T,
    nextValue: StoreState[T]
  ): void {
    // searchMode変化時は外部subscriberへ通知する前に内部状態をリセットする。
    // subscribeによる自己購読だと Set の挿入順に依存するため、直接呼び出しで順序を明示する。
    if (key === 'searchMode') {
      this.resetSearchStateForMode(nextValue as SearchMode | '');
    }
  }

  /**
   * 更新後に保存が必要なキーだけをここで扱い、永続化ルールをsetData本体から切り離す。
   */
  private persistStoreDataAfterUpdate<T extends keyof StoreState>(key: T): void {
    if (key === 'columns') {
      saveColumnsToStorage(this.state.columns);
    }
  }

  // ------------------------------
  //  検索結果の管理
  // ------------------------------

  /**
   * isSearchResultsUpdating=trueで行の中途表示を防いでから既存データと新データをマージする。
   * API通信状態ではなく、searchResults配列の組み替え中だけ描画を止めるためのフラグとして扱う。
   */
  setResults(records: ResultData[], offset: number) {
    applyMergedSearchResults({
      currentResults: this.state.searchResults,
      records,
      offset,
      numberOfRecords: this.state.numberOfRecords,
      setUpdating: (isUpdating) =>
        this.setData('isSearchResultsUpdating', isUpdating),
      updateResults: (nextResults) => {
        // updatedResults は常に新規構築のため isEqual チェックと structuredClone は不要。
        // setData を経由せず直接代入し、publish を一度だけ呼ぶことで二重通知を防ぐ。
        this.state.searchResults = nextResults;
      },
      // isSearchDataFetchingはdata=1リクエストの状態なので、Store配列更新だけを担うここでは触らない。
      publishResults: () => this.publish('searchResults'),
    });
  }

  /**
   * 仮想スクロールの行がデータを要求するときに呼ばれる。
   * isSearchResultsUpdating中は中途状態を返さないようloadingを返す。
   * データが未取得（null）の場合は 'loading' を返すだけで fetch は起動しない。
   * fetch のトリガーは呼び出し元が searchManager.requestNextPage() 経由で行う。
   * スクロール中に全表示行で呼ばれるため、結果レコードはcloneせず読み取り専用として返す。
   */
  getRecordByIndex(index: number): SearchRecordLookupResult {
    if (this.getData('isSearchResultsUpdating')) return 'loading';
    return getSearchRecordByDisplayIndex(
      this.state.searchResults,
      index,
      this.state.offset,
      this.state.numberOfRecords
    );
  }

  /**
   * パネルビューの表示対象レコードを返す。
   * deepCopyしないのは読み取り専用として扱うため（変更はsetDataを通す）。
   */
  getSelectedRecord() {
    return getSelectedSearchRecord(
      this.state.searchResults,
      this.state.offset,
      this.state.selectedRow
    );
  }

  // ------------------------------
  //  検索モードの管理
  // ------------------------------

  /**
   * searchMode は内部リセットと searchManager の副作用順序が重要なため、専用入口に集約する。
   */
  setSearchMode(mode: SearchMode) {
    this.setData('searchMode', mode);
  }

  /**
   * searchMode 変化時にStore内部状態を先にリセットする。
   * DOM操作・URL管理・API呼び出しは publish 後の searchManager 側に寄せる（責務分離）。
   * ''（空文字）はStoreの初期化前センチネルのため何もしない。
   */
  private resetSearchStateForMode(mode: SearchMode | '') {
    if (!mode) return;
    this.setData('isSearchResultsUpdating', true);
    try {
      this.setData('offset', 0);
      this.setData('selectedRow', undefined);
      this.setData('searchResults', []);
      this.setData('numberOfRecords', 0);
      this.setData('rowCount', 0);
    } finally {
      this.setData('isSearchResultsUpdating', false);
    }
  }

  /**
   * popstate中にsetData('searchMode')を直接呼ぶとreflect*ToURIがpushStateを発火して
   * ブラウザ履歴が壊れる。isFromHistoryフラグでURIへの反映をスキップするために別メソッドを用意した。
   * 初期ロードでも同じ理由で使う（URLは正しいのにpushStateすると履歴エントリが乱れるため）。
   */
  setSearchModeFromHistory(mode: SearchMode) {
    this.isFromHistory = true;
    try {
      this.setSearchMode(mode);
    } finally {
      this.isFromHistory = false;
    }
  }
}

export const storeManager = new StoreManager();
