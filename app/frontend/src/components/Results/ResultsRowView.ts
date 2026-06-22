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
  private isDestroyed = false;

  /**
   * unsubscribeで同一参照が必要なため、束縛済みコールバックをフィールドに保持する。
   */
  private onSelectedRow = (v: number | undefined) => this.selectedRow(v);

  /**
   * prepareTableDataでHTML生成直後に一括取得し、updateTableRowで毎回querySelectorを
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
   * 選択状態は行ごとにclassを切り替えるだけで済むため、selectedRowだけを購読する。
   * offsetによる再描画は親側でまとめ、スクロール中の購読コールバック増加を避ける。
   */
  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = this.createTableRow();

    storeManager.subscribe('selectedRow', this.onSelectedRow);
  }

  // ================================================================
  // ライフサイクル
  // ================================================================

  /**
   * バインドしたままオブジェクトが破棄されるとコールバックが届き続けてメモリリークになるため
   * 必ずStoreからunbindしてDOMも切り離す。
   */
  destroy(): void {
    if (this.isDestroyed) return;

    storeManager.unsubscribe('selectedRow', this.onSelectedRow);

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

    this.isDestroyed = true;
  }

  // ================================================================
  // 行の状態更新
  // ================================================================

  /**
   * data取得中 / Store配列更新中 / rowCount / データの順に状態を確認し、
   * 最も早い段階で不要な処理を打ち切ることで描画コストを抑える。
   */
  updateTableRow() {
    if (this.isDestroyed) return;

    // 初回data取得（numberOfRecords === 0）はまだ表示できるデータがないため行を非表示にする。
    // スクロール中の追加data取得（numberOfRecords > 0）は既存データが見えているため
    // out-of-rangeにせずloadingGIFを維持する（この後の isSearchResultsUpdating / result チェックに委ねる）。
    if (
      storeManager.getData('isSearchDataFetching') &&
      storeManager.getData('numberOfRecords') === 0
    ) {
      return this.setOutOfRangeState();
    }

    if (storeManager.getData('isSearchResultsUpdating')) {
      return this.setLoadingState();
    }

    const rowCount = storeManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this.setOutOfRangeState();
    }

    const result = storeManager.getRecordByIndex(this.index);
    if (result === 'out of range') {
      return this.setOutOfRangeState();
    }
    if (result === 'loading') {
      // データが未取得のページに到達した → 後続ページを取得する。
      // isSearchResultsUpdating=false は直上と getRecordByIndex 内でチェック済み。
      requestNextPage(storeManager.getData('offset') + this.index);
      return this.setLoadingState();
    }
    if (!result) {
      return this.setLoadingState();
    }

    const columns = this.getCurrentColumns();
    this.prepareTableData(columns);
    columns.forEach((column) => this.updateColumnContent(column, result));
    this.tr.classList.remove('-loading', '-out-of-range');
  }

  // ================================================================
  // Storeイベントハンドラ
  // ================================================================

  /**
   * 選択状態はCSSクラスだけで表現できるため、データの再描画は行わずclassToggleのみ行う。
   */
  selectedRow(selectedIndex: number | undefined) {
    if (this.isDestroyed) return;
    this.selected = selectedIndex === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  // ================================================================
  // DOM生成と状態管理
  // ================================================================

  /**
   * 生成直後はStoreからデータを受け取っていないため、初期状態を-loadingにして白紙を防ぐ。
   */
  private createTableRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.classList.add('-loading');
    tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    tr.addEventListener('click', this.handleRowClick.bind(this));
    return tr;
  }

  /**
   * スクロール中のデータ未到着行にローディングGIFを見せるために使う。
   * 以前のデータが残ったままだとレイアウトが崩れるためinnerHTMLもリセットする。
   */
  private setLoadingState() {
    this.tr.classList.remove('-out-of-range');
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /**
   * 表示行数の範囲外・初回fetchのデータ未着行を完全に隠すために使う。
   * display:noneはSCSSの-out-of-rangeクラスが担い、クラスの付け外しで制御する。
   */
  private setOutOfRangeState() {
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
  private prepareTableData(columns: Column[]) {
    this.tr.innerHTML = this.createTableCellHTML(columns);
    this.cacheTableCells();
  }

  /**
   * 列の有効/無効・順序がStoreから動的に変わるため、固定HTMLではなく毎回生成する。
   */
  private createTableCellHTML(columns: Column[]): string {
    return columns
      .map((column) => {
        const resizeBar =
          column.resizable === false
            ? ''
            : `<div class="resize-bar" data-column-id="${column.id}" aria-hidden="true"></div>`;

        if (column.id === 'alt_frequency') {
          return this.appendResizeBar(createFrequencyColumnHTML(), resizeBar);
        }
        return this.appendResizeBar(
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
  private appendResizeBar(cellHTML: string, resizeBar: string): string {
    if (!cellHTML) return '';
    return cellHTML.replace('</td>', `${resizeBar}</td>`);
  }

  /**
   * store.columnsは順序が保証されないためgetOrderedColumnsで表示順を正規化して返す。
   */
  private getCurrentColumns() {
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
  private cacheTableCells() {
    this.cacheBasicElements();
    this.cacheFrequencyElements();
    this.cacheFunctionElements();
  }

  /**
   * 各セルはネストが浅くquerySelectorで一意に取れるため、列ごとに直接取得する。
   */
  private cacheBasicElements() {
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
  private cacheFrequencyElements() {
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
  private cacheFunctionElements() {
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
  private updateColumnContent(column: Column, result: ResultData) {
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
          result.genes ?? []
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
          result.transcripts ?? []
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
  private handleRowClick(): void {
    storeManager.setData('selectedRow', this.selected ? undefined : this.index);

    const tapCompletedEvent = new CustomEvent('tapCompleted', {
      bubbles: true,
      detail: { rowIndex: this.index },
    });
    this.tr.dispatchEvent(tapCompletedEvent);
  }
}
