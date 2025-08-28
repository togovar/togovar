import { COLUMNS } from '../../global.js';
import { storeManager } from '../../store/StoreManager';
import '../../components/LogarithmizedBlockGraphFrequencyView';
import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import {
  ResultData,
  DatasetMasterItem,
  TypeMasterItem,
  ConsequenceMasterItem,
  Column,
  GeneSymbol,
  Frequency,
  TdFrequencies,
  FrequencyElement,
  Transcript,
  Significance,
} from '../../types';

const REF_ALT_SHOW_LENGTH = 4;

// 各カラムのHTMLテンプレートを定数として分離
const COLUMN_TEMPLATES = {
  togovar_id: '<td class="togovar_id"><a href="" class="hyper-text -internal" target="_blank"></a></td>',
  refsnp_id: '<td class="refsnp_id" data-remains=""><a href="" target="_blank" class="hyper-text -external"></a></td>',
  position: '<td class="position"><div class="chromosome-position"><div class="chromosome"></div><div class="coordinate"></div></div></td>',
  ref_alt: '<td class="ref_alt"><div class="ref-alt"><span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""><span class="sum"></span></span></div></td>',
  type: '<td class="type"><div class="variant-type"></div></td>',
  gene: '<td class="gene" data-remains=""><a href="" class="hyper-text -internal" target="_blank"></a></td>',
  consequence: '<td class="consequence" data-remains=""><div class="consequence-item"></div></td>',
  clinical_significance: '<td class="clinical_significance"><div class="clinical-significance" data-value=""></div><a class="hyper-text -internal" href="" target="_blank"></a><span class="icon" data-remains="" data-mgend=""></span></td>',
  alphamissense: '<td class="alphamissense"><div class="variant-function" data-function=""></div></td>',
  sift: '<td class="sift"><div class="variant-function" data-function=""></div></td>',
  polyphen: '<td class="polyphen"><div class="variant-function" data-function=""></div></td>',
} as const;

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
    // `rowCount` を監視し、範囲外の行を非表示にする
    // storeManager.subscribe('rowCount', this.updateTableRow.bind(this));

    // storeManager.bind('selectedRow', this);
    // storeManager.bind('offset', this);
    // storeManager.bind('rowCount', this);   // TODO: 必要ないようであれば削除する
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

  // bindings ///////////////////////////
  /** 選択された行の処理
   * @param {number} index - 選択された行のインデックス */
  selectedRow(index: number) {
    this.selected = index === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  /** オフセットが変更されたときに行を更新 */
  // offset() {
  //   this.updateTableRow();
  // }

  // TODO: 必要ないようであれば削除する
  // rowCount() {
  //   this.updateTableRow();
  // }
  ///////////////////////////////////////

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
    // console.log(result); // TODO:ここでデータは各行取れているけれども描画できていない。tdがcolspan12のまま
    if (!result || result === 'loading' || result === 'out of range') {
      return this.#setLoadingState();
    }

    this.#prepareTableData();

    // 各カラムのデータ更新
    COLUMNS.forEach((column) => this.#updateColumnContent(column, result));

    this.tr.classList.remove('-loading', '-out-of-range');
  }

  /**  テーブル行を作成する。
   *  @returns {HTMLTableRowElement} - 生成された行要素 */
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

  /** テーブルのHTMLを動的に生成
   * @returns {string} 生成されたHTML文字列 */
  #createTableCellHTML(): string {
    return COLUMNS.map((column) => {
      if (column.id === 'alt_frequency') {
        return this.#createFrequencyColumnHTML();
      }
      return COLUMN_TEMPLATES[column.id] || '';
    }).join('');
  }

  /** 頻度カラムのHTMLを生成 */
  #createFrequencyColumnHTML(): string {
    const master: DatasetMasterItem[] = getSimpleSearchConditionMaster('dataset').items;
    const frequencyElements = master
      .filter((dataset) => dataset.has_freq)
      .map((dataset) => 
        `<logarithmized-block-graph-frequency-view
          data-dataset="${dataset.id}"
          data-direction="vertical"
        ></logarithmized-block-graph-frequency-view>`
      )
      .join('');
    
    return `<td class="alt_frequency">${frequencyElements}</td>`;
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
    const tdPosition = this.tr.querySelector('td.position > .chromosome-position');
    this.tdPositionChromosome = tdPosition?.querySelector('.chromosome') || null;
    this.tdPositionCoordinate = tdPosition?.querySelector('.coordinate') || null;

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
    this.tdConsequenceItem = this.tdConsequence?.querySelector('.consequence-item') || null;

    // Clinical significance
    const tdClinical = this.tr.querySelector('td.clinical_significance');
    this.tdClinicalSign = tdClinical?.querySelector('.clinical-significance') || null;
    this.tdClinicalAnchor = tdClinical?.querySelector('a') || null;
    this.tdClinicalIcon = tdClinical?.querySelector('span.icon') || null;
  }

  /** 頻度関連要素をキャッシュ */
  #cacheFrequencyElements() {
    this.tdFrequencies = {};
    this.tr
      .querySelectorAll('td.alt_frequency > logarithmized-block-graph-frequency-view')
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
    this.tdAlphaMissenseFunction = tdAlphaMissense?.querySelector('.variant-function') || null;

    // SIFT
    const tdSift = this.tr.querySelector('td.sift');
    this.tdSiftFunction = tdSift?.querySelector('.variant-function') || null;

    // PolyPhen
    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.tdPolyphenFunction = tdPolyphen?.querySelector('.variant-function') || null;
  }

  /** 指定されたカラムの内容を更新 */
  #updateColumnContent(column: Column, result: ResultData) {
    // console.log(result);
    const columnHandlers = {
      togovar_id: () =>
        this.#updateTogovarId(
          this.tdTGVAnchor,
          result.id,
          `/variant/${result.id}`
        ),
      refsnp_id: () => this.#updateRefSNP(result.existing_variations),
      position: () => this.#updatePosition(result.chromosome, result.position),
      ref_alt: () => this.#updateRefAlt(result.reference, result.alternate),
      type: () => this.#updateVariantType(this.tdType, result.type),
      gene: () => this.#updateGene(result.symbols),
      alt_frequency: () => this.#updateAltFrequency(result.frequencies),
      consequence: () =>
        this.#updateConsequence(
          result.most_severe_consequence,
          result.transcripts
        ),
      clinical_significance: () =>
        this.#updateClinicalSignificance(result.significance),
      alphamissense: () => this.#updateAlphaMissense(result.alphamissense),
      sift: () => this.#updateSift(result.sift),
      polyphen: () => this.#updatePolyphen(result.polyphen),
    };
    columnHandlers[column.id]?.();
  }

  /** TogoVar ID */
  #updateTogovarId(element: HTMLAnchorElement | null, value: string, url: string) {
    if (!element || !value) {
      if (element) {
        element.href = '';
        element.textContent = '';
      }
      return;
    }

    element.href = url;
    element.textContent = value;
  }

  /** RefSNP ID */
  #updateRefSNP(values: string[]) {
    if (!this.tdRS || !this.tdRSAnchor) return;

    if (!values || values.length === 0) {
      this.tdRS.dataset.remains = '0';
      this.tdRSAnchor.href = '';
      this.tdRSAnchor.textContent = '';
      return;
    }

    this.tdRS.dataset.remains = (values.length - 1).toString();
    this.tdRSAnchor.href = `http://identifiers.org/dbsnp/${values[0]}`;
    this.tdRSAnchor.textContent = values[0];
  }

  /* Position */
  #updatePosition(chromosome: string, position: number) {
    if (this.tdPositionChromosome) {
      this.tdPositionChromosome.textContent = chromosome;
    }
    if (this.tdPositionCoordinate) {
      this.tdPositionCoordinate.textContent = position.toString();
    }
  }

  /* Position Ref/Alt */
  #updateRefAlt(reference: string, alternate: string) {
    const refData = this.#formatRefAltData(reference || '');
    const altData = this.#formatRefAltData(alternate || '');
    
    if (this.tdRefAltRef) {
      this.tdRefAltRef.textContent = refData.display;
      this.tdRefAltRef.dataset.sum = refData.length.toString();
    }
    
    if (this.tdRefAltAlt) {
      this.tdRefAltAlt.textContent = altData.display;
      this.tdRefAltAlt.dataset.sum = altData.length.toString();
    }
  }

  #formatRefAltData(sequence: string) {
    return {
      display: this.#formatRefAlt(sequence),
      length: sequence.length
    };
  }

  #formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /* Variant Type */
  #updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;
    
    const master: TypeMasterItem[] = getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /* Gene */
  #updateGene(symbols: GeneSymbol[]) {
    if (!this.tdGene || !this.tdGeneAnchor) return;

    if (!symbols || symbols.length === 0) {
      this.tdGene.dataset.remains = '0';
      this.tdGeneAnchor.href = '';
      this.tdGeneAnchor.textContent = '';
      return;
    }

    this.tdGene.dataset.remains = (symbols.length - 1).toString();
    this.tdGeneAnchor.href = `/gene/${symbols[0].id}`;
    this.tdGeneAnchor.textContent = symbols[0].name;
  }

  /* Alt Frequency */
  #updateAltFrequency(frequencies: Frequency[]) {
    const master: DatasetMasterItem[] =
      getSimpleSearchConditionMaster('dataset').items;

    master
      .filter((dataset) => dataset.has_freq)
      .forEach((dataset) => {
        const frequency = frequencies?.find(
          (freq) => freq.source === dataset.id
        );
        const element = this.tdFrequencies[dataset.id];
        if (element) {
          element.frequency = frequency;
        }
      });
  }

  /* Consequence */
  #updateConsequence(mostConsequence: string, transcripts: Transcript[]) {
    if (!this.tdConsequence || !this.tdConsequenceItem) return;

    if (!mostConsequence) {
      this.tdConsequence.dataset.remains = '0';
      this.tdConsequenceItem.textContent = '';
      return;
    }

    const master: ConsequenceMasterItem[] = getSimpleSearchConditionMaster('consequence').items;
    const uniqueConsequences = Array.from(
      new Set(transcripts.flatMap((transcript) => transcript.consequence))
    );

    this.tdConsequence.dataset.remains = (uniqueConsequences.length - 1).toString();
    this.tdConsequenceItem.textContent =
      master.find((consequence) => consequence.id === mostConsequence)?.label || '';
  }

  /* Clinical significance */
  #updateClinicalSignificance(significances: Significance[]) {
    if (!this.tdClinicalSign || !this.tdClinicalAnchor || !this.tdClinicalIcon) return;

    if (!significances || significances.length === 0) {
      this.#resetClinicalSignificance();
      return;
    }

    const firstSignificance = significances[0];
    const firstCondition = firstSignificance.conditions?.[0];

    // Set interpretations value
    this.tdClinicalSign.dataset.value = firstSignificance.interpretations[0];

    this.#updateClinicalCondition(firstCondition);
    this.#updateClinicalMetadata(significances);
  }

  #resetClinicalSignificance() {
    if (this.tdClinicalSign) this.tdClinicalSign.dataset.value = '';
    if (this.tdClinicalAnchor) {
      this.tdClinicalAnchor.textContent = '';
      this.tdClinicalAnchor.setAttribute('href', '');
    }
    if (this.tdClinicalIcon) {
      this.tdClinicalIcon.dataset.remains = '0';
      this.tdClinicalIcon.dataset.mgend = 'false';
    }
  }

  #updateClinicalCondition(firstCondition: any) {
    if (!this.tdClinicalSign || !this.tdClinicalAnchor) return;

    if (firstCondition) {
      this.tdClinicalSign.textContent = '';
      this.tdClinicalAnchor.textContent = firstCondition.name || '';

      if (firstCondition.medgen) {
        this.tdClinicalAnchor.setAttribute('href', `/disease/${firstCondition.medgen}`);
      } else {
        // Display in div instead of anchor when no medgen
        this.tdClinicalSign.textContent = firstCondition.name;
        this.tdClinicalAnchor.textContent = '';
        this.tdClinicalAnchor.className = '';
      }
    } else {
      // No conditions exist
      this.tdClinicalSign.textContent = 'others';
      this.tdClinicalAnchor.textContent = '';
    }
  }

  #updateClinicalMetadata(significances: Significance[]) {
    if (!this.tdClinicalIcon) return;

    // Set remaining significance count
    this.tdClinicalIcon.dataset.remains = (significances.length - 1).toString();

    // Check if mgend source exists in significances
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    this.tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /* Function prediction common logic */
  #updateFunctionPrediction(
    element: HTMLDivElement | null, 
    value: number | null, 
    getFunctionClass: (value: number) => string
  ) {
    if (!element) return;
    
    if (value === null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = value.toString();
    element.dataset.function = getFunctionClass(value);
  }

  /* AlphaMissense */
  #updateAlphaMissense(value: number) {
    this.#updateFunctionPrediction(
      this.tdAlphaMissenseFunction, 
      value, 
      (val) => {
        if (val < 0.34) return 'LB';
        if (val > 0.564) return 'LP';
        return 'A';
      }
    );
  }

  /* SIFT */
  #updateSift(value: number) {
    this.#updateFunctionPrediction(
      this.tdSiftFunction, 
      value, 
      (val) => val >= 0.05 ? 'T' : 'D'
    );
  }

  /* PolyPhen */
  #updatePolyphen(value: number) {
    this.#updateFunctionPrediction(
      this.tdPolyphenFunction, 
      value, 
      (val) => {
        if (val > 0.908) return 'PROBD';
        if (val > 0.446) return 'POSSD';
        if (val >= 0) return 'B';
        return 'U';
      }
    );
  }
}
