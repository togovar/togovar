import CollapseView from './CollapseView.js';

export default class AdvancedSearchDatasetsView {

  constructor(elm) {
    // generate
    // collapse
    elm.querySelectorAll('.collapse-view').forEach(elm => {
      new CollapseView(elm);
    });
  }

}