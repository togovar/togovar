import { COLUMNS } from '../global.js';
import StoreManager from './StoreManager.js';
// import LogarithmizedBlockGraphFrequencyView from '../components/LogarithmizedBlockGraphFrequencyView';

const REF_ALT_SHOW_LENGTH = 4;

export default class ResultsRowView {
  constructor(index) {
    this.index = index;
    this.selected = false;
    this.tr = document.createElement('tr');
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    this.tr.addEventListener('click', this.click.bind(this));
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    StoreManager.bind('rowCount', this);
  }

  click() {
    StoreManager.setData('selectedRow', this.selected ? undefined : this.index);
  }

  offset() {
    this.update();
  }

  selectedRow(index) {
    if (index === this.index) {
      this.selected = true;
      this.tr.classList.add('-selected');
    } else {
      this.selected = false;
      this.tr.classList.remove('-selected');
    }
  }

  rowCount() {
    this.update();
  }

  prepareTableData() {
    let html = '';
    for (const column of COLUMNS) {
      switch (column.id) {
        case 'togovar_id': // tgv
          html +=
            '<td class="togovar_id"><a href="" class="hyper-text -internal" target="_blank"></a></td>';
          break;
        case 'refsnp_id': // refSNP
          html += `<td class="refsnp_id" data-remains=""><a href="" target="_blank" class="hyper-text -external"></a></td>`;
          break;
        case 'position': // position
          html += `<td class="position"><div class="chromosome-position"><div class="chromosome"></div><div class="coordinate"></div></div></td>`;
          break;
        case 'ref_alt': // ref alt
          html += `<td class="ref_alt"><div class="ref-alt"><span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""><span class="sum"></span></span></div></td>`;
          break;
        case 'type': // variant type
          html += `<td class="type"><div class="variant-type"></div></td>`;
          break;
        case 'gene': // gene symbol
          html +=
            '<td class="gene" data-remains=""><a href="" class="hyper-text -internal" target="_blank"></a></td>';
          break;
        case 'alt_frequency': // frequency
          {
            const master =
              StoreManager.getSimpleSearchConditionMaster('dataset');
            html += `<td class="alt_frequency">
              ${master.items
                .map((dataset) => {
                  if (!dataset.has_freq) return '';
                  return `
                <logarithmized-block-graph-frequency-view
                  data-dataset="${dataset.id}"
                  data-direction="vertical"
                ></logarithmized-block-graph-frequency-view>
                `;
                })
                .join('')}
              </td>`;
          }
          break;
        case 'consequence': // consequence
          html +=
            '<td class="consequence" data-remains=""><div class="consequence-item"></div></td>';
          break;
        case 'sift': // SIFT
          html +=
            '<td class="sift" data-remains=""><div class="variant-function" data-function=""></div></td>';
          break;
        case 'polyphen': // PolyPhen
          html +=
            '<td class="polyphen" data-remains=""><div class="variant-function" data-function=""></div></td>';
          break;
        case 'alpha_missense': // AlphaMissense
          html +=
            '<td class="alpha_missense" data-remains=""><div class="variant-function" data-function=""></div></td>';
          break;
        case 'clinical_significance': // clinical significance
          html +=
            '<td class="clinical_significance" data-remains=""><!--<div class="dataset-icon -none" data-dataset="mgend"></div>--><div href="" class="clinical-significance" data-sign=""></div><a class="hyper-text -internal" target="_blank"></a></td>';
          break;
      }
    }
    this.tr.innerHTML = html;
    this.tdTGVAnchor = this.tr.querySelector('td.togovar_id > a');
    this.tdRS = this.tr.querySelector('td.refsnp_id');
    this.tdRSAnchor = this.tdRS.querySelector('a');
    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.tdPositionChromosome = tdPosition.querySelector('.chromosome');
    this.tdPositionCoordinate = tdPosition.querySelector('.coordinate');
    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.tdRefAltRef = tdRefAlt.querySelector('.ref');
    this.tdRefAltAlt = tdRefAlt.querySelector('.alt');
    this.tdType = this.tr.querySelector('td.type > .variant-type');
    this.tdGene = this.tr.querySelector('td.gene');
    this.tdGeneAnchor = this.tdGene.querySelector('a');
    this.tdFrequencies = {};
    this.tr
      .querySelectorAll(
        'td.alt_frequency > logarithmized-block-graph-frequency-view'
      )
      .forEach((elm) => (this.tdFrequencies[elm.dataset.dataset] = elm));
    // Consequence
    this.tdConsequence = this.tr.querySelector('td.consequence');
    this.tdConsequenceItem =
      this.tdConsequence.querySelector('.consequence-item');
    // SIFT
    this.tdSift = this.tr.querySelector('td.sift');
    this.tdSiftFunction = this.tdSift.querySelector('.variant-function');
    // PolyPhen
    this.tdPolyphen = this.tr.querySelector('td.polyphen');
    this.tdPolyphenFunction =
      this.tdPolyphen.querySelector('.variant-function');
    // AlphaMissense
    this.tdAlphaMissense = this.tr.querySelector('td.alpha_missense');
    this.tdAlphaMissenseFunction =
    this.tdAlphaMissense.querySelector('.variant-function');
    // Clinical significance
    this.tdClinical = this.tr.querySelector('td.clinical_significance');
    this.tdClinicalSign = this.tdClinical.querySelector(
      '.clinical-significance'
    );
    this.tdClinicalAnchor = this.tdClinical.querySelector('a');
  }

  update() {
    if (StoreManager.getData('rowCount') <= this.index) {
      // 表示領域外であれば非表示
      this.tr.classList.add('-out-of-range');
      return;
    }
    // レコード取得
    const result = StoreManager.getRecordByIndex(this.index);
    // console.log(this, result);
    if (result === 'loading') {
      this.tr.classList.add('-loading');
      this.tr.classList.remove('-out-of-range');
      this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
      return;
    }
    if (result === 'out of range') {
      this.tr.classList.remove('-loading');
      this.tr.classList.add('-out-of-range');
      return;
    }
    if (this.tr.classList.contains('-loading')) {
      this.prepareTableData();
    }
    this.tr.classList.remove('-loading');
    this.tr.classList.remove('-out-of-range');
    for (const column of COLUMNS) {
      switch (column.id) {
        case 'togovar_id': // tgv
          {
            if (result.id) {
              this.tdTGVAnchor.href = `/variant/${result.id}`;
              this.tdTGVAnchor.textContent = result.id;
            } else {
              this.tdTGVAnchor.href = '';
              this.tdTGVAnchor.textContent = '';
            }
          }
          break;
        case 'refsnp_id': // refSNP
          {
            if (result.existing_variations) {
              this.tdRS.dataset.remains = result.existing_variations.length - 1;
              this.tdRSAnchor.href = `http://identifiers.org/dbsnp/${result.existing_variations[0]}`;
              this.tdRSAnchor.textContent = `${result.existing_variations[0]}`;
            } else {
              this.tdRS.dataset.remains = 0;
              this.tdRSAnchor.href = '';
              this.tdRSAnchor.textContent = '';
            }
          }
          break;
        case 'position': // position
          {
            this.tdPositionChromosome.textContent = result.chromosome;
            this.tdPositionCoordinate.textContent = result.position;
          }
          break;
        case 'ref_alt': // ref alt
          {
            const refalt = {
              ref: result.reference ? result.reference : '',
              alt: result.alternate ? result.alternate : '',
            };
            this.tdRefAltRef.textContent =
              refalt.ref.substr(0, REF_ALT_SHOW_LENGTH) +
              (refalt.ref.length > REF_ALT_SHOW_LENGTH ? '...' : '');
            this.tdRefAltRef.dataset.sum = refalt.ref.length;
            this.tdRefAltAlt.textContent =
              refalt.alt.substr(0, REF_ALT_SHOW_LENGTH) +
              (refalt.alt.length > REF_ALT_SHOW_LENGTH ? '...' : '');
            this.tdRefAltAlt.dataset.sum = refalt.alt.length;
          }
          break;
        case 'type': // variant type
          {
            const master =
              StoreManager.getSimpleSearchConditionMaster('type').items;
            this.tdType.textContent = master.find(
              (type) => type.id === result.type
            )?.label;
          }
          break;
        case 'gene': // gene symbol
          {
            if (result.symbols && result.symbols.length) {
              this.tdGene.dataset.remains = result.symbols.length - 1;
              this.tdGeneAnchor.href = `/gene/${result.symbols[0].id}`;
              this.tdGeneAnchor.textContent = result.symbols[0].name;
            } else {
              this.tdGene.dataset.remains = 0;
              this.tdGeneAnchor.href = '';
              this.tdGeneAnchor.textContent = '';
            }
          }
          break;
        case 'alt_frequency':
          {
            const master =
              StoreManager.getSimpleSearchConditionMaster('dataset');
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
          break;
        case 'consequence':
          {
            if (result.most_severe_consequence) {
              const master =
                StoreManager.getSimpleSearchConditionMaster('consequence');
              const unique = [
                ...new Set(
                  result.transcripts.reduce(
                    (accumulator, transcript) =>
                      accumulator.concat(transcript.consequences),
                    []
                  )
                ),
              ];
              this.tdConsequence.dataset.remains = unique.length - 1;
              this.tdConsequenceItem.textContent = master.items.find(
                (consequence) =>
                  consequence.id === result.most_severe_consequence
              ).label;
            } else {
              this.tdConsequence.dataset.remains = 0;
              this.tdConsequenceItem.textContent = '';
            }
          }
          break;
        case 'sift':
          {
            const sifts = result.transcripts?.filter((x) =>
              Number.isFinite(x.sift)
            );
            if (sifts && sifts.length > 0) {
              this.tdSift.dataset.remains = sifts.length - 1;
              this.tdSiftFunction.textContent = result.sift;
              this.tdSiftFunction.dataset.function =
                result.sift >= 0.05 ? 'T' : 'D';
            } else {
              this.tdSift.dataset.remains = 0;
              this.tdSiftFunction.textContent = '';
              this.tdSiftFunction.dataset.function = '';
            }
          }
          break;
        case 'polyphen':
          {
            const polyphens = result.transcripts?.filter((x) =>
              Number.isFinite(x.polyphen)
            );
            if (polyphens && polyphens.length > 0) {
              this.tdPolyphen.dataset.remains = polyphens.length - 1;
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
              this.tdPolyphen.dataset.remains = 0;
              this.tdPolyphenFunction.textContent = '';
              this.tdPolyphenFunction.dataset.function = '';
            }
          }
          break;
          case 'alpha_missense':
            {
              const alphaMissenses = result.transcripts?.filter((x) =>
                Number.isFinite(x.alpha_missense)
              );
              if (alphaMissenses && alphaMissenses.length > 0) {
                this.tdAlphaMissense.dataset.remains = alphaMissenses.length - 1;
                this.tdAlphaMissenseFunction.textContent = result.alphamissense;
                switch (true) {
                  case result.alphamissense < 0.34:
                    this.tdAlphaMissenseFunction.dataset.function = 'LB';
                    break;
                  case result.alphamissense > 0.564:
                    this.tdAlphaMissenseFunction.dataset.function = 'LP';
                    break;
                  default:
                    this.tdAlphaMissenseFunction.dataset.function = 'AMBIGUOUS';
                    break;
                }
              } else {
                this.tdAlphaMissense.dataset.remains = 0;
                this.tdAlphaMissenseFunction.textContent = '';
                this.tdAlphaMissenseFunction.dataset.function = '';
              }
            }
            break;
        case 'clinical_significance':
          {
            if (result.significance && result.significance.length) {
              this.tdClinical.dataset.remains = result.significance.length - 1;
              this.tdClinicalSign.dataset.sign =
                result.significance[0].interpretations[0];
              this.tdClinicalAnchor.textContent =
                result.significance[0].condition;
              this.tdClinicalAnchor.setAttribute('href', `/disease/${result.significance[0].medgen}`);
            } else {
              this.tdClinical.dataset.remains = 0;
              this.tdClinicalSign.dataset.sign = '';
              this.tdClinicalAnchor.textContent = '';
              this.tdClinicalAnchor.setAttribute('href', '');
            }
          }
          break;
      }
    }
  }
}
