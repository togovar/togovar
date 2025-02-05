import { COLUMNS } from '../../global.js';
import StoreManager from '../../store/StoreManager.js';
import '../../components/LogarithmizedBlockGraphFrequencyView';
import { getSimpleSearchConditionMaster } from '../../store/searchManager.js';

const REF_ALT_SHOW_LENGTH = 4;

export default class ResultsRowView {
  index: number;
  selected: boolean;
  tr: HTMLTableRowElement;
  tdTGVAnchor: HTMLAnchorElement;
  tdRS: HTMLTableCellElement;
  tdRSAnchor: HTMLAnchorElement;
  tdPositionChromosome: HTMLTableCellElement;
  tdPositionCoordinate: HTMLTableCellElement;
  tdRefAltRef: HTMLTableCellElement;
  tdRefAltAlt: HTMLTableCellElement;
  tdGene: HTMLTableCellElement;
  tdGeneAnchor: HTMLAnchorElement;
  tdConsequence: HTMLTableCellElement;
  tdConsequenceItem: HTMLTableCellElement;
  tdFrequencies: HTMLElement;
  tdClinicalSign: HTMLTableCellElement;
  tdClinicalAnchor: HTMLAnchorElement;
  tdClinicalIcon: HTMLTableCellElement;
  tdAlphaMissenseFunction: HTMLTableCellElement;
  tdSiftFunction: HTMLTableCellElement;
  tdPolyphenFunction: HTMLTableCellElement;
  tdSift: HTMLTableCellElement;
  tdPolyphen: HTMLTableCellElement;
  tdAlphaMissense: HTMLTableCellElement;
  tdClinical: HTMLTableCellElement;

  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = document.createElement('tr');
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    this.tr.addEventListener('click', this.click.bind(this));
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    // StoreManager.bind('rowCount', this);   // TODO: 必要ないようであれば削除する
  }

  click() {
    StoreManager.setData('selectedRow', this.selected ? undefined : this.index);
  }

  // bindings ///////////////////////////
  selectedRow(index: number) {
    if (index === this.index) {
      this.selected = true;
      this.tr.classList.add('-selected');
    } else {
      this.selected = false;
      this.tr.classList.remove('-selected');
    }
  }

  offset() {
    this.updateTableRow();
  }

  // TODO: 必要ないようであれば削除する
  // rowCount() {
  //   this.updateTableRow();
  // }
  ///////////////////////////////////////

  updateTableRow() {
    if (
      StoreManager.getData('isFetching') ||
      StoreManager.getData('isStoreUpdating')
    ) {
      this.#setLoadingState();
      return;
    }

    const rowCount = StoreManager.getData('rowCount');
    if (rowCount <= this.index) {
      this.#setOutOfRangeState();
      return;
    }

    const result = StoreManager.getRecordByIndex(this.index);
    if (!result || result === 'loading' || result === 'out of range') {
      this.#setLoadingState();
      return;
    }

    if (this.tr.classList.contains('-loading')) {
      this.#prepareTableData();
    }

    this.tr.classList.remove('-loading', '-out-of-range');

    // 各カラムのデータ更新
    COLUMNS.forEach((column) => this.#updateColumnContent(column, result));
  }

  #setLoadingState() {
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  #setOutOfRangeState() {
    this.tr.classList.add('-out-of-range');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  #updateColumnContent(column, result) {
    // console.log(column);
    // console.log(result);
    switch (column.id) {
      case 'togovar_id':
        this.#updateTogovarId(
          this.tdTGVAnchor,
          result.id,
          `/variant/${result.id}`
        );
        break;
      case 'refsnp_id':
        this.#updateRefSNP(result);
        break;
      case 'position':
        this.#updatePosition(result);
        break;
      case 'ref_alt':
        this.#updateRefAlt(result);
        break;
      case 'type':
        this.#updateVariantType(this.tdType, result.type);
        break;
      case 'gene':
        this.#updateGene(result);
        break;
      case 'alt_frequency':
        this.#updateAltFrequency(result);
        break;
      case 'consequence':
        this.#updateConsequence(result);
        break;
      case 'clinical_significance':
        this.#updateClinicalSignificance(result);
        break;
      case 'alphamissense':
        this.#updateAlphaMissense(result);
        break;
      case 'sift':
        this.#updateSift(result);
        break;
      case 'polyphen':
        this.#updatePolyphen(result);
        break;
    }
  }

  #updateTogovarId(element, value, url) {
    if (value) {
      element.href = url;
      element.textContent = value;
    } else {
      element.href = '';
      element.textContent = '';
    }
  }

  #updateRefSNP(result) {
    if (result.existing_variations) {
      this.tdRS.dataset.remains = (
        result.existing_variations.length - 1
      ).toString();
      this.tdRSAnchor.href = `http://identifiers.org/dbsnp/${result.existing_variations[0]}`;
      this.tdRSAnchor.textContent = result.existing_variations[0];
    } else {
      this.tdRS.dataset.remains = '0';
      this.tdRSAnchor.href = '';
      this.tdRSAnchor.textContent = '';
    }
  }

  #updatePosition(result) {
    this.tdPositionChromosome.textContent = result.chromosome;
    this.tdPositionCoordinate.textContent = result.position;
  }

  #updateRefAlt(result) {
    const refalt = {
      ref: result.reference || '',
      alt: result.alternate || '',
    };
    this.tdRefAltRef.textContent = this.#formatRefAlt(refalt.ref);
    this.tdRefAltRef.dataset.sum = refalt.ref.length;
    this.tdRefAltAlt.textContent = this.#formatRefAlt(refalt.alt);
    this.tdRefAltAlt.dataset.sum = refalt.alt.length;
  }

  #formatRefAlt(sequence) {
    return (
      sequence.substr(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  #updateVariantType(element, value) {
    const master = getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  #updateGene(result) {
    if (result.symbols && result.symbols.length) {
      this.tdGene.dataset.remains = (result.symbols.length - 1).toString();
      this.tdGeneAnchor.href = `/gene/${result.symbols[0].id}`;
      this.tdGeneAnchor.textContent = result.symbols[0].name;
    } else {
      this.tdGene.dataset.remains = '0';
      this.tdGeneAnchor.href = '';
      this.tdGeneAnchor.textContent = '';
    }
  }

  #updateAltFrequency(result) {
    const master = getSimpleSearchConditionMaster('dataset');
    for (const dataset of master.items) {
      if (!dataset.has_freq) continue;
      const frequency = result.frequencies
        ? result.frequencies.find(
            (frequency) => frequency.source === dataset.id
          )
        : undefined;
      this.tdFrequencies[dataset.id].frequency = frequency;
    }
  }

  #updateConsequence(result) {
    if (result.most_severe_consequence) {
      const master = getSimpleSearchConditionMaster('consequence');
      const unique = [
        ...new Set(
          result.transcripts.reduce(
            (accumulator, transcript) =>
              accumulator.concat(transcript.consequences),
            []
          )
        ),
      ];
      this.tdConsequence.dataset.remains = (unique.length - 1).toString();
      this.tdConsequenceItem.textContent = master.items.find(
        (consequence) => consequence.id === result.most_severe_consequence
      ).label;
    } else {
      this.tdConsequence.dataset.remains = '0';
      this.tdConsequenceItem.textContent = '';
    }
  }

  #updateClinicalSignificance(result) {
    if (result.significance && result.significance.length) {
      this.tdClinicalSign.dataset.value =
        result.significance[0].interpretations[0];

      if (result.significance[0].conditions[0] !== undefined) {
        this.tdClinicalSign.textContent = '';
        if (result.significance[0].conditions[0].name) {
          this.tdClinicalAnchor.textContent =
            result.significance[0].conditions[0].name;
        }

        if (result.significance[0].conditions[0]?.medgen !== undefined) {
          this.tdClinicalAnchor.setAttribute(
            'href',
            `/disease/${result.significance[0].conditions[0].medgen}`
          );
        } else {
          this.tdClinicalSign.textContent =
            result.significance[0].conditions[0].name;
          this.tdClinicalAnchor.textContent = '';
          this.tdClinicalAnchor.className = '';
        }
      } else {
        this.tdClinicalSign.textContent = 'others';
        this.tdClinicalAnchor.textContent = '';
      }

      this.tdClinicalIcon.dataset.remains = (
        result.significance.length - 1
      ).toString();

      // Check if any medgen exists in result.significance
      const hasMedgen = result.significance.some(
        (significanceItem) => significanceItem.source === 'mgend'
      );

      this.tdClinicalIcon.dataset.mgend = hasMedgen;
    } else {
      this.tdClinicalSign.dataset.value = '';
      this.tdClinicalAnchor.textContent = '';
      this.tdClinicalAnchor.setAttribute('href', '');
      this.tdClinicalIcon.dataset.remains = '0';
      this.tdClinicalIcon.dataset.mgend = false;
    }
  }

  #updateAlphaMissense(result) {
    {
      if (result.alphamissense !== null) {
        this.tdAlphaMissenseFunction.textContent = result.alphamissense;
        switch (true) {
          case result.alphamissense < 0.34:
            this.tdAlphaMissenseFunction.dataset.function = 'LB';
            break;
          case result.alphamissense > 0.564:
            this.tdAlphaMissenseFunction.dataset.function = 'LP';
            break;
          default:
            this.tdAlphaMissenseFunction.dataset.function = 'A';
            break;
        }
      } else {
        this.tdAlphaMissenseFunction.textContent = '';
        this.tdAlphaMissenseFunction.dataset.function = '';
      }
    }
  }

  #updateSift(result) {
    {
      if (result.sift !== null) {
        this.tdSiftFunction.textContent = result.sift;
        this.tdSiftFunction.dataset.function = result.sift >= 0.05 ? 'T' : 'D';
      } else {
        this.tdSiftFunction.textContent = '';
        this.tdSiftFunction.dataset.function = '';
      }
    }
  }

  #updatePolyphen(result) {
    if (result.polyphen !== null) {
      this.tdPolyphenFunction.textContent = result.polyphen;
      switch (true) {
        case result.polyphen > 0.908:
          this.tdPolyphenFunction.dataset.function = 'PROBD';
          break;
        case result.polyphen > 0.446:
          this.tdPolyphenFunction.dataset.function = 'POSSD';
          break;
        case result.polyphen >= 0:
          this.tdPolyphenFunction.dataset.function = 'B';
          break;
        default:
          this.tdPolyphenFunction.dataset.function = 'U';
          break;
      }
    } else {
      this.tdPolyphenFunction.textContent = '';
      this.tdPolyphenFunction.dataset.function = '';
    }
  }

  #prepareTableData() {
    // HTMLテンプレート生成
    this.tr.innerHTML = this.#createTableCellHTML();

    // 各セル要素をキャッシュ
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
          const master = getSimpleSearchConditionMaster('dataset');
          return (
            `<td class="alt_frequency">` +
            master.items
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
    this.tdTGVAnchor = this.tr.querySelector('td.togovar_id > a');
    this.tdRS = this.tr.querySelector('td.refsnp_id');
    this.tdRSAnchor = this.tdRS?.querySelector('a');

    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.tdPositionChromosome = tdPosition?.querySelector('.chromosome');
    this.tdPositionCoordinate = tdPosition?.querySelector('.coordinate');

    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.tdRefAltRef = tdRefAlt?.querySelector('.ref');
    this.tdRefAltAlt = tdRefAlt?.querySelector('.alt');

    this.tdType = this.tr.querySelector('td.type > .variant-type');
    this.tdGene = this.tr.querySelector('td.gene');
    this.tdGeneAnchor = this.tdGene?.querySelector('a');

    this.tdFrequencies = {};
    this.tr
      .querySelectorAll(
        'td.alt_frequency > logarithmized-block-graph-frequency-view'
      )
      .forEach((elm) => {
        this.tdFrequencies[elm.dataset.dataset] = elm;
      });

    this.tdConsequence = this.tr.querySelector('td.consequence');
    this.tdConsequenceItem =
      this.tdConsequence?.querySelector('.consequence-item');

    this.tdSift = this.tr.querySelector('td.sift');
    this.tdSiftFunction = this.tdSift?.querySelector('.variant-function');

    this.tdPolyphen = this.tr.querySelector('td.polyphen');
    this.tdPolyphenFunction =
      this.tdPolyphen?.querySelector('.variant-function');

    this.tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.tdAlphaMissenseFunction =
      this.tdAlphaMissense?.querySelector('.variant-function');

    this.tdClinical = this.tr.querySelector('td.clinical_significance');
    this.tdClinicalSign = this.tdClinical?.querySelector(
      '.clinical-significance'
    );
    this.tdClinicalAnchor = this.tdClinical?.querySelector('a');
    this.tdClinicalIcon = this.tdClinical?.querySelector('.icon');
  }
}
