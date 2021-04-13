import "../stylesheets/main.sass";

import 'jquery'
import 'jquery-ui/ui/widget'
import 'jquery-ui/ui/data'
import 'jquery-ui/ui/scroll-parent'
import 'jquery-ui/ui/widgets/draggable'
import 'jquery-ui/ui/widgets/mouse'
import 'jquery-deparam'

import {PAGE} from '../javascripts/global.js';
import {initHome} from '../javascripts/home.js';

// Load the favicon
import '!file-loader?name=[name].[ext]!../images/favicon.svg';
import '!file-loader?name=[name].[ext]!../assets/togovar.jsonld';

let isReady =
  document.readyState === 'complete' ||
  (document.readyState !== 'loading' &&
    !document.documentElement.doScroll);
if (isReady) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

function init() {

  switch (PAGE) {
    case 'home':
      initHome();
      break;
    case 'variant':
      break;
  }
}
<<<<<<< HEAD
=======

function initHome() {
  StoreManager.ready(() => {
    new SearchConditionController(document.getElementById('SearchView'));

    new ResultsView(document.getElementById('ResultsView'));

    new SideBar(document.getElementById('SideBar'));

    new PanelViewCheckList(document.getElementById('FilterDatasets'), 'dataset', 'statisticsDataset');
    new PanelViewFilterAlternativeAlleleFrequency(document.getElementById('FilterAlternativeAlleleFrequency'));
    new PanelViewFilterVariantCallingQuality(document.getElementById('FilterVariantCallingQuality'));
    new PanelViewCheckList(document.getElementById('FilterVariantType'), 'type', 'statisticsType');
    new PanelViewCheckList(document.getElementById('FilterClinicalSignificance'), 'significance', 'statisticsSignificance');
    new PanelViewFilterConsequence(document.getElementById('FilterConsequence'));
    new PanelViewCheckList(document.getElementById('FilterSIFT'), 'sift');
    new PanelViewCheckList(document.getElementById('FilterPolyPhen'), 'polyphen');

    new PanelViewPreviewGene(document.getElementById('PreviewGene'));
    new PreviewToVariantReport(document.getElementById('PreviewToVariantReport'));
    new PanelViewPreviewExternalLinks(document.getElementById('PreviewExternalLinks'));
    new PanelViewPreviewAlternativeAlleleFrequencies(document.getElementById('PreviewAlternativeAlleleFrequencies'));
    new PanelViewPreviewConsequence(document.getElementById('PreviewConsequence'));
    new PanelViewPreviewClinicalSignificance(document.getElementById('PreviewClinicalSignificance'));

    new SelectedRowIndicator(document.getElementById('RowIndicator'));

    new TippyBox(document.getElementById('tooltiptemplate'));
  });
}
>>>>>>> 020bed9 (add tooltip)
