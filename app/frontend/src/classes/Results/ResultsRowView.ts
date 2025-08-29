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

/**
 * 検索結果テーブルの1行を管理するクラス
 *
 * 各行のDOM要素の作成、データバインディング、状態管理を担当する
 * storeManagerからのデータ変更通知を受け取り、対応するDOM要素を更新する
 */
export class ResultsRowView {
  /** 行のインデックス番号 */
  index: number;
  /** 行の選択状態 */
  selected: boolean;
  /** テーブル行要素 */
  tr: HTMLTableRowElement;

  // DOM要素のキャッシュ
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
   * ResultsRowViewのコンストラクタ
   *
   * @param index - テーブル内の行のインデックス番号
   */
  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = this._createTableRow();

    // `selectedRow` の変更を監視し、selectedRow() を活用
    storeManager.subscribe('selectedRow', this.selectedRow.bind(this));
    // `offset` の変更を監視し、テーブル行を更新
    storeManager.subscribe('offset', this.updateTableRow.bind(this));
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * 行がクリックされたときの処理
   *
   * 選択状態をトグルし、カスタムイベントを発火する
   */
  click() {
    storeManager.setData('selectedRow', this.selected ? undefined : this.index);

    // Dispatch custom event to notify tap completion
    const tapCompletedEvent = new CustomEvent('tapCompleted', {
      bubbles: true,
      detail: { rowIndex: this.index },
    });
    this.tr.dispatchEvent(tapCompletedEvent);
  }

  /**
   * 選択行の変更を処理
   *
   * @param index - 選択された行のインデックス
   */
  selectedRow(index: number) {
    this.selected = index === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  /**
   * テーブル行のデータを更新
   *
   * storeManagerからの通知を受けて行の表示内容を更新する
   * データの取得状況に応じて適切な表示状態を設定する
   */
  updateTableRow() {
    if (
      storeManager.getData('isFetching') ||
      storeManager.getData('isStoreUpdating')
    ) {
      return this._setLoadingState();
    }

    // styleで範囲外の行(-out-of-range)は非表示
    const rowCount = storeManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this._setOutOfRangeState();
    }

    const result = storeManager.getRecordByIndex(this.index);
    if (!result || result === 'loading' || result === 'out of range') {
      return this._setLoadingState();
    }

    this._prepareTableData();

    // 各カラムのデータ更新
    COLUMNS.forEach((column) => this._updateColumnContent(column, result));

    this.tr.classList.remove('-loading', '-out-of-range');
  }

  // ========================================
  // Private Methods
  // ========================================
  /**
   * テーブル行要素を作成
   *
   * @returns 作成されたテーブル行要素
   */
  private _createTableRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.classList.add('-loading');
    tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    tr.addEventListener('click', this.click.bind(this));
    return tr;
  }

  /**
   * 行をローディング状態に設定
   */
  private _setLoadingState() {
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /**
   * 行を範囲外状態に設定
   */
  private _setOutOfRangeState() {
    this.tr.classList.add('-out-of-range');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /**
   * テーブルデータの準備
   *
   * HTMLの生成とDOM要素のキャッシュを実行
   */
  private _prepareTableData() {
    this.tr.innerHTML = this._createTableCellHTML();
    this._cacheTableCells();
  }

  /**
   * テーブルセルのHTMLを動的に生成
   *
   * @returns 生成されたHTML文字列
   */
  private _createTableCellHTML(): string {
    return COLUMNS.map((column) => {
      if (column.id === 'alt_frequency') {
        return createFrequencyColumnHTML();
      }
      return COLUMN_TEMPLATES[column.id] || '';
    }).join('');
  }

  /**
   * テーブルセル要素をキャッシュ
   *
   * パフォーマンス向上のため、頻繁にアクセスするDOM要素を事前にキャッシュ
   */
  private _cacheTableCells() {
    this._cacheBasicElements();
    this._cacheFrequencyElements();
    this._cacheFunctionElements();
  }

  /**
   * 基本的なテーブルセル要素をキャッシュ
   */
  private _cacheBasicElements() {
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

  /**
   * 頻度関連のテーブルセル要素をキャッシュ
   */
  private _cacheFrequencyElements() {
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

  /**
   * 機能予測関連のテーブルセル要素をキャッシュ
   */
  private _cacheFunctionElements() {
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

  /**
   * 指定されたカラムの内容を更新
   *
   * @param column - 更新対象のカラム定義
   * @param result - 表示データ
   */
  private _updateColumnContent(column: Column, result: ResultData) {
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
