import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT } from '../../global.js';

/**
 * データ管理を行うクラス
 * 検索結果の表示、ストア連携、行の管理を行う
 */
export class ResultsViewDataManager {
  /** ルート要素 */
  private elm: HTMLElement;
  /** 結果行のビューインスタンス配列 */
  private rows: ResultsRowView[] = [];
  /** ステータス表示要素 */
  private status: HTMLElement;
  /** メッセージ表示要素 */
  private messages: HTMLElement;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** カラム表示制御用スタイルシート */
  private stylesheet: HTMLStyleElement;

  /**
   * コンストラクタ
   * @param elm - ルート要素
   * @param status - ステータス表示要素
   * @param messages - メッセージ表示要素
   * @param tbody - テーブルボディ要素
   * @param stylesheet - カラム表示制御用スタイルシート
   */
  constructor(
    elm: HTMLElement,
    status: HTMLElement,
    messages: HTMLElement,
    tbody: HTMLElement,
    stylesheet: HTMLStyleElement
  ) {
    this.elm = elm;
    this.status = status;
    this.messages = messages;
    this.tbody = tbody;
    this.stylesheet = stylesheet;
  }

  /**
   * 結果行の配列を取得
   * @returns 結果行の配列
   */
  get resultRows(): ResultsRowView[] {
    return this.rows;
  }

  /**
   * 表示サイズを更新する
   * @param isTouchDevice - タッチデバイスかどうか
   * @param setTouchElementsPointerEvents - pointer-events制御関数
   */
  updateDisplaySize(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (enabled: boolean) => void
  ): void {
    if (storeManager.getData('isFetching')) {
      // フェッチ中は処理をスキップ
      return;
    }

    // 表示数
    const maxRowCount = Math.floor(
        (window.innerHeight -
          this.tbody.getBoundingClientRect().top -
          storeManager.getData('karyotype').height -
          COMMON_FOOTER_HEIGHT -
          2) /
          TR_HEIGHT
      ),
      numberOfRecords = storeManager.getData('numberOfRecords'),
      offset = storeManager.getData('offset'),
      rowCount = Math.min(maxRowCount, numberOfRecords);
    storeManager.setData('rowCount', rowCount);
    // 行が足らなければ追加
    if (this.rows.length < rowCount) {
      for (let i = this.rows.length; i < rowCount; i++) {
        const tr = new ResultsRowView(i);
        this.rows.push(tr);
        this.tbody.appendChild(tr.tr);
      }
    }
    // オフセット量の調整
    const onScreen = numberOfRecords - offset,
      belowSpace = maxRowCount - onScreen;
    if (belowSpace > 0) {
      // 隙間ができてしまい
      if (offset >= belowSpace) {
        // 上の隙間の方が大きい場合、差分をオフセットにセット
        storeManager.setData('offset', offset - belowSpace);
      } else {
        // 下の隙間が大きい場合、オフセット量をゼロに
        storeManager.setData('offset', 0);
      }
    }

    // 行の更新を確実に行う
    requestAnimationFrame(() => {
      this.rows.forEach((row) => row.updateTableRow());

      if (isTouchDevice) {
        setTouchElementsPointerEvents(false);
      }
    });
  }

  /**
   * オフセットの変更時の処理
   * @param offset - 新しいオフセット値
   */
  handleOffsetChange(offset: number): void {
    // データ更新中は処理をスキップ
    if (
      storeManager.getData('isStoreUpdating') ||
      storeManager.getData('isFetching')
    ) {
      return;
    }

    // 染色体位置
    const displayingRegions1: { [key: string]: number[] } = {},
      displayingRegions2: { [key: string]: { start: number; end: number } } =
        {};

    for (let i = 0; i <= storeManager.getData('rowCount') - 1; i++) {
      const record = storeManager.getRecordByIndex(i);

      // recordが実際のデータオブジェクトの場合のみ処理
      if (record && typeof record === 'object' && record.chromosome) {
        if (displayingRegions1[record.chromosome] === undefined) {
          displayingRegions1[record.chromosome] = [];
        }
        displayingRegions1[record.chromosome].push(record.start);
      }
    }

    // データが存在する場合のみ処理
    if (Object.keys(displayingRegions1).length > 0) {
      for (const key in displayingRegions1) {
        displayingRegions2[key] = {
          start: Math.min(...displayingRegions1[key]),
          end: Math.max(...displayingRegions1[key]),
        };
      }
      storeManager.setData('displayingRegionsOnChromosome', displayingRegions2);
    }
  }

  /**
   * 検索メッセージの表示
   * @param messages - メッセージオブジェクト
   */
  handleSearchMessages(messages: {
    notice?: string;
    warning?: string;
    error?: string;
  }): void {
    this.messages.innerHTML = '';

    if (messages.notice) {
      this.messages.innerHTML += `<div class="message -notice">${messages.notice}</div>`;
    }
    if (messages.warning) {
      this.messages.innerHTML += `<div class="message -warning">${messages.warning}</div>`;
    }
    if (messages.error) {
      this.messages.innerHTML += `<div class="message -error">${messages.error}</div>`;
    }
  }

  /**
   * 検索ステータスの表示
   * @param status - ステータスオブジェクト
   */
  handleSearchStatus(status: { available: number; filtered: number }): void {
    this.status.innerHTML = `The number of available variations is ${status.available.toLocaleString()} out of <span class="bigger">${status.filtered.toLocaleString()}</span>.`;
    if (status.filtered === 0) {
      this.elm.classList.add('-not-found');
    } else {
      this.elm.classList.remove('-not-found');
    }
  }

  /**
   * 検索結果の表示
   * @param _results - 検索結果（未使用）
   * @param isTouchDevice - タッチデバイスかどうか
   * @param setTouchElementsPointerEvents - pointer-events制御関数
   */
  handleSearchResults(
    _results: any,
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (enabled: boolean) => void
  ): void {
    // 更新中フラグのチェックを1回だけに
    const isUpdating = storeManager.getData('isStoreUpdating');
    const isFetching = storeManager.getData('isFetching');

    if (isUpdating || isFetching) {
      requestAnimationFrame(() =>
        this.handleSearchResults(
          _results,
          isTouchDevice,
          setTouchElementsPointerEvents
        )
      );
      return;
    }

    if (!this.validateData()) {
      console.warn('データの検証に失敗しました');
      return;
    }

    this.updateDisplaySize(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * データの妥当性を検証する
   * @returns 検証結果
   */
  private validateData(): boolean {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    return (
      Array.isArray(results) &&
      typeof numberOfRecords === 'number' &&
      numberOfRecords >= 0
    );
  }

  /**
   * カラムの表示／非表示を制御する
   * @param columns - カラム設定の配列
   */
  handleColumnsChange(columns: Array<{ id: string; isUsed: boolean }>): void {
    // 既存のスタイルの削除
    while (this.stylesheet.sheet!.cssRules.length > 0) {
      this.stylesheet.sheet!.deleteRule(0);
    }
    // スタイルの追加
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      this.stylesheet.sheet!.insertRule(
        `
      .tablecontainer > table.results-view th.${
        column.id
      }, .tablecontainer > table.results-view td.${column.id} {
        display: ${column.isUsed ? 'table-cell' : 'none'}
      }`,
        i
      );
    }
  }

  /**
   * 選択行を移動する
   * @param value - 移動量（+1で下、-1で上）
   */
  shiftSelectedRow(value: number): void {
    let currentIndex = storeManager.getData('selectedRow'),
      shiftIndex = currentIndex + value,
      rowCount = storeManager.getData('rowCount'),
      offset = storeManager.getData('offset'),
      numberOfRecords = storeManager.getData('numberOfRecords');
    if (shiftIndex < 0) {
      shiftIndex = 0;
      if (offset > 0) {
        // 上にスクロール
        offset--;
        storeManager.setData('offset', offset);
      }
    } else if (shiftIndex > rowCount - 1) {
      shiftIndex = rowCount - 1;
      if (offset + shiftIndex < numberOfRecords - 1) {
        // 下にスクロール
        offset++;
        storeManager.setData('offset', offset);
      }
    }
    storeManager.setData('selectedRow', shiftIndex);
  }
}
