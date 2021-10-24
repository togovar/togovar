export default class VariantFunction {

  constructor(container, type) {
    this._type = type; // 'sift_value' or 'polyphen2_value'
    container.innerHTML = '<span class="variant-function" data-function></span>';
    this._node = container.querySelector(':scope > .variant-function');
  }

  setValue(value) {
    let functionValue;
    switch (this._type) {
      case 'sift_value':
        functionValue = value >= .05 ? 'T' : 'D';
        break;
      case 'polyphen2_value':
        switch (true) {
          case value > .908:
            functionValue = 'PROBD';
            break;
          case value > .446:
            functionValue = 'POSSD';
            break;
          case value >= 0:
            functionValue = 'B';
            break;
          default:
            functionValue = 'U';
            break;
        }
        break;
    }
    this._node.textContent = value;
    this._node.dataset.function = functionValue;
  }

}