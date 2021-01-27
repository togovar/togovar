import "../stylesheets/main.sass";

import 'jquery'
import 'jquery-ui/ui/widget'
import 'jquery-ui/ui/data'
import 'jquery-ui/ui/scroll-parent'
import 'jquery-ui/ui/widgets/draggable'
import 'jquery-ui/ui/widgets/mouse'
import 'jquery-deparam'

import {PAGE} from '../javascripts/global.js';
import StoreManager from '../javascripts/classes/StoreManager.js';
import ResultsView from '../javascripts/classes/ResultsView.js';
import SideBar from '../javascripts/classes/SideBar.js';
import Configuration from '../javascripts/classes/Configuration.js';
import SelectedRowIndicator from '../javascripts/classes/SelectedRowIndicator.js';
import Karyotype from '../javascripts/classes/Karyotype.js';
import ActivityIndicator from '../javascripts/classes/ActivityIndicator.js';
import ModuleTabsView from '../javascripts/classes/ModuleTabsView.js';
import CollapseView from '../javascripts/classes/CollapseView.js';
import TopPageLayoutManager from '../javascripts/classes/TopPageLayoutManager.js';
// Search
import SearchConditionController from '../javascripts/classes/SearchConditionController.js';
import AdvancedSearchDatasetsView from '../javascripts/classes/AdvancedSearchDatasetsView.js';
// PanelViews
// PanelViews: Filters
import PanelViewCheckList from '../javascripts/classes/PanelViewCheckList.js';
import PanelViewFilterAlternativeAlleleFrequency from '../javascripts/classes/PanelViewFilterAlternativeAlleleFrequency.js';
import PanelViewFilterVariantCallingQuality from '../javascripts/classes/PanelViewFilterVariantCallingQuality.js';
import PanelViewFilterConsequence from '../javascripts/classes/PanelViewFilterConsequence.js';
// PanelViews: Variant preview
import PanelViewPreviewGene from '../javascripts/classes/PanelViewPreviewGene.js';
import PreviewToVariantReport from '../javascripts/classes/PreviewToVariantReport.js';
import PanelViewPreviewExternalLinks from '../javascripts/classes/PanelViewPreviewExternalLinks.js';
import PanelViewPreviewAlternativeAlleleFrequencies from '../javascripts/classes/PanelViewPreviewAlternativeAlleleFrequencies.js';
import PanelViewPreviewConsequence from '../javascripts/classes/PanelViewPreviewConsequence.js';
import PanelViewPreviewClinicalSignificance from '../javascripts/classes/PanelViewPreviewClinicalSignificance.js';

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
  StoreManager.setData('offset', 0);
  StoreManager.setData('selectedRow', undefined);

  new Configuration(document.getElementById('Configuration'));

  new Karyotype(document.getElementById('Karyotype'));

  new ActivityIndicator(document.getElementById('ActivityIndicator'));

  switch (PAGE) {
    case 'home':
      initHome();
      break;
    case 'variant':
      break;
  }
}

function initHome() {
  StoreManager.ready(() => {
    // 検索窓
    new SearchConditionController(document.getElementById('SimpleSearchView'));
    new AdvancedSearchDatasetsView(document.getElementById('AdvancedSearchDatasetsView'))
    // モジュールタブメニュー
    document.querySelectorAll('.module-tabs-view').forEach(elm => {
      new ModuleTabsView(elm);
    });

    // 検索結果表示画面
    const resultView = new ResultsView(document.getElementById('ResultsView'));

    // サイドバー
    new SideBar(document.getElementById('SideBar'));
    // aside 要素の準備（フィルター）
    new PanelViewCheckList(document.getElementById('FilterDatasets'), 'dataset', 'statisticsDataset');
    new PanelViewFilterAlternativeAlleleFrequency(document.getElementById('FilterAlternativeAlleleFrequency'));
    new PanelViewFilterVariantCallingQuality(document.getElementById('FilterVariantCallingQuality'));
    new PanelViewCheckList(document.getElementById('FilterVariantType'), 'type', 'statisticsType');
    new PanelViewCheckList(document.getElementById('FilterClinicalSignificance'), 'significance', 'statisticsSignificance');
    new PanelViewFilterConsequence(document.getElementById('FilterConsequence'));
    new PanelViewCheckList(document.getElementById('FilterSIFT'), 'sift');
    new PanelViewCheckList(document.getElementById('FilterPolyPhen'), 'polyphen');
    // aside 要素の準備（バリアントプレビュー）
    new PanelViewPreviewGene(document.getElementById('PreviewGene'));
    new PreviewToVariantReport(document.getElementById('PreviewToVariantReport'));
    new PanelViewPreviewExternalLinks(document.getElementById('PreviewExternalLinks'));
    new PanelViewPreviewAlternativeAlleleFrequencies(document.getElementById('PreviewAlternativeAlleleFrequencies'));
    new PanelViewPreviewConsequence(document.getElementById('PreviewConsequence'));
    new PanelViewPreviewClinicalSignificance(document.getElementById('PreviewClinicalSignificance'));
    // インジケータ
    new SelectedRowIndicator(document.getElementById('RowIndicator'));
    // 開閉
    const elm = document.querySelector('#AdvancedSearchView .collapse-view');
    new CollapseView(elm);
    // レイアウトマネージャ
    TopPageLayoutManager.init([resultView]);
  });
}
