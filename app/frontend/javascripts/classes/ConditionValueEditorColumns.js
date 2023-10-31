import ConditionValueEditor from './ConditionValueEditor.js';
// import { response } from 'express';
import { ADVANCED_CONDITIONS, API_URL } from '../global.js';
import { CONDITION_TYPE } from '../definition.js';

const SELECTION_DEPENDED_ON_PARENT = {
  consequence: true,
  disease: false,
};
const DISEASE_API = {
  PATH: `${API_URL}/sparqlist/api/advanced_search_disease_selector`,
  KEY: 'mesh_in',
};

export default class ConditionValueEditorColumns extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);

    this._data = this._prepareData();
    this._selectionDependedOnParent =
      SELECTION_DEPENDED_ON_PARENT[this._conditionType];

    // HTML
    this._createElement(
      'columns-editor-view',
      `
    <header>Select ${this._conditionType}</header>
    <div class="body">
      <div class="columns"></div>
      <div class="description"></div>
    </div>`
    );
    this._columns = this._body.querySelector(':scope > .columns');
    this._description = this._body.querySelector(':scope > .description');
    this._drawColumn();
  }

  // public methods

  keepLastValues() {
    this._lastValues = this._data
      .filter((datum) => datum.value && datum.checked)
      .map((datum) => datum.value);
  }

  restore() {
    this._data.forEach(
      (datum) => (datum.checked = this._lastValues.indexOf(datum.value) !== -1)
    );
    this._update();
  }

  get isValid() {
    return this._valueViews.length > 0;
  }

  // private methods

  _prepareData() {
    switch (this._conditionType) {
      case CONDITION_TYPE.consequence:
      case CONDITION_TYPE.dataset:
        return ADVANCED_CONDITIONS[this._conditionType].values.map((value) =>
          Object.assign({ checked: false }, value)
        );
      case CONDITION_TYPE.disease:
        return [];
    }
  }

  _drawColumn(parentId) {
    this._getItems(parentId).then((items) => {
      // make HTML
      const column = document.createElement('div');
      column.classList.add('column');
      column.dataset.depth =
        this._columns.querySelectorAll(':scope > .column').length;
      this._columns.append(column);
      column.innerHTML = `
        <ul>
          ${items
            .map((item) => {
              return `<li
              ${item.id ? `data-id="${item.id}"` : ''}
              ${item.value ? `data-value="${item.value}"` : ''}
              ${item.parent ? `data-parent="${item.parent}"` : ''}
            >
              <label>
                <input type="checkbox">
                ${
                  this._conditionType === CONDITION_TYPE.dataset
                    ? `<span class="dataset-icon" data-dataset="${item.value}"></span>`
                    : ''
                }
                <span>${item.label}</span>
              </label>
              ${
                item.children === undefined
                  ? ''
                  : `<div class="arrow" data-id="${item.id}"></div>`
              }
            </li>`;
            })
            .join('')}
        </ul>`;

      // attach events
      // add/remove condition
      for (const item of column.querySelectorAll(
        ':scope > ul > li > label > input'
      )) {
        item.addEventListener('change', (e) => {
          // change status
          const li = e.target.closest('li');
          const datum = this._data.find((datum) => datum.id == li.dataset.id);
          datum.checked = e.target.checked;
          // if it has children, aggregate child items
          if (datum.children) this._updateChildren(datum.id, e.target.checked);
          this._update(datum.id);
        });
      }
      // drill down
      for (const item of column.querySelectorAll(':scope > ul > li > .arrow')) {
        item.addEventListener('click', (e) => {
          const item = e.target.closest('li');
          // release selecting item, and remove subdirectory
          item.parentNode
            .querySelector(':scope > .-selected')
            ?.classList.remove('-selected');
          const depth = parseInt(item.closest('.column').dataset.depth);
          for (const column of item
            .closest('.columns')
            .querySelectorAll(':scope > .column')) {
            if (parseInt(column.dataset.depth) > depth)
              column.parentNode.removeChild(column);
          }
          // select, and drill down
          item.classList.add('-selected');
          this._drawColumn(e.target.dataset.id);
        });
      }
      this._update();

      // scroll
      const left = this._body.scrollWidth - this._body.clientWidth;
      if (left > 0) {
        this._body.scrollTo({
          top: 0,
          left: left,
          behavior: 'smooth',
        });
      }
    });
  }

  _getItems(parentId) {
    return new Promise((resolve, reject) => {
      // TODO: alt allele, consequence と disease で、取り方が変わる
      switch (this._conditionType) {
        case CONDITION_TYPE.consequence:
        case CONDITION_TYPE.dataset:
          resolve(this._data.filter((datum) => datum.parent == parentId));
          break;
        case CONDITION_TYPE.disease:
          {
            let filtered = this._data.filter(
              (datum) => datum.parent === parentId
            );
            if (filtered.length) {
              resolve(filtered);
            } else {
              fetch(
                `${DISEASE_API.PATH}${
                  parentId ? `?${DISEASE_API.KEY}=${parentId}` : ''
                }`
              )
                .then((response) => response.json())
                .then((data) => {
                  const newData = data.map((datum) => {
                    const label =
                      datum.label.indexOf('|') === -1
                        ? datum.label
                        : datum.label.substr(0, datum.label.indexOf('|'));
                    const newDatum = {
                      id: datum.categoryId,
                      label,
                      value: label,
                      checked: false,
                    };
                    if (parentId) newDatum.parent = parentId;
                    if (datum.hasChild) newDatum.children = [];
                    return newDatum;
                  });
                  this._data.push(...newData);
                  // ad ids to parent datum
                  if (parentId) {
                    const parentDatum = this._data.find(
                      (datum) => datum.id == parentId
                    );
                    parentDatum.children.push(
                      ...newData.map((datum) => datum.id)
                    );
                  }
                  resolve(newData);
                })
                .catch((error) => {
                  console.error(error);
                  reject(error);
                });
            }
          }
          break;
      }
    });
  }

  _updateChildren(id, checked) {
    // reflect
    if (!this._selectionDependedOnParent) return;
    const children = this._data.filter((datum) => datum.parent == id);
    children.forEach((child) => {
      child.checked = checked;
      this._updateChildren(child.id, checked);
    });
  }

  _updateIndeterminate() {
    // if (!this._selectionDependedOnParent) return;

    const checkLeaves = (datum) => {
      if (!datum.children || datum.children.length === 0) return;
      let numberOfChecked = 0;
      datum.children.forEach((child) => {
        const childDatum = this._data.find((datum) => datum.id === child);
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
      const checkbox = this._columns.querySelector(
        `li[data-id="${datum.id}"] > label > input`
      );
      if (checkbox) {
        checkbox.checked = checked;
        checkbox.indeterminate = indeterminate;
      }
      return checked || indeterminate;
    };

    // top level
    const topLevelNodes = this._data.filter(
      (datum) => datum.parent === undefined
    );
    topLevelNodes.forEach((datum) => checkLeaves(datum));
  }

  _update() {
    // reflect check status in DOM
    this._data.forEach((datum) => {
      const checkbox = this._columns.querySelector(
        `li[data-id="${datum.id}"] > label > input`
      );
      if (checkbox) checkbox.checked = datum.checked;
    });
    // update selection status of upper hierarchy
    this._updateIndeterminate();

    // update values
    this._data.forEach((datum) => {
      if (!datum.value) return;
      if (datum.checked) {
        this._addValueView(datum.value, datum.label);
      } else {
        this._removeValueView(datum.value);
      }
    });

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
