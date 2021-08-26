import {ADVANCED_CONDITIONS} from '../global.js';

const SELECTION_DEPENDED_ON_PARENT = {
  consequence: true,
  disease: false,
}

export default class ConditionValueEditorColumns {

  constructor(valuesView, conditionType) {

    this._conditionType = conditionType;
    // this._data = ADVANCED_CONDITIONS[conditionType];
    this._data = this._prepareData();
    console.log(this._data)
    this._selectionDependedOnParent = SELECTION_DEPENDED_ON_PARENT[conditionType];
    this._valuesView = valuesView;

    // HTML
    const section = document.createElement('section');
    section.classList.add('columns-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
      <div class="body">
        <div class="columns"></div>
        <div class="description"></div>
      </div>`;
    valuesView.sections.append(section);
    this._columns = section.querySelector(':scope > .body > .columns');
    this._description = section.querySelector(':scope > .body > .description');
    this._drawColumn();
  }


  // public methods

  keepLastValues() {
    this._lastValues = this._data.filter(datum => datum.value && datum.checked).map(datum => datum.value);
    console.log( this._lastValues )
  }

  restore() {
    this._data.forEach(datum => datum.checked = this._lastValues.indexOf(datum.value) !== -1);
    this._update();
  }


  // private methods

  _prepareData() {
    switch (this._conditionType) {
      case 'consequence':
        return ADVANCED_CONDITIONS[this._conditionType].values.map(value => Object.assign({checked: false}, value));
    }
  }

  _drawColumn(id) {
    this._getItems(id)
      .then(items => {

        console.log(items)

        // make HTML
        const ul = document.createElement('ul');
        ul.dataset.depth = this._columns.querySelectorAll(':scope > ul').length;
        this._columns.append(ul);
        ul.innerHTML = `
          ${items.map(item => {
            return `<li
              ${item.id ? `data-id="${item.id}"` : ''}
              ${item.value ? `data-value="${item.value}"` : ''}
              ${item.description ? `data-description="${item.description}"` : ''}
              ${item.parent ? `data-parent="${item.parent}"` : ''}
              ${item.children ? `data-children="${item.children}"` : ''}
            >
              <label>
                <input type="checkbox">
                <span>${item.label}</span>
              </label>
              ${item.children === undefined ? '' : `<div class="arrow" data-id="${item.id}"></div>`}
            </li>`;
          }).join('')}`;

        // attach events
        // add/remove condition
        for (const item of ul.querySelectorAll(':scope > li > label > input')) {
          item.addEventListener('change', e => {
            // change status
            const li = e.target.closest('li');
            const value = this._data.find(datum => datum.id == li.dataset.id);
            value.checked = e.target.checked;
            // if it has children, aggregate child items
            if (li.dataset.children) this._updateChildren(li.dataset.id, e.target.checked);
            this._update(li.dataset.id);
          });
        }
        // drill down
        for (const item of ul.querySelectorAll(':scope > li > .arrow')) {
          item.addEventListener('click', e => {
            const item = e.target.closest('li');
            // release selecting item, and remove subdirectory
            item.parentNode.querySelector(':scope > .-selected')?.classList.remove('-selected');
            const depth = parseInt(item.parentNode.dataset.depth);
            for (const ul of item.closest('.columns').querySelectorAll(':scope > ul')) {
              if (parseInt(ul.dataset.depth) > depth) ul.parentNode.removeChild(ul); 
            }
            // select, and drill down
            item.classList.add('-selected');
            this._drawColumn(parseInt(e.target.dataset.id));
          });
        }

        this._update();
      });
  }

  _getItems(id) {
    return new Promise((resolve, reject) => {
      // TODO: alt allele, consequence と disease で、取り方が変わる
      switch (this._conditionType) {
        case 'consequence':
          resolve(this._data.filter(value => value.parent === id));
          break;
      }
    });
  }

  _updateChildren(id, checked) {
    // reflect
    if (!this._selectionDependedOnParent) return;
    const children = this._data.filter(datum => datum.parent == id);
    children.forEach(child => {
      child.checked = checked;
      this._updateChildren(child.id, checked);
    });
  }

  _updateIndeterminate() {

    const checkLeaves = (datum) => {
      if (!datum.children) return;
      let numberOfChecked = 0;
      datum.children.forEach(child => {
        const childDatum = this._data.find(datum => datum.id === child);
        if (childDatum.children) {
          numberOfChecked += checkLeaves(childDatum);
        } else {
          numberOfChecked += childDatum.checked;
        }
      });
      let checked, indeterminate;
      switch (true) {
        case numberOfChecked === 0:
          checked = false;
          indeterminate = false;
          break;
        case numberOfChecked === datum.children.length:
          checked = true;
          indeterminate = false;
          break;
        default:
          checked = false;
          indeterminate = true;
          break;
      }
      const checkbox = this._columns.querySelector(`li[data-id="${datum.id}"] > label > input`);
      if (checkbox) {
        checkbox.checked = checked;
        checkbox.indeterminate = indeterminate;
      }
      return checked || indeterminate;
    }

    // top level
    const topLevelNodes = this._data.filter(datum => datum.parent === undefined);
    topLevelNodes.forEach(datum => checkLeaves(datum));
  }

  _update(id) {

    // reflect check status in DOM
    this._data.forEach(datum => {
      const item = this._columns.querySelector(`li[data-id="${datum.id}"] > label > input`);
      if (item) item.checked = datum.checked;
    });
    // update selection status of upper hierarchy
    this._updateIndeterminate();

    // update values
    const valuesElement = this._valuesView.conditionView.valuesElement;
    const valueViews = Array.from(valuesElement.querySelectorAll(':scope > .value'));
    this._data.forEach(datum => {
      if (!datum.value) return;
      const elm = valueViews.find(elm => elm.dataset.value === datum.value);
      if (datum.checked) {
        if (elm === undefined) {
          // add value element
          valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${datum.value}">${datum.label}</span>`);
        }
      } else {
        if (elm) {
          // remove value element
          valuesElement.removeChild(elm);
        }
      }
      
    });

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return Array.from(this._columns.querySelectorAll('li[data-value] > label > input')).some(checkbox => checkbox.checked);
  }

}
