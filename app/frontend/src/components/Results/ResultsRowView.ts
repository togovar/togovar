import { COLUMNS, getOrderedColumns } from '../../columns';
import { storeManager } from '../../store/StoreManager';
import { requestNextPage } from '../../store/searchManager';
import type {
  ResultData,
  Column,
  TdFrequencies,
  FrequencyElement,
} from '../../types';
import {
  COLUMN_TEMPLATES,
  createFrequencyColumnHTML,
} from './ResultsColumnTemplates';
import { ResultsColumnUpdater } from './ResultsColumnUpdater';

/**
 * 仮想スクロールにおける1行分のView。
 * 固定DOM行を使い回し、offset変化のたびにデータをStoreから引いて表示を切り替えることで
 * 大量件数でもDOM数を一定に保つ。
 */
export class ResultsRowView {
  index: number;
  selected: boolean;
  tr: HTMLTableRowElement;
  private _isDestroyed = false;

  /**
   * unsubscribeで同一参照が必要なため、束縛済みコールバックをフィールドに保持する。
   */
  private _onSelectedRow = (v: number | undefined) => this.selectedRow(v!);
  private _onOffset = () => this.offset();

  /**
   * _prepareTableDataでHTML生成直後に一括取得し、updateTableRowで毎回querySelectorを
   * 実行しないよう保持する。
   */
  togovarIdCell: HTMLTableCellElement | null = null;
  refsnpCell: HTMLTableCellElement | null = null;
  refsnpContent: HTMLDivElement | null = null;
  refsnpRemains: HTMLSpanElement | null = null;
  positionChromosome: HTMLDivElement | null = null;
  positionCoordinate: HTMLDivElement | null = null;
  refElement: HTMLSpanElement | null = null;
  altElement: HTMLSpanElement | null = null;
  typeElement: HTMLDivElement | null = null;
  geneCell: HTMLTableCellElement | null = null;
  geneContent: HTMLDivElement | null = null;
  geneRemains: HTMLSpanElement | null = null;
  frequencyElements: TdFrequencies = {};
  consequenceCell: HTMLTableCellElement | null = null;
  consequenceContent: HTMLDivElement | null = null;
  consequenceItem: HTMLDivElement | null = null;
  consequenceRemains: HTMLSpanElement | null = null;
  clinicalContainer: HTMLDivElement | null = null;
  clinicalSignificance: HTMLDivElement | null = null;
  clinicalRemains: HTMLSpanElement | null = null;
  clinicalIcon: HTMLSpanElement | null = null;
  alphaMissenseFunction: HTMLDivElement | null = null;
  siftFunction: HTMLDivElement | null = null;
  polyphenFunction: HTMLDivElement | null = null;

  /**
   * offsetとselectedRowの変化を受け取って行を再描画するためStoreにバインドする。
   * 個別バインドにしているのは行インデックスに応じたデータを独立して取得・表示するため。
   */
  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = this._createTableRow();

    storeManager.subscribe('selectedRow', this._onSelectedRow);
    storeManager.subscribe('offset', this._onOffset);
  }

  // ================================================================
  // ライフサイクル
  // ================================================================

  /**
   * バインドしたままオブジェクトが破棄されるとコールバックが届き続けてメモリリークになるため
   * 必ずStoreからunbindしてDOMも切り離す。
   */
  destroy(): void {
    if (this._isDestroyed) return;

    storeManager.unsubscribe('selectedRow', this._onSelectedRow);
    storeManager.unsubscribe('offset', this._onOffset);

    if (this.tr && this.tr.parentNode) {
      this.tr.parentNode.removeChild(this.tr);
    }

    this.togovarIdCell = null;
    this.refsnpCell = null;
    this.refsnpContent = null;
    this.refsnpRemains = null;
    this.positionChromosome = null;
    this.positionCoordinate = null;
    this.refElement = null;
    this.altElement = null;
    this.typeElement = null;
    this.geneCell = null;
    this.geneContent = null;
    this.geneRemains = null;
    this.frequencyElements = {};
    this.consequenceCell = null;
    this.consequenceContent = null;
    this.consequenceItem = null;
    this.consequenceRemains = null;
    this.clinicalContainer = null;
    this.clinicalSignificance = null;
    this.clinicalRemains = null;
    this.clinicalIcon = null;
    this.alphaMissenseFunction = null;
    this.siftFunction = null;
    this.polyphenFunction = null;

    this._isDestroyed = true;
  }

  // ================================================================
  // 行の状態更新
  // ================================================================

  /**
   * isFetching / isStoreUpdating / rowCount / データの順に状態を確認し、
   * 最も早い段階で不要な処理を打ち切ることで描画コストを抑える。
   */
  updateTableRow() {
    if (this._isDestroyed) return;

    // 初回fetch（numberOfRecords === 0）はまだ表示できるデータがないため行を非表示にする。
    // スクロール中の追加fetch（numberOfRecords > 0）は既存データが見えているため
    // out-of-rangeにせずloadingGIFを維持する（この後の isStoreUpdating / result チェックに委ねる）。
    if (
      storeManager.getData('isFetching') &&
      storeManager.getData('numberOfRecords') === 0
    ) {
      return this._setOutOfRangeState();
    }

    if (storeManager.getData('isStoreUpdating')) {
      return this._setLoadingState();
    }

    const rowCount = storeManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this._setOutOfRangeState();
    }

    const result = storeManager.getRecordByIndex(this.index);
    if (!result || result === 'loading' || result === 'out of range') {
      if (result === 'loading') {
        // データが未取得のページに到達した → 後続ページを取得する。
        // isStoreUpdating=false は直上と getRecordByIndex 内でチェック済み。
        requestNextPage(storeManager.getData('offset') + this.index);
      }
      return this._setLoadingState();
    }

    const columns = this._getCurrentColumns();
    this._prepareTableData(columns);
    columns.forEach((column) => this._updateColumnContent(column, result));
    this.tr.classList.remove('-loading', '-out-of-range');
  }

  // ================================================================
  // Storeイベントハンドラ
  // ================================================================

  /**
   * 選択状態はCSSクラスだけで表現できるため、データの再描画は行わずclassToggleのみ行う。
   */
  selectedRow(selectedIndex: number) {
    if (this._isDestroyed) return;
    this.selected = selectedIndex === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  /**
   * offsetが変わると表示すべきデータが変わるため、行全体を再評価する。
   */
  offset() {
    if (this._isDestroyed) return;
    this.updateTableRow();
  }

  // ================================================================
  // DOM生成と状態管理
  // ================================================================

  /**
   * 生成直後はStoreからデータを受け取っていないため、初期状態を-loadingにして白紙を防ぐ。
   */
  private _createTableRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.classList.add('-loading');
    tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    tr.addEventListener('click', this._handleRowClick.bind(this));
    return tr;
  }

  /**
   * スクロール中のデータ未到着行にローディングGIFを見せるために使う。
   * 以前のデータが残ったままだとレイアウトが崩れるためinnerHTMLもリセットする。
   */
  private _setLoadingState() {
    this.tr.classList.remove('-out-of-range');
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /**
   * 表示行数の範囲外・初回fetchのデータ未着行を完全に隠すために使う。
   * display:noneはSCSSの-out-of-rangeクラスが担い、クラスの付け外しで制御する。
   */
  private _setOutOfRangeState() {
    this.tr.classList.remove('-loading');
    this.tr.classList.add('-out-of-range');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  // ================================================================
  // データ準備とHTML生成
  // ================================================================

  /**
   * HTML生成とDOMキャッシュ取得を分離して、生成処理とキャッシュ処理の責務を明確にする。
   */
  private _prepareTableData(columns: Column[]) {
    this.tr.innerHTML = this._createTableCellHTML(columns);
    this._cacheTableCells();
  }

  /**
   * 列の有効/無効・順序がStoreから動的に変わるため、固定HTMLではなく毎回生成する。
   */
  private _createTableCellHTML(columns: Column[]): string {
    return columns
      .map((column) => {
        const resizeBar =
          column.resizable === false
            ? ''
            : `<div class="resize-bar" data-column-id="${column.id}" aria-hidden="true"></div>`;

        if (column.id === 'alt_frequency') {
          return this._appendResizeBar(createFrequencyColumnHTML(), resizeBar);
        }
        return this._appendResizeBar(
          (COLUMN_TEMPLATES as Record<string, string>)[column.id] || '',
          resizeBar
        );
      })
      .join('');
  }

  /**
   * 既存のカラムテンプレートHTML文字列を変更せずにリサイズバーを</td>直前へ注入するため
   * 文字列置換で挿入する。
   */
  private _appendResizeBar(cellHTML: string, resizeBar: string): string {
    if (!cellHTML) return '';
    return cellHTML.replace('</td>', `${resizeBar}</td>`);
  }

  /**
   * store.columnsは順序が保証されないためgetOrderedColumnsで表示順を正規化して返す。
   */
  private _getCurrentColumns() {
    return getOrderedColumns(storeManager.getData('columns'));
  }

  // ================================================================
  // DOM要素キャッシュ
  // ================================================================

  /**
   * updateTableRowのたびにquerySelectorを実行するとコストが高いため、
   * HTML生成後に一度だけまとめて取得してフィールドに保持する。
   * 周波数・機能予測系は構造が異なるため3つのメソッドに分けている。
   */
  private _cacheTableCells() {
    this._cacheBasicElements();
    this._cacheFrequencyElements();
    this._cacheFunctionElements();
  }

  /**
   * 各セルはネストが浅くquerySelectorで一意に取れるため、列ごとに直接取得する。
   */
  private _cacheBasicElements() {
    this.togovarIdCell = this.tr.querySelector('td.togovar_id');

    this.refsnpCell = this.tr.querySelector('td.refsnp_id');
    this.refsnpContent =
      this.refsnpCell?.querySelector('.remains-content') || null;
    this.refsnpRemains =
      this.refsnpCell?.querySelector('.remains-badge') || null;

    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.positionChromosome = tdPosition?.querySelector('.chromosome') || null;
    this.positionCoordinate = tdPosition?.querySelector('.coordinate') || null;

    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.refElement = tdRefAlt?.querySelector('span.ref') || null;
    this.altElement = tdRefAlt?.querySelector('span.alt') || null;

    this.typeElement = this.tr.querySelector('td.type > .variant-type');

    this.geneCell = this.tr.querySelector('td.gene');
    this.geneContent = this.geneCell?.querySelector('.remains-content') || null;
    this.geneRemains = this.geneCell?.querySelector('.remains-badge') || null;

    this.consequenceCell = this.tr.querySelector('td.consequence');
    this.consequenceContent =
      this.consequenceCell?.querySelector('.remains-content') || null;
    this.consequenceItem =
      this.consequenceCell?.querySelector('.consequence-item') || null;
    this.consequenceRemains =
      this.consequenceCell?.querySelector('.remains-badge') || null;

    const tdClinical = this.tr.querySelector<HTMLTableCellElement>(
      'td.clinical_significance'
    );
    const clinicalFlex =
      tdClinical?.querySelector<HTMLDivElement>(
        '.clinical-significance-flex'
      ) || null;
    this.clinicalContainer = clinicalFlex;
    this.clinicalSignificance =
      tdClinical?.querySelector('.clinical-significance') || null;
    this.clinicalRemains =
      tdClinical?.querySelector('.clinical-remains') || null;
    this.clinicalIcon = tdClinical?.querySelector('span.icon') || null;
  }

  /**
   * frequency-block-viewは複数あり、データセット名をキーにすることで
   * 後からO(1)で対象要素を更新できる。
   */
  private _cacheFrequencyElements() {
    this.frequencyElements = {};
    this.tr
      .querySelectorAll('td.alt_frequency > frequency-block-view')
      .forEach((elm) => {
        const element = elm as FrequencyElement;
        const datasetId = element.dataset.dataset;
        if (datasetId) {
          this.frequencyElements[datasetId] = element;
        }
      });
  }

  /**
   * 予測系カラムはすべて同じHTML構造（td.xxx > .variant-function）を持つため、
   * カラムIDで識別してまとめてキャッシュする。
   */
  private _cacheFunctionElements() {
    const tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.alphaMissenseFunction =
      tdAlphaMissense?.querySelector('.variant-function') || null;

    const tdSift = this.tr.querySelector('td.sift');
    this.siftFunction = tdSift?.querySelector('.variant-function') || null;

    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.polyphenFunction =
      tdPolyphen?.querySelector('.variant-function') || null;
  }

  // ================================================================
  // 列コンテンツ更新
  // ================================================================

  /**
   * 列IDをキーにしたディスパッチテーブルにすることで、列追加時の変更箇所を局所化する。
   * 対応するハンドラが存在しない列IDは?. で安全にスキップする。
   */
  private _updateColumnContent(column: Column, result: ResultData) {
    const columnHandlers: Record<string, () => void> = {
      togovar_id: () =>
        ResultsColumnUpdater.updateTogovarId(
          this.togovarIdCell,
          result.id,
          `/variant/${result.id}`
        ),
      refsnp_id: () =>
        ResultsColumnUpdater.updateRefSNP(
          this.refsnpContent,
          this.refsnpRemains,
          result.existing_variations
        ),
      position: () =>
        ResultsColumnUpdater.updatePosition(
          this.positionChromosome,
          this.positionCoordinate,
          result.chromosome,
          result.position
        ),
      ref_alt: () =>
        ResultsColumnUpdater.updateRefAlt(
          this.refElement,
          this.altElement,
          result.reference,
          result.alternate
        ),
      type: () =>
        ResultsColumnUpdater.updateVariantType(this.typeElement, result.type),
      gene: () =>
        ResultsColumnUpdater.updateGene(
          this.geneContent,
          this.geneRemains,
          result.symbols
        ),
      alt_frequency: () =>
        ResultsColumnUpdater.updateAltFrequency(
          this.frequencyElements,
          result.frequencies
        ),
      consequence: () =>
        ResultsColumnUpdater.updateConsequence(
          this.consequenceItem,
          this.consequenceRemains,
          result.most_severe_consequence,
          result.transcripts
        ),
      clinical_significance: () =>
        ResultsColumnUpdater.updateClinicalSignificance(
          this.clinicalSignificance,
          this.clinicalContainer,
          this.clinicalRemains,
          this.clinicalIcon,
          result.significance
        ),
      alphamissense: () =>
        ResultsColumnUpdater.updateAlphaMissense(
          this.alphaMissenseFunction,
          result.alphamissense
        ),
      sift: () =>
        ResultsColumnUpdater.updateSift(this.siftFunction, result.sift),
      polyphen: () =>
        ResultsColumnUpdater.updatePolyphen(
          this.polyphenFunction,
          result.polyphen
        ),
    };
    columnHandlers[column.id]?.();
  }

  // ================================================================
  // イベントハンドラ
  // ================================================================

  /**
   * 同一行の再クリックで選択解除するUXのためselectedRowをトグルする。
   * tapCompletedイベントはタッチデバイスのスクロール制御（ResultsViewTouchHandler）が
   * タップ完了を検知するために使う。
   */
  private _handleRowClick(): void {
    storeManager.setData('selectedRow', this.selected ? undefined : this.index);

    const tapCompletedEvent = new CustomEvent('tapCompleted', {
      bubbles: true,
      detail: { rowIndex: this.index },
    });
    this.tr.dispatchEvent(tapCompletedEvent);
  }
}
