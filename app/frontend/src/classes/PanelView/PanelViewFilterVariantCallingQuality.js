import { PanelView } from './PanelView.ts';
import { storeManager } from '../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
} from '../../store/searchManager';

export default class PanelViewFilterVariantCallingQuality extends PanelView {
  constructor(panelViewEl) {
    super(panelViewEl, 'quality');
    storeManager.bind('simpleSearchConditions', this);
    // reference
    this.checkbox = this.panelViewEl.querySelector('.content > label > input');
    // event
    this.checkbox.addEventListener('change', this.change.bind(this));
    this.checkbox.dispatchEvent(new Event('change'));
    // initial condition
    const condition = getSimpleSearchCondition(this.panelId);
    this.checkbox.checked = condition === undefined;
  }

  change(e) {
    setSimpleSearchCondition('quality', e.target.checked ? '1' : '0');
  }

  simpleSearchConditions(conditions) {
    if (conditions.quality !== undefined) {
      this.checkbox.checked = conditions.quality === '1';
    }
  }
}
