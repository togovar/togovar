/*global $ */
import PanelView from "./PanelView.js";
import RangeSelectorView from "./RangeSelectorView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewFilterAlternativeAlleleFrequency extends PanelView {

  constructor(elm) {
    super(elm, 'frequency');

    console.log(elm)
    console.log(this.kind)
    new RangeSelectorView(elm.querySelector('.range-selector-view'), 0, 1, 'vertical', this.kind, 'simple');
  }

}
