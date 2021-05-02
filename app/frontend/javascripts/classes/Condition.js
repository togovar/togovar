
export default class Condition {

  constructor(delegate, parentNode, type) {
    console.log( parentNode, type )

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-condition-view');
    this._elm.dataset.classification = type;
    this._elm.innerHTML = `
    <div class="classification"></div>
    <div class="operator"></div>
    <div class="values"></div>
    <div class="editbutton">Edit</div>`;
    parentNode.insertAdjacentElement('beforeend', this._elm);

    // reference
    this._delegate = delegate;
    this._values = this._elm.querySelector(':scope > .values');

    console.log(this._values)

  }

}