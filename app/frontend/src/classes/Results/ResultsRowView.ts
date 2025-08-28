import { COLUMNS } from '../../global.js';
import { storeManager } from '../../store/StoreManager';
import '../../components/LogarithmizedBlockGraphFrequencyView';
import {
  ResultData,
  Column,
  TdFrequencies,
  FrequencyElement,
} from '../../types';
import {
  COLUMN_TEMPLATES,
  createFrequencyColumnHTML,
} from './ResultsRowTemplates';
import { ResultsRowUpdaters } from './ResultsRowUpdaters';

export class ResultsRowView {
  index: number;
  selected: boolean;
  tr: HTMLTableRowElement;

  // TogoVar ID
  tdTGVAnchor: HTMLAnchorElement | null;
  // RefSNP ID
  tdRS: HTMLTableCellElement | null;
  tdRSAnchor: HTMLAnchorElement | null;
  // Position
  tdPositionChromosome: HTMLDivElement | null;
  tdPositionCoordinate: HTMLDivElement | null;
  // Ref/Alt
  tdRefAltRef: HTMLSpanElement | null;
  tdRefAltAlt: HTMLSpanElement | null;
  // Type
  tdType: HTMLDivElement | null;
  // Gene
  tdGene: HTMLTableCellElement | null;
  tdGeneAnchor: HTMLAnchorElement | null;
  // Alt frequency
  tdFrequencies: TdFrequencies;
  // Consequence
  tdConsequence: HTMLTableCellElement | null;
  tdConsequenceItem: HTMLDivElement | null;
  // Clinical significance
  tdClinicalSign: HTMLDivElement | null;
  tdClinicalAnchor: HTMLAnchorElement | null;
  tdClinicalIcon: HTMLSpanElement | null;
  // AlphaMissense
  tdAlphaMissenseFunction: HTMLDivElement | null;
  // SIFT
  tdSiftFunction: HTMLDivElement | null;
  // PolyPhen
  tdPolyphenFunction: HTMLDivElement | null;

  /**
   * @param {number} index - テーブル内の行のインデックス */
  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = this.#createTableRow();

    // `selectedRow` の変更を監視し、selectedRow() を活用
    storeManager.subscribe('selectedRow', this.selectedRow.bind(this));
    // `offset` の変更を監視し、テーブル行を更新
    storeManager.subscribe('offset', this.updateTableRow.bind(this));
  }

  /** 行がクリックされたときに選択状態をトグル */
  click() {
    storeManager.setData('selectedRow', this.selected ? undefined : this.index);

    // Dispatch custom event to notify tap completion
    const tapCompletedEvent = new CustomEvent('tapCompleted', {
      bubbles: true,
      detail: { rowIndex: this.index },
    });
    this.tr.dispatchEvent(tapCompletedEvent);
  }

  /** 選択された行の処理 */
  selectedRow(index: number) {
    this.selected = index === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  /** テーブル行のデータを更新 */
  updateTableRow() {
    if (
      storeManager.getData('isFetching') ||
      storeManager.getData('isStoreUpdating')
    ) {
      return this.#setLoadingState();
    }

    // styleで範囲外の行(-out-of-range)は非表示
    const rowCount = storeManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this.#setOutOfRangeState();
    }

    const result = storeManager.getRecordByIndex(this.index);
    if (!result || result === 'loading' || result === 'out of range') {
      return this.#setLoadingState();
    }

    this.#prepareTableData();

    // 各カラムのデータ更新
    COLUMNS.forEach((column) => this.#updateColumnContent(column, result));

    this.tr.classList.remove('-loading', '-out-of-range');
  }

  /** テーブル行を作成する */
  #createTableRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.classList.add('-loading');
    tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    tr.addEventListener('click', this.click.bind(this));
    return tr;
  }

  /** ロード状態を設定 */
  #setLoadingState() {
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /** 範囲外状態を設定 */
  #setOutOfRangeState() {
    this.tr.classList.add('-out-of-range');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  #prepareTableData() {
    this.tr.innerHTML = this.#createTableCellHTML();
    this.#cacheTableCells();
  }

  /** テーブルのHTMLを動的に生成 */
  #createTableCellHTML(): string {
    return COLUMNS.map((column) => {
      if (column.id === 'alt_frequency') {
        return createFrequencyColumnHTML();
      }
      return COLUMN_TEMPLATES[column.id] || '';
    }).join('');
  }

  /** 各テーブルセルの要素をキャッシュ */
  #cacheTableCells() {
    this.#cacheBasicElements();
    this.#cacheFrequencyElements();
    this.#cacheFunctionElements();
  }

  /** 基本的な要素をキャッシュ */
  #cacheBasicElements() {
    // TogoVar ID
    this.tdTGVAnchor = this.tr.querySelector('td.togovar_id > a');

    // RefSNP ID
    this.tdRS = this.tr.querySelector('td.refsnp_id');
    this.tdRSAnchor = this.tdRS?.querySelector('a') || null;

    // Position
    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.tdPositionChromosome =
      tdPosition?.querySelector('.chromosome') || null;
    this.tdPositionCoordinate =
      tdPosition?.querySelector('.coordinate') || null;

    // Ref/Alt
    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.tdRefAltRef = tdRefAlt?.querySelector('span.ref') || null;
    this.tdRefAltAlt = tdRefAlt?.querySelector('span.alt') || null;

    // Type
    this.tdType = this.tr.querySelector('td.type > .variant-type');

    // Gene
    this.tdGene = this.tr.querySelector('td.gene');
    this.tdGeneAnchor = this.tdGene?.querySelector('a') || null;

    // Consequence
    this.tdConsequence = this.tr.querySelector('td.consequence');
    this.tdConsequenceItem =
      this.tdConsequence?.querySelector('.consequence-item') || null;

    // Clinical significance
    const tdClinical = this.tr.querySelector('td.clinical_significance');
    this.tdClinicalSign =
      tdClinical?.querySelector('.clinical-significance') || null;
    this.tdClinicalAnchor = tdClinical?.querySelector('a') || null;
    this.tdClinicalIcon = tdClinical?.querySelector('span.icon') || null;
  }

  /** 頻度関連要素をキャッシュ */
  #cacheFrequencyElements() {
    this.tdFrequencies = {};
    this.tr
      .querySelectorAll(
        'td.alt_frequency > logarithmized-block-graph-frequency-view'
      )
      .forEach((elm) => {
        const element = elm as FrequencyElement;
        const datasetId = element.dataset.dataset;
        if (datasetId) {
          this.tdFrequencies[datasetId] = element;
        }
      });
  }

  /** 機能予測関連要素をキャッシュ */
  #cacheFunctionElements() {
    // AlphaMissense
    const tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.tdAlphaMissenseFunction =
      tdAlphaMissense?.querySelector('.variant-function') || null;

    // SIFT
    const tdSift = this.tr.querySelector('td.sift');
    this.tdSiftFunction = tdSift?.querySelector('.variant-function') || null;

    // PolyPhen
    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.tdPolyphenFunction =
      tdPolyphen?.querySelector('.variant-function') || null;
  }

  /** 指定されたカラムの内容を更新 */
  #updateColumnContent(column: Column, result: ResultData) {
    const columnHandlers = {
      togovar_id: () =>
        ResultsRowUpdaters.updateTogovarId(
          this.tdTGVAnchor,
          result.id,
          `/variant/${result.id}`
        ),
      refsnp_id: () =>
        ResultsRowUpdaters.updateRefSNP(
          this.tdRS,
          this.tdRSAnchor,
          result.existing_variations
        ),
      position: () =>
        ResultsRowUpdaters.updatePosition(
          this.tdPositionChromosome,
          this.tdPositionCoordinate,
          result.chromosome,
          result.position
        ),
      ref_alt: () =>
        ResultsRowUpdaters.updateRefAlt(
          this.tdRefAltRef,
          this.tdRefAltAlt,
          result.reference,
          result.alternate
        ),
      type: () =>
        ResultsRowUpdaters.updateVariantType(this.tdType, result.type),
      gene: () =>
        ResultsRowUpdaters.updateGene(
          this.tdGene,
          this.tdGeneAnchor,
          result.symbols
        ),
      alt_frequency: () =>
        ResultsRowUpdaters.updateAltFrequency(
          this.tdFrequencies,
          result.frequencies
        ),
      consequence: () =>
        ResultsRowUpdaters.updateConsequence(
          this.tdConsequence,
          this.tdConsequenceItem,
          result.most_severe_consequence,
          result.transcripts
        ),
      clinical_significance: () =>
        ResultsRowUpdaters.updateClinicalSignificance(
          this.tdClinicalSign,
          this.tdClinicalAnchor,
          this.tdClinicalIcon,
          result.significance
        ),
      alphamissense: () =>
        ResultsRowUpdaters.updateAlphaMissense(
          this.tdAlphaMissenseFunction,
          result.alphamissense
        ),
      sift: () =>
        ResultsRowUpdaters.updateSift(this.tdSiftFunction, result.sift),
      polyphen: () =>
        ResultsRowUpdaters.updatePolyphen(
          this.tdPolyphenFunction,
          result.polyphen
        ),
    };
    columnHandlers[column.id]?.();
  }
}
