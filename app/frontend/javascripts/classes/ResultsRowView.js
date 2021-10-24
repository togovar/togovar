import {COLUMNS} from '../global.js';
import StoreManager from "./StoreManager.js";
import ChromosomePositionView from "./ChromosomePositionView.js";
import RefAltView from "./RefAltView.js";
import FrequencyGraphView from "./FrequencyGraphView.js";
import VariantFunction from "./VariantFunction.js";

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
          variant_type: '<td class="variant_type"></td>',
          symbol: '<td class="symbol not-what-it-looks-like" data-remains=""></td>',
          allele_freq: '<td class="allele_freq not-what-it-looks-like"></td>',
          consequence: '<td class="consequence" data-remains=""></td>',
          sift_value: '<td class="sift_value" data-remains=""></td>',
          polyphen2_value: '<td class="polyphen2_value" data-remains=""></td>',


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
    this._allele_freq = new FrequencyGraphView(this._columnNodes.get('allele_freq'));
    this._sift_value = new VariantFunction(this._columnNodes.get('sift_value'), 'sift_value');
    this._polyphen2_value = new VariantFunction(this._columnNodes.get('polyphen2_value'), 'polyphen2_value');



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
          let remains = 0, href = '', text = '';
          if (result.existing_variations) {
            remains = result.existing_variations.length - 1;
            href = `http://identifiers.org/dbsnp/${result.existing_variations[0]}`;
            text = `${result.existing_variations[0]}`;
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
          node.innerHTML = `<span class="variant-type">${master.find(type => type.id === result.type).label}</span>`;
        }
          break;
        case 'symbol': // gene symbol
        {
          let remains = 0, href = '', text = '', taking = '';
          if (result.symbols && result.symbols.length) {
            remains = result.symbols.length - 1;
            href = `http://identifiers.org/hgnc/${result.symbols[0].id}`;
            text = result.symbols[0].name;
            taking = result.symbols.map((symbol, index) => {
              return index === 0
                ? ''
                :  `<span class="taking -zero">,<a href="http://identifiers.org/hgnc/${symbol.id}">${symbol.name}</a></span>`;
            }).join('');
          } else {
            remains = 0;
          }
          node.dataset.remains = remains;
          node.innerHTML = `<a
            href="${href}"
            target="_blank"
            class="hyper-text -internal"
          >${text}</a>${taking}`;
        }
          break;
        case 'allele_freq':
          this._allele_freq.setValues(result.frequencies);
          break;
        case 'consequence': {
          let remains = 0, text = '';
          if (result.most_severe_consequence) {
            const master = StoreManager.getSearchConditionMaster('consequence');
            const consequences = [...new Set(result.transcripts.filter(trans => trans.consequence).map(trans => trans.consequence).flat())];
            remains = consequences.length - 1;
            text = master.items.find(consequence => consequence.id === result.most_severe_consequence).label;
          }
          node.dataset.remains = remains;
          node.innerHTML = `<span class="consequence-item">${text}</span>`;
        }
          break;
        case 'sift_value': {
          this._sift_value.setValue(result.sift);
          const sifts = result.transcripts?.filter(x => Number.isFinite(x.sift));
          let remains = 0;
          if (sifts.length > 0) remains = sifts.length - 1;
          node.dataset.remains = remains;
        }
          break;
        case 'polyphen2_value': {
          this._polyphen2_value.setValue(result.polyphen);
          const polyphens = result.transcripts?.filter(x => Number.isFinite(x.polyphen));
          let remains = 0;
          if (polyphens.length > 0) remains = polyphens.length - 1;
          node.dataset.remains = remains;
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
