import { COLUMNS } from '../../global.js';
import StoreManager from '../../store/StoreManager';
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
    StoreManager.subscribe('selectedRow', this.selectedRow.bind(this));
    // `offset` の変更を監視し、テーブル行を更新
    StoreManager.subscribe('offset', this.updateTableRow.bind(this));
    // `rowCount` を監視し、範囲外の行を非表示にする
    // StoreManager.subscribe('rowCount', this.updateTableRow.bind(this));

    // StoreManager.bind('selectedRow', this);
    // StoreManager.bind('offset', this);
    // StoreManager.bind('rowCount', this);   // TODO: 必要ないようであれば削除する
  }

  /** 行がクリックされたときに選択状態をトグル */
  click() {
    StoreManager.setData('selectedRow', this.selected ? undefined : this.index);
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
      StoreManager.getData('isFetching') ||
      StoreManager.getData('isStoreUpdating')
    ) {
      return this.#setLoadingState();
    }

    // styleで範囲外の行(-out-of-range)は非表示
    const rowCount = StoreManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this.#setOutOfRangeState();
    }

    const result = StoreManager.getRecordByIndex(this.index);
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
      switch (column.id) {
        case 'togovar_id':
          return `<td class="togovar_id"><a href="" class="hyper-text -internal" target="_blank"></a></td>`;
        case 'refsnp_id':
          return `<td class="refsnp_id" data-remains=""><a href="" target="_blank" class="hyper-text -external"></a></td>`;
        case 'position':
          return `<td class="position"><div class="chromosome-position"><div class="chromosome"></div><div class="coordinate"></div></div></td>`;
        case 'ref_alt':
          return `<td class="ref_alt"><div class="ref-alt"><span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""><span class="sum"></span></span></div></td>`;
        case 'type':
          return `<td class="type"><div class="variant-type"></div></td>`;
        case 'gene':
          return `<td class="gene" data-remains=""><a href="" class="hyper-text -internal" target="_blank"></a></td>`;
        case 'alt_frequency': {
          const master: DatasetMasterItem[] =
            getSimpleSearchConditionMaster('dataset').items;
          return (
            `<td class="alt_frequency">` +
            master
              .filter((dataset) => dataset.has_freq)
              .map(
                (dataset) => `
                        <logarithmized-block-graph-frequency-view
                          data-dataset="${dataset.id}"
                          data-direction="vertical"
                        ></logarithmized-block-graph-frequency-view>
                        `
              )
              .join('') +
            `</td>`
          );
        }
        case 'consequence':
          return `<td class="consequence" data-remains=""><div class="consequence-item"></div></td>`;
        case 'clinical_significance':
          return `<td class="clinical_significance"><div class="clinical-significance" data-value=""></div><a class="hyper-text -internal" href="" target="_blank"></a><span class="icon" data-remains="" data-mgend=""></span></td>`;
        case 'alphamissense':
          return `<td class="alphamissense"><div class="variant-function" data-function=""></div></td>`;
        case 'sift':
          return `<td class="sift"><div class="variant-function" data-function=""></div></td>`;
        case 'polyphen':
          return `<td class="polyphen"><div class="variant-function" data-function=""></div></td>`;
        default:
          return '';
      }
    }).join('');
  }

  /** 各テーブルセルの要素をキャッシュ */
  #cacheTableCells() {
    // TogoVar ID
    this.tdTGVAnchor = this.tr.querySelector('td.togovar_id > a');

    // RefSNP ID
    this.tdRS = this.tr.querySelector('td.refsnp_id');
    this.tdRSAnchor = this.tdRS?.querySelector('a');

    // Position
    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.tdPositionChromosome = tdPosition?.querySelector('.chromosome');
    this.tdPositionCoordinate = tdPosition?.querySelector('.coordinate');

    // Ref/Alt
    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.tdRefAltRef = tdRefAlt?.querySelector('span.ref');
    this.tdRefAltAlt = tdRefAlt?.querySelector('span.alt');

    // Type
    this.tdType = this.tr.querySelector('td.type > .variant-type');

    // Gene
    this.tdGene = this.tr.querySelector('td.gene');
    this.tdGeneAnchor = this.tdGene?.querySelector('a');

    // Alt frequency
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

    // Consequence
    this.tdConsequence = this.tr.querySelector('td.consequence');
    this.tdConsequenceItem =
      this.tdConsequence?.querySelector('.consequence-item');

    // Clinical significance
    const tdClinical = this.tr.querySelector('td.clinical_significance');
    this.tdClinicalSign = tdClinical?.querySelector('.clinical-significance');
    this.tdClinicalAnchor = tdClinical?.querySelector('a');
    this.tdClinicalIcon = tdClinical?.querySelector('span.icon');

    // AlphaMissense
    const tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.tdAlphaMissenseFunction =
      tdAlphaMissense?.querySelector('.variant-function');

    // SIFT
    const tdSift = this.tr.querySelector('td.sift');
    this.tdSiftFunction = tdSift?.querySelector('.variant-function');

    // PolyPhen
    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.tdPolyphenFunction = tdPolyphen?.querySelector('.variant-function');
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

    console.log('updateColumnContent', column, result);
  }

  /** TogoVar ID */
  #updateTogovarId(element: HTMLAnchorElement, value: string, url: string) {
    if (!value) {
      element.href = '';
      element.textContent = '';
      return;
    }

    element.href = url;
    element.textContent = value;
  }

  /** RefSNP ID */
  // TODO: remainsがありますが、この行の場合remainsが使用されることはあるのでしょうか
  #updateRefSNP(values: string[]) {
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
    this.tdPositionChromosome.textContent = chromosome;
    this.tdPositionCoordinate.textContent = position.toString();
  }

  /* Position Ref/Alt */
  #updateRefAlt(reference: string, alternate: string) {
    const refalt = {
      ref: reference || '',
      alt: alternate || '',
    };
    this.tdRefAltRef.textContent = this.#formatRefAlt(refalt.ref);
    this.tdRefAltRef.dataset.sum = refalt.ref.length.toString();
    this.tdRefAltAlt.textContent = this.#formatRefAlt(refalt.alt);
    this.tdRefAltAlt.dataset.sum = refalt.alt.length.toString();
  }
  #formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /* Variant Type */
  #updateVariantType(element: HTMLDivElement, value: string) {
    const master: TypeMasterItem[] =
      getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /* Gene */
  #updateGene(symbols: GeneSymbol[]) {
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
    if (!mostConsequence) {
      this.tdConsequence.dataset.remains = '0';
      this.tdConsequenceItem.textContent = '';
      return;
    }

    const master: ConsequenceMasterItem[] =
      getSimpleSearchConditionMaster('consequence').items;
    const uniqueConsequences = Array.from(
      new Set(transcripts.flatMap((transcript) => transcript.consequence))
    );

    this.tdConsequence.dataset.remains = (
      uniqueConsequences.length - 1
    ).toString();
    this.tdConsequenceItem.textContent =
      master.find((consequence) => consequence.id === mostConsequence)?.label ||
      '';
  }

  /* Clinical significance */
  #updateClinicalSignificance(significances: Significance[]) {
    if (!significances || significances.length === 0) {
      this.tdClinicalSign.dataset.value = '';
      this.tdClinicalAnchor.textContent = '';
      this.tdClinicalAnchor.setAttribute('href', '');
      this.tdClinicalIcon.dataset.remains = '0';
      this.tdClinicalIcon.dataset.mgend = 'false';
      return;
    }

    const firstSignificance = significances[0];
    const firstCondition = firstSignificance.conditions?.[0];

    // Signにinterpretationsの値を設定
    this.tdClinicalSign.dataset.value = firstSignificance.interpretations[0];

    // `conditions` の最初の項目がある場合
    if (firstCondition) {
      this.tdClinicalSign.textContent = '';
      this.tdClinicalAnchor.textContent = firstCondition.name || '';

      if (firstCondition.medgen) {
        this.tdClinicalAnchor.setAttribute(
          'href',
          `/disease/${firstCondition.medgen}`
        );
      } else {
        // Anchorではなくdivにtextを表示
        this.tdClinicalSign.textContent = firstCondition.name;
        this.tdClinicalAnchor.textContent = '';
        this.tdClinicalAnchor.className = '';
      }
    } else {
      // conditions が存在しない場合
      this.tdClinicalSign.textContent = 'others';
      this.tdClinicalAnchor.textContent = '';
    }

    // 残りの significance の数を設定
    this.tdClinicalIcon.dataset.remains = (significances.length - 1).toString();

    // significances の中に mgend ソースがあるかをチェック
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    this.tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /* AlphaMissense */
  #updateAlphaMissense(value: number) {
    if (value === null) {
      this.tdAlphaMissenseFunction.textContent = '';
      this.tdAlphaMissenseFunction.dataset.function = '';
      return;
    }

    this.tdAlphaMissenseFunction.textContent = value.toString();

    switch (true) {
      case value < 0.34:
        this.tdAlphaMissenseFunction.dataset.function = 'LB';
        break;
      case value > 0.564:
        this.tdAlphaMissenseFunction.dataset.function = 'LP';
        break;
      default:
        this.tdAlphaMissenseFunction.dataset.function = 'A';
        break;
    }
  }

  /* SIFT */
  #updateSift(value: number) {
    if (value === null) {
      this.tdSiftFunction.textContent = '';
      this.tdSiftFunction.dataset.function = '';
      return;
    }

    this.tdSiftFunction.textContent = value.toString();
    this.tdSiftFunction.dataset.function = value >= 0.05 ? 'T' : 'D';
  }

  /* PolyPhen */
  #updatePolyphen(value: number) {
    if (value === null) {
      this.tdPolyphenFunction.textContent = '';
      this.tdPolyphenFunction.dataset.function = '';
      return;
    }

    this.tdPolyphenFunction.textContent = value.toString();
    switch (true) {
      case value > 0.908:
        this.tdPolyphenFunction.dataset.function = 'PROBD';
        break;
      case value > 0.446:
        this.tdPolyphenFunction.dataset.function = 'POSSD';
        break;
      case value >= 0:
        this.tdPolyphenFunction.dataset.function = 'B';
        break;
      default:
        this.tdPolyphenFunction.dataset.function = 'U';
        break;
    }
  }
}
