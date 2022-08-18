import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewFilterVariantCallingQuality extends PanelView {

  constructor(elm) {
    super(elm, 'quality');
    StoreManager.bind('simpleSearchConditions', this);
    // reference
    this.checkbox = this.elm.querySelector('.content > label > input');
    // event
    this.checkbox.addEventListener('change', this.change.bind(this));
    this.checkbox.dispatchEvent(new Event('change'));
  }

  change(e) {
    StoreManager.setSimpleSearchCondition('quality', e.target.checked ? '1' : '0');
  }

  simpleSearchConditions(conditions) {
    if (conditions.quality !== undefined) {
      this.checkbox.checked = conditions.quality === '1';
    }
  }

}
