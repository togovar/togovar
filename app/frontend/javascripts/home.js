import StoreManager from '../javascripts/classes/StoreManager.js';
import ResultsView from '../javascripts/classes/ResultsView.js';
import SideBar from '../javascripts/classes/SideBar.js';
import Configuration from '../javascripts/classes/Configuration.js';
import SelectedRowIndicator from '../javascripts/classes/SelectedRowIndicator.js';
import Karyotype from '../javascripts/classes/Karyotype.js';
import ActivityIndicator from '../javascripts/classes/ActivityIndicator.js';
import ModuleTabsView from '../javascripts/classes/ModuleTabsView.js';
// import CollapseView from '../javascripts/classes/CollapseView.js';
import TopPageLayoutManager from '../javascripts/classes/TopPageLayoutManager.js';
import DownloadButton from './classes/DownloadButton.js';
// Search
import SimpleSearchView from './components/Common/SearchField/SimpleSearchView.js';
import AdvancedSearchBuilderView from '../javascripts/classes/AdvancedSearchBuilderView.js';
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
import TippyBox from '../javascripts/classes/TippyBox.js';

export function initHome() {
  setUserAgent();

  StoreManager.setData('offset', 0);
  StoreManager.setData('selectedRow', undefined);

  new Configuration(document.getElementById('Configuration'));

  new Karyotype(document.getElementById('Karyotype'));

  new ActivityIndicator(document.getElementById('ActivityIndicator'));

  StoreManager.readySearch(() => {
    // 検索結果表示画面
    const resultView = new ResultsView(document.getElementById('ResultsView'));

    // Download
    new DownloadButton(document.getElementById('DownloadJson'));
    new DownloadButton(document.getElementById('DownloadCsv'));
    new DownloadButton(document.getElementById('DownloadTsv'));

    // サイドバー
    new SideBar(document.getElementById('SideBar'));
    // aside 要素の準備（フィルター）
    new PanelViewCheckList(
      document.getElementById('FilterDatasets'),
      'dataset',
      'statisticsDataset'
    );
    new PanelViewFilterAlternativeAlleleFrequency(
      document.getElementById('FilterAlternativeAlleleFrequency')
    );
    new PanelViewFilterVariantCallingQuality(
      document.getElementById('FilterVariantCallingQuality')
    );
    new PanelViewCheckList(
      document.getElementById('FilterVariantType'),
      'type',
      'statisticsType'
    );
    new PanelViewCheckList(
      document.getElementById('FilterClinicalSignificance'),
      'significance',
      'statisticsSignificance'
    );
    new PanelViewFilterConsequence(
      document.getElementById('FilterConsequence')
    );
    new PanelViewCheckList(document.getElementById('FilterSIFT'), 'sift');
    new PanelViewCheckList(
      document.getElementById('FilterPolyPhen'),
      'polyphen'
    );
    // aside 要素の準備（バリアントプレビュー）
    new PanelViewPreviewGene(document.getElementById('PreviewGene'));
    new PreviewToVariantReport(
      document.getElementById('PreviewToVariantReport')
    );
    new PanelViewPreviewExternalLinks(
      document.getElementById('PreviewExternalLinks')
    );
    new PanelViewPreviewAlternativeAlleleFrequencies(
      document.getElementById('PreviewAlternativeAlleleFrequencies')
    );
    new PanelViewPreviewConsequence(
      document.getElementById('PreviewConsequence')
    );
    new PanelViewPreviewClinicalSignificance(
      document.getElementById('PreviewClinicalSignificance')
    );
    // インジケータ
    new SelectedRowIndicator(document.getElementById('RowIndicator'));
    // レイアウトマネージャ
    TopPageLayoutManager.init([resultView]);
    // 開閉
    // const elm = document.querySelector('#AdvancedSearchView .collapse-view');
    // new CollapseView(elm);

    // 検索窓
    new SimpleSearchView();
    new AdvancedSearchBuilderView(
      document.getElementById('AdvancedSearchBuilderView')
    );
    // change search mode
    document
      .querySelectorAll('#SearchInputView > .tabscontainer > ul > li')
      .forEach((elm) => {
        elm.addEventListener('click', (e) => {
          StoreManager.setData('searchMode', e.target.dataset.target);
        });
      });
    // モジュールタブメニュー
    document.querySelectorAll('.module-tabs-view').forEach((elm) => {
      new ModuleTabsView(elm);
    });
    // Tooltip
    new TippyBox();
  });
}

function setUserAgent() {
  const ua = window.navigator.userAgent.toLowerCase();
  let os = '';
  switch (true) {
    case ua.indexOf('windows nt') !== -1:
      os = 'windows';
      break;
    case ua.indexOf('mac os x') !== -1:
      os = 'mac';
      break;
  }
  document.querySelector('html').dataset.os = os;
}
