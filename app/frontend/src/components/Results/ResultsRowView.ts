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

type ResultsRowCells = {
  togovarIdCell: HTMLTableCellElement | null;
  refsnpCell: HTMLTableCellElement | null;
  refsnpContent: HTMLDivElement | null;
  refsnpRemains: HTMLSpanElement | null;
  positionChromosome: HTMLDivElement | null;
  positionCoordinate: HTMLDivElement | null;
  refElement: HTMLSpanElement | null;
  altElement: HTMLSpanElement | null;
  typeElement: HTMLDivElement | null;
  geneCell: HTMLTableCellElement | null;
  geneContent: HTMLDivElement | null;
  geneRemains: HTMLSpanElement | null;
  frequencyElements: TdFrequencies;
  consequenceCell: HTMLTableCellElement | null;
  consequenceContent: HTMLDivElement | null;
  consequenceItem: HTMLDivElement | null;
  consequenceRemains: HTMLSpanElement | null;
  clinicalContainer: HTMLDivElement | null;
  clinicalSignificance: HTMLDivElement | null;
  clinicalRemains: HTMLSpanElement | null;
  clinicalIcon: HTMLSpanElement | null;
  caddFunction: HTMLDivElement | null;
  alphaMissenseFunction: HTMLDivElement | null;
  siftFunction: HTMLDivElement | null;
  polyphenFunction: HTMLDivElement | null;
  splicingVariantCell: HTMLTableCellElement | null;
};

/**
 * 行DOMを破棄・再生成した直後に古い参照を残さないため、セル参照の初期値を1箇所で作る。
 */
function createEmptyCells(): ResultsRowCells {
  return {
    togovarIdCell: null,
    refsnpCell: null,
    refsnpContent: null,
    refsnpRemains: null,
    positionChromosome: null,
    positionCoordinate: null,
    refElement: null,
    altElement: null,
    typeElement: null,
    geneCell: null,
    geneContent: null,
    geneRemains: null,
    frequencyElements: {},
    consequenceCell: null,
    consequenceContent: null,
    consequenceItem: null,
    consequenceRemains: null,
    clinicalContainer: null,
    clinicalSignificance: null,
    clinicalRemains: null,
    clinicalIcon: null,
    caddFunction: null,
    alphaMissenseFunction: null,
    siftFunction: null,
    polyphenFunction: null,
    splicingVariantCell: null,
  };
}

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
  private cells = createEmptyCells();

  /**
   * 列更新時に毎回ハンドラ表を作らないため、行インスタンスごとに一度だけ束縛する。
   */
  private readonly columnContentUpdaters: Record<
    string,
    (result: ResultData) => void
  > = {
    togovar_id: (result) =>
      ResultsColumnUpdater.updateTogovarId(
        this.cells.togovarIdCell,
        result.id,
        `/variant/${result.id}`
      ),
    refsnp_id: (result) =>
      ResultsColumnUpdater.updateRefSNP(
        this.cells.refsnpContent,
        this.cells.refsnpRemains,
        result.existing_variations
      ),
    position: (result) =>
      ResultsColumnUpdater.updatePosition(
        this.cells.positionChromosome,
        this.cells.positionCoordinate,
        result.chromosome,
        result.position
      ),
    ref_alt: (result) =>
      ResultsColumnUpdater.updateRefAlt(
        this.cells.refElement,
        this.cells.altElement,
        result.reference,
        result.alternate
      ),
    type: (result) =>
      ResultsColumnUpdater.updateVariantType(
        this.cells.typeElement,
        result.type
      ),
    gene: (result) =>
      ResultsColumnUpdater.updateGene(
        this.cells.geneContent,
        this.cells.geneRemains,
        result.genes ?? []
      ),
    alt_frequency: (result) =>
      ResultsColumnUpdater.updateAltFrequency(
        this.cells.frequencyElements,
        result.frequencies
      ),
    consequence: (result) =>
      ResultsColumnUpdater.updateConsequence(
        this.cells.consequenceItem,
        this.cells.consequenceRemains,
        result.most_severe_consequence,
        result.transcripts ?? []
      ),
    clinical_significance: (result) =>
      ResultsColumnUpdater.updateClinicalSignificance(
        this.cells.clinicalSignificance,
        this.cells.clinicalContainer,
        this.cells.clinicalRemains,
        this.cells.clinicalIcon,
        result.significance
      ),
    cadd: (result) =>
      ResultsColumnUpdater.updateCadd(this.cells.caddFunction, result.cadd_phred),
    alphamissense: (result) =>
      ResultsColumnUpdater.updateAlphaMissense(
        this.cells.alphaMissenseFunction,
        result.alphamissense
      ),
    sift: (result) =>
      ResultsColumnUpdater.updateSift(this.cells.siftFunction, result.sift),
    polyphen: (result) =>
      ResultsColumnUpdater.updatePolyphen(
        this.cells.polyphenFunction,
        result.polyphen
      ),
    splicingvariant: (result) =>
      ResultsColumnUpdater.updateSplicingVariant(
        this.cells.splicingVariantCell,
        result.sscv_db,
        result.external_links?.sscv_db ?? result.external_link?.sscv_db
      ),
  };

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

    this.cells = createEmptyCells();

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
    this.cells.togovarIdCell = this.tr.querySelector('td.togovar_id');

    this.cells.refsnpCell = this.tr.querySelector('td.refsnp_id');
    this.cells.refsnpContent =
      this.cells.refsnpCell?.querySelector('.remains-content') || null;
    this.cells.refsnpRemains =
      this.cells.refsnpCell?.querySelector('.remains-badge') || null;

    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.cells.positionChromosome =
      tdPosition?.querySelector('.chromosome') || null;
    this.cells.positionCoordinate =
      tdPosition?.querySelector('.coordinate') || null;

    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.cells.refElement = tdRefAlt?.querySelector('span.ref') || null;
    this.cells.altElement = tdRefAlt?.querySelector('span.alt') || null;

    this.cells.typeElement = this.tr.querySelector('td.type > .variant-type');

    this.cells.geneCell = this.tr.querySelector('td.gene');
    this.cells.geneContent =
      this.cells.geneCell?.querySelector('.remains-content') || null;
    this.cells.geneRemains =
      this.cells.geneCell?.querySelector('.remains-badge') || null;

    this.cells.consequenceCell = this.tr.querySelector('td.consequence');
    this.cells.consequenceContent =
      this.cells.consequenceCell?.querySelector('.remains-content') || null;
    this.cells.consequenceItem =
      this.cells.consequenceCell?.querySelector('.consequence-item') || null;
    this.cells.consequenceRemains =
      this.cells.consequenceCell?.querySelector('.remains-badge') || null;

    const tdClinical = this.tr.querySelector<HTMLTableCellElement>(
      'td.clinical_significance'
    );
    const clinicalFlex =
      tdClinical?.querySelector<HTMLDivElement>(
        '.clinical-significance-flex'
      ) || null;
    this.cells.clinicalContainer = clinicalFlex;
    this.cells.clinicalSignificance =
      tdClinical?.querySelector('.clinical-significance') || null;
    this.cells.clinicalRemains =
      tdClinical?.querySelector('.clinical-remains') || null;
    this.cells.clinicalIcon = tdClinical?.querySelector('span.icon') || null;
  }

  /**
   * frequency-block-viewは複数あり、データセット名をキーにすることで
   * 後からO(1)で対象要素を更新できる。
   */
  private cacheFrequencyElements() {
    this.cells.frequencyElements = {};
    this.tr
      .querySelectorAll('td.alt_frequency > frequency-block-view')
      .forEach((elm) => {
        const element = elm as FrequencyElement;
        const datasetId = element.dataset.dataset;
        if (datasetId) {
          this.cells.frequencyElements[datasetId] = element;
        }
      });
  }

  /**
   * 予測系カラムはすべて同じHTML構造（td.xxx > .variant-effect-prediction-badge）を持つため、
   * カラムIDで識別してまとめてキャッシュする。
   */
  private cacheFunctionElements() {
    const tdCadd = this.tr.querySelector('td.cadd');
    this.cells.caddFunction =
      tdCadd?.querySelector('.variant-effect-prediction-badge') || null;

    const tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.cells.alphaMissenseFunction =
      tdAlphaMissense?.querySelector('.variant-effect-prediction-badge') ||
      null;

    const tdSift = this.tr.querySelector('td.sift');
    this.cells.siftFunction =
      tdSift?.querySelector('.variant-effect-prediction-badge') || null;

    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.cells.polyphenFunction =
      tdPolyphen?.querySelector('.variant-effect-prediction-badge') || null;

    this.cells.splicingVariantCell = this.tr.querySelector('td.splicingvariant');
  }

  // ================================================================
  // 列コンテンツ更新
  // ================================================================

  /**
   * 列IDをキーにしたディスパッチテーブルにすることで、列追加時の変更箇所を局所化する。
   * 対応するハンドラが存在しない列IDは?. で安全にスキップする。
   */
  private updateColumnContent(column: Column, result: ResultData) {
    this.columnContentUpdaters[column.id]?.(result);
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
