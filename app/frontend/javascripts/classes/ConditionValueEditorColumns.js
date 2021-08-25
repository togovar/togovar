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
        <div class="description">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.

        </div>
      </div>`;
    valuesView.sections.append(section);
    this._columns = section.querySelector(':scope > .body > .columns');
    this._description = section.querySelector(':scope > .body > .description');
    this._drawColumn();
  }


  // public methods

  keepLastValues() {
    // this._lastValues = Array.from(this._values.conditionView.valuesElement.querySelectorAll(':scope > .value')).map(value => value.dataset.value);
    console.log( this._lastValues )
  }

  restore() {
    this._checkboxes.forEach(checkbox => {
      const value = this._lastValues.find(value => value === checkbox.value);
      checkbox.checked = value !== undefined;
    });
    this._updateCheckboxesEditor();
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

  _updateParent(id) {

    // change status of parent checkbox
    const value = this._data.find(datum => datum.id == id);
    let numberOfChecked = 0;
    if (value.parent !== undefined) {
      const siblingValues = this._data.filter(datum => {
        if (datum.parent === value.parent) {
          numberOfChecked += datum.checked || (datum.indeterminate ?? 0);
          return true;
        } else {
          return false;
        }
      });
      const parentValue = this._data.find(datum => datum.id == value.parent);
      const parentCheckbox = this._columns.querySelector(`li[data-id="${value.parent}"] > label > input`);
      switch (true) {
        case numberOfChecked === 0:
          parentCheckbox.checked = false;
          parentCheckbox.indeterminate = false;
          parentValue.indeterminate = false;
          break;
        case numberOfChecked === siblingValues.length:
          parentCheckbox.checked = true;
          parentCheckbox.indeterminate = false;
          parentValue.indeterminate = false;
          break;
        default:
          parentCheckbox.checked = false;
          parentCheckbox.indeterminate = true;
          parentValue.indeterminate = true;
      }

      // recursion
      if (parentValue.parent) this._updateParent(parentValue.id);
    }
  }

  _update(id) {

    // reflect check status in DOM
    this._data.forEach(datum => {
      const item = this._columns.querySelector(`li[data-id="${datum.id}"] > label > input`);
      if (item) item.checked = datum.checked;
    });
    // update selection status of upper hierarchy
    this._updateParent(id);


    // データ上の反映

    // aggregate checked elements
    // const checkedItems = [];
    // this._columns.querySelectorAll('li').forEach(li => {
    //   if (li.querySelector(':scope > label > input').checked) {
    //     if (li.dataset.value) checkedItems.push({value: li.dataset.value, label: li.querySelector(':scope > label > span').textContent});
    //     // 子を持ち、かつ子がレンダリングされていない場合
    //     if (this._selectionDependedOnParent && li.dataset.children) {
    //       if (!li.parentNode.nextElementSibling) {
    //         this._aggregateChildren(checkedItems, parseInt(li.dataset.id));
    //       }
    //     }
    //   }
    // });
    // console.log(checkedItems)




    // operation
    // const valuesElement = this._valuesView.conditionView.valuesElement;
    // const valueViews = Array.from(valuesElement.querySelectorAll(':scope > .value'));
    // this._checkboxes.forEach(checkbox => {
    //   const elm = valueViews.find(elm => elm.dataset.value === checkbox.value);
    //   if (checkbox.checked) {
    //     if (elm === undefined) {
    //       // add value element
    //       valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${checkbox.value}">${checkbox.dataset.label}</span>`);
    //     }
    //   } else {
    //     if (elm) {
    //       // remove value element
    //       valuesElement.removeChild(elm);
    //     }
    //   }
    // });

    // // validation
    // this._valuesView.update(this._validate());
  }

  _aggregateChildren(payload, parentId) {
    console.log(parentId)
    console.log(...payload)
    console.log(this._data)
    console.log(this._data.find(value => value.id === parentId))
    const children = this._data.find(value => value.id === parentId).children;
    console.log(children)
    children?.forEach(id => {
      const item = this._data.find(value => value.id === id);
      if (item.value) payload.push({value: item.value, label: item.label});
      item.children?.forEach(id => this._aggregateChildren(payload, id));
    })
  }

  _validate() {
    // return this._checkboxes.some(checkbox => checkbox.checked);
  }

}
