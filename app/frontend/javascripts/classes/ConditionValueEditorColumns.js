import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionValueEditorColumns {

  constructor(values, conditionType) {

    this._conditionType = conditionType;
    this._master = ADVANCED_CONDITIONS[conditionType];

    console.log( values )
    console.log( ADVANCED_CONDITIONS[conditionType] )

    // HTML
    console.log(values.sections)
    const section = document.createElement('section');
    section.classList.add('columns-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
      <div class="body">
        <div class="columns"></div>
        <div class="description">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.

        </div>
      </div>`;
    values.sections.append(section);
    this._columns = section.querySelector(':scope > .body > .columns');
    this._description = section.querySelector(':scope > .body > .description');
    this._drawColumn();


    // references
    this._values = values;
    // this._checkboxes = Array.from(section.querySelectorAll(':scope > ul > li > label > input'));

    // // attach events
    // this._checkboxes.forEach(checkbox => {
    //   checkbox.addEventListener('change', () => {
    //     this._updateCheckboxesEditor();
    //   });
    // });

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

  _drawColumn(id) {
    this._getItems(id)
      .then(items => {
        console.log(items)
        this._columns.insertAdjacentHTML('beforeend', `
        <ul>
          ${items.map(item => {
            return `<li
              data-has-child="${item.children !== undefined}"
              ${item.value ? `data-value="${item.value}"` : ''}
              ${item.description ? `data-description="${item.description}"` : ''}
            >
              <label>
                <input type="checkbox">
                <span>${item.label}</span>
              </label>
              ${item.children === undefined ? '' : `<div class="arrow" data-id="${item.id}"></div>`}
            </li>`;
          }).join('')}
        </ul>`);
      });
  }

  _getItems(id) {
    return new Promise((resolve, reject) => {
      // TODO: alt allele, consequence と disease で、取り方が変わる
      switch (this._conditionType) {
        case 'consequence':
          resolve(this._master.values.filter(value => value.parent === id));
          break;
      }
    });
  }

  _updateCheckboxesEditor() {

    // operation
    const valuesElement = this._values.conditionView.valuesElement;
    const valueViews = Array.from(valuesElement.querySelectorAll(':scope > .value'));
    this._checkboxes.forEach(checkbox => {
      const elm = valueViews.find(elm => elm.dataset.value === checkbox.value);
      if (checkbox.checked) {
        if (elm === undefined) {
          // add value element
          valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${checkbox.value}">${checkbox.dataset.label}</span>`);
        }
      } else {
        if (elm) {
          // remove value element
          valuesElement.removeChild(elm);
        }
      }
    });

    // validation
    this._values.update(this._validate());
  }

  _validate() {
    return this._checkboxes.some(checkbox => checkbox.checked);
  }

}
