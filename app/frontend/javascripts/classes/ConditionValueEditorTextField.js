import SearchFieldView from './SearchFieldView.js';
import {CONDITION_TYPE} from '../definition.js';

export default class ConditionValueEditorTextField {

  constructor(valuesView, conditionType) {
    console.log(valuesView, conditionType)

    this._valuesView = valuesView;
    this._conditionType = conditionType;

    // HTML
    const section = document.createElement('section');
    section.classList.add('text-field-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
      <div class="body"></div>`;
    valuesView.sections.append(section);
    this._body = section.querySelector(':scope > .body');
    this._searchFieldView = new SearchFieldView(
      this,
      this._body,
      {
        [CONDITION_TYPE.gene_symbol]: 'Search for gene symbol',
        [CONDITION_TYPE.disease]: 'Search for disease',
      }[conditionType],
      [{
        [CONDITION_TYPE.gene_symbol]: 'gene',
        [CONDITION_TYPE.disease]: 'disease',
      }[conditionType]]
    );
  }


  // public methods

  keepLastValues() {
    this._lastValue = this._searchFieldView.value;
  }

  restore() {
    this._searchFieldView.setTerm(this._lastValue);
    this._update();
  }

  search() {
    this._update();
  }


  // private methods

  _update() {

    // update value
    const term = this._searchFieldView.value;
    const valuesElement = this._valuesView.conditionView.valuesElement;
    valuesElement.innerHTML = `<span class="value" data-value="${term}">${term}</span>`;

    // const valueViews = Array.from(valuesElement.querySelectorAll(':scope > .value'));
    // this._data.forEach(datum => {
    //   if (!datum.value) return;
    //   const elm = valueViews.find(elm => elm.dataset.value === datum.value);
    //   if (datum.checked) {
    //     if (elm === undefined) {
    //       // add value element
    //       valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${datum.value}">${datum.label}</span>`);
    //     }
    //   } else {
    //     if (elm) {
    //       // remove value element
    //       valuesElement.removeChild(elm);
    //     }
    //   }
      
    // });

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this._searchFieldView.value !== '';
  }

}
