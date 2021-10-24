import {COLUMNS} from '../global.js';
import StoreManager from "./StoreManager.js";
import ChromosomePositionView from "./ChromosomePositionView.js";
import RefAltView from "./RefAltView.js";

const REF_ALT_SHOW_LENGTH = 4;

let template;

export default class ResultsRowView {

  static get template() {
    if (!template) {
      template = COLUMNS.map(column => {
        return {
          tgv_id: '<td class="tgv_id"></td>',
          rs: '<td class="rs""></td>',
          chr_position: '<td class="chr_position"></td>',
          ref_alt: '<td class="ref_alt"></td>',


          variant_type: '<td class="variant_type"><div class="variant-type"></div></td>',
          symbol: '<td class="symbol" data-remains=""><a href="" class="hyper-text -internal" target="_blank"></a></td>',
          allele_freq: (() => {
            const master = StoreManager.getSearchConditionMaster('dataset');
            return `
                <td class="allele_freq">
                  <div class="frequency-graph">
                    ${master.items.map(dataset => {
                      return dataset.has_freq
                        ? `<div class="dataset" data-dataset="${dataset.id}" data-frequency=""></div>`
                        : '';
                    }).join('')}
                  </div>
                </td>`;
          })(),
          consequence: '<td class="consequence" data-remains=""><div class="consequence-item"></div></td>',
          sift_value: '<td class="sift_value" data-remains=""><div class="variant-function" data-function=""></div></td>',
          polyphen2_value: '<td class="polyphen2_value" data-remains=""><div class="variant-function" data-function=""></div></td>',
          clinical_significance: '<td class="clinical_significance" data-remains=""><!--<div class="dataset-icon -none" data-dataset="mgend"></div>--><div href="" class="clinical-significance" data-sign=""></div><a></a></td>'
        }[column.id];
      }).join('');
    }
    return template;
  }

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
    this._update();
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
    this._update();
  }

  prepareTableData() {
    this.tr.innerHTML = ResultsRowView.template;
    this._columnNodes = new Map(COLUMNS.map(column => [column.id, this.tr.querySelector(`:scope > .${column.id}`)]));
    
    this._chr_position = new ChromosomePositionView(this._columnNodes.get('chr_position'));
    this._ref_alt = new RefAltView(this._columnNodes.get('ref_alt'));



    this.tdType = this.tr.querySelector(':scope > .variant_type > .variant-type');
    this.tdGene = this.tr.querySelector(':scope > .symbol');
    this.tdGeneAnchor = this.tdGene.querySelector(':scope > a');
    this.tdFrequencies = {};
    this.tr.querySelectorAll('td.allele_freq > .frequency-graph > .dataset').forEach(elm => this.tdFrequencies[elm.dataset.dataset] = elm);
    this.tdConsequence = this.tr.querySelector(':scope > .consequence');
    this.tdConsequenceItem = this.tdConsequence.querySelector(':scope > .consequence-item');
    this.tdSift = this.tr.querySelector(':scope > .sift_value');
    this.tdSiftFunction = this.tdSift.querySelector(':scope > .variant-function');
    this.tdPolyphen = this.tr.querySelector(':scope > .polyphen2_value');
    this.tdPolyphenFunction = this.tdPolyphen.querySelector(':scope > .variant-function');
    this.tdClinical = this.tr.querySelector(':scope > .clinical_significance');
    this.tdClinicalSign = this.tdClinical.querySelector(':scope > .clinical-significance');
    this.tdClinicalAnchor = this.tdClinical.querySelector(':scope > a');
  }

  _update() {
    if (StoreManager.getData('rowCount') <= this.index) {
      this.tr.classList.add('-out-of-range');
      return
    }
    const result = StoreManager.getRecordByIndex(this.index);
    if (result === 'loading') {
      this.tr.classList.add('-loading');
      this.tr.classList.remove('-out-of-range');
      this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
      return;
    }
    if (result === 'out of range') {
      this.tr.classList.remove('-loading');
      this.tr.classList.add('-out-of-range');
      return
    }
    if (this.tr.classList.contains('-loading')) {
      this.prepareTableData();
    }
    this.tr.classList.remove('-loading');
    this.tr.classList.remove('-out-of-range');
    for (const column of COLUMNS) {
      const node = this._columnNodes.get(column.id);
      switch (column.id) {
        case 'tgv_id': // tgv
          node.innerHTML = `<a
            href="${result.id ? `/variant/${result.id}` : ''}"
            class="hyper-text -internal"
            target="_blank"
          >${result.id ? result.id : ''}</a>`;
          break;
        case 'rs': // refSNP
        {
          let remains, href, text;
          if (result.existing_variations) {
            remains = result.existing_variations.length - 1;
            href = `http://identifiers.org/dbsnp/${result.existing_variations[0]}`;
            text = `${result.existing_variations[0]}`;
          } else {
            remains = 0;
            href = '';
            text = '';
          }
          node.dataset.remains = remains;
          node.innerHTML = `<a
            href="${href}"
            target="_blank"
            class="hyper-text -external"
          >${text}</a>`;
        }
          break;
        case 'chr_position': // position
          this._chr_position.setValues(result.chromosome, result.start);
          break;
        case 'ref_alt': // ref alt
          this._ref_alt.setValues(result);
          break;
        case 'variant_type': // variant type
        {
          const master = StoreManager.getSearchConditionMaster('type').items;
          this.tdType.textContent = master.find(type => type.id === result.type).label;
        }
          break;
        case 'symbol': // gene symbol
        {
          if (result.symbols && result.symbols.length) {
            this.tdGene.dataset.remains = result.symbols.length - 1;
            this.tdGeneAnchor.href = `http://identifiers.org/hgnc/${result.symbols[0].id}`;
            // TODO:
            this.tdGeneAnchor.textContent = result.symbols[0].name;
          } else {
            this.tdGene.dataset.remains = 0;
            this.tdGeneAnchor.href = '';
            this.tdGeneAnchor.textContent = '';
          }
        }
          break;
        case 'allele_freq': {
          const master = StoreManager.getSearchConditionMaster('dataset');
          for (const dataset of master.items) {
            if (!dataset.has_freq) continue;
            const frequency = result.frequencies ? result.frequencies.find(frequency => frequency.source === dataset.id) : undefined;
            let frequencyValue;
            if (frequency) {
              switch (true) {
                case frequency.allele.count == 1:
                  frequencyValue = 'singleton';
                  break;
                case frequency.allele.frequency >= .5:
                  frequencyValue = '≥0.5';
                  break;
                case frequency.allele.frequency > .05:
                  frequencyValue = '<0.5';
                  break;
                case frequency.allele.frequency > .01:
                  frequencyValue = '<0.05';
                  break;
                case frequency.allele.frequency > .001:
                  frequencyValue = '<0.01';
                  break;
                case frequency.allele.frequency > .0001:
                  frequencyValue = '<0.001';
                  break;
                case frequency.allele.frequency > 0:
                  frequencyValue = '<0.0001';
                  break;
                default:
                  frequencyValue = 'monomorphic';
                  break;
              }
            } else {
              frequencyValue = 'na';
            }
            this.tdFrequencies[dataset.id].dataset.frequency = frequencyValue;
          }
        }
          break;
        case 'consequence': {
          if (result.most_severe_consequence) {
            const master = StoreManager.getSearchConditionMaster('consequence');
            const unique = [...new Set(result.transcripts.reduce((accumulator, transcript) => accumulator.concat(transcript.consequences), []))];
            this.tdConsequence.dataset.remains = unique.length - 1;
            this.tdConsequenceItem.textContent = master.items.find(consequence => consequence.id === result.most_severe_consequence).label;
          } else {
            this.tdConsequence.dataset.remains = 0;
            this.tdConsequenceItem.textContent = '';
          }
        }
          break;
        case 'sift_value': {
          const sifts = result.transcripts.filter(x => Number.isFinite(x.sift));
          if (sifts.length > 0) {
            this.tdSift.dataset.remains = sifts.length - 1;
            this.tdSiftFunction.textContent = result.sift;
            this.tdSiftFunction.dataset.function = result.sift >= .05 ? 'T' : 'D';
          } else {
            this.tdSift.dataset.remains = 0;
            this.tdSiftFunction.textContent = '';
            this.tdSiftFunction.dataset.function = '';
          }
        }
          break;
        case 'polyphen2_value': {
          const polyphens = result.transcripts.filter(x => Number.isFinite(x.polyphen));
          if (polyphens.length > 0) {
            this.tdPolyphen.dataset.remains = polyphens.length - 1;
            this.tdPolyphenFunction.textContent = result.polyphen;
            switch (true) {
              case result.polyphen > .908:
                this.tdPolyphenFunction.dataset.function = 'PROBD';
                break;
              case result.polyphen > .446:
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
        case 'clinical_significance': {
          if (result.significance && result.significance.length) {
            this.tdClinical.dataset.remains = result.significance.length - 1;
            this.tdClinicalSign.dataset.sign = result.significance[0].interpretations[0];
            this.tdClinicalAnchor.textContent = result.significance[0].condition;
          } else {
            this.tdClinical.dataset.remains = 0;
            this.tdClinicalSign.dataset.sign = '';
            this.tdClinicalAnchor.textContent = '';
          }
        }
          break;
      }
    }
  }
}
