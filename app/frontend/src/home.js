import { storeManager } from '../src/store/StoreManager';
import { ResultsView } from '../src/classes/Results/ResultsView.js';
import SideBar from '../src/classes/SideBar.js';
import Configuration from '../src/classes/Configuration.js';
import SelectedRowIndicator from '../src/classes/SelectedRowIndicator.js';
import Karyotype from '../src/classes/Karyotype.js';
import ActivityIndicator from '../src/classes/ActivityIndicator.js';
import ModuleTabsView from '../src/classes/ModuleTabsView.js';
// import CollapseView from '../src/classes/CollapseView.js';
import TopPageLayoutManager from '../src/classes/TopPageLayoutManager.js';
import DownloadButton from './classes/DownloadButton.js';
// Search
import SimpleSearchView from './components/Common/SearchField/SimpleSearch/SimpleSearchView.js';
import AdvancedSearchBuilderView from '../src/classes/AdvancedSearchBuilderView.js';
// PanelViews
// PanelViews: Filters
import PanelViewCheckList from '../src/classes/PanelViewCheckList.js';
import PanelViewFilterAlternativeAlleleFrequency from '../src/classes/PanelViewFilterAlternativeAlleleFrequency.js';
import PanelViewFilterVariantCallingQuality from '../src/classes/PanelViewFilterVariantCallingQuality.js';
import PanelViewFilterConsequence from '../src/classes/PanelViewFilterConsequence.js';
// PanelViews: Variant preview
import PanelViewPreviewGene from '../src/classes/PanelViewPreviewGene.js';
import PreviewToVariantReport from '../src/classes/PreviewToVariantReport.js';
import PanelViewPreviewExternalLinks from '../src/classes/PanelViewPreviewExternalLinks.js';
import PanelViewPreviewAlternativeAlleleFrequencies from '../src/classes/PanelViewPreviewAlternativeAlleleFrequencies.js';
import PanelViewPreviewConsequence from '../src/classes/PanelViewPreviewConsequence.js';
import PanelViewPreviewClinicalSignificance from '../src/classes/PanelViewPreviewClinicalSignificance.js';
import TippyBox from '../src/classes/TippyBox.js';

import qs from 'qs';
import { extractSearchCondition } from './store/searchManager';
import { initializeApp } from './store/initializeApp';
const DEFAULT_SEARCH_MODE = 'simple'; // 'simple' or 'advanced';
const _currentUrlParams = qs.parse(window.location.search.substring(1));

export function initHome() {
  setUserAgent();

  storeManager.setData('offset', 0);
  storeManager.setData('selectedRow', undefined);

  initializeApp(); // 先にURLからモードを設定

  new Configuration(document.getElementById('Configuration'));

  new Karyotype(document.getElementById('Karyotype'));

  new ActivityIndicator(document.getElementById('ActivityIndicator'));

  readyInitialSearch(() => {
    initResultsView();
    initDownloadButtons();
    initSidebar();
    initVariantPreview();
    initSearchInputs();
    initModuleTabs();
    initTooltip();
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

/** 初期検索の準備を行うメソッド
 * @param {Function} callback - 準備完了時に呼び出すコールバック関数 */
function readyInitialSearch(callback) {
  const simpleSearchConditionsMaster = ((referenceGenome) => {
    switch (referenceGenome) {
      case 'GRCh37':
        return require('../assets/GRCh37/search_conditions.json');
      case 'GRCh38':
        return require('../assets/GRCh38/search_conditions.json');
      default:
        return [];
    }
  })(TOGOVAR_FRONTEND_REFERENCE);

  Object.freeze(simpleSearchConditionsMaster);
  storeManager.setData(
    'simpleSearchConditionsMaster',
    simpleSearchConditionsMaster
  );

  // URLパラメータから検索条件を復元
  const currentSearchMode = storeManager.getData('searchMode');
  const simpleSearchConditions = {};
  const advancedSearchConditions = {};

  // URLパラメータからシンプル検索条件を抽出
  switch (currentSearchMode) {
    case 'simple':
      Object.assign(
        simpleSearchConditions,
        extractSearchCondition(_currentUrlParams)
      );
      break;
    case 'advanced':
      // advanced用の条件抽出を追加
      break;
  }

  // 検索条件をストアに保存（isFromHistory = trueとして設定）
  storeManager.setData('simpleSearchConditions', simpleSearchConditions);
  storeManager.setData('advancedSearchConditions', advancedSearchConditions);

  callback();
}

// ヘルパー関数: 要素取得
const getElement = (id) => document.getElementById(id);
const getAllElements = (selector) => document.querySelectorAll(selector);

// 検索結果画面の初期化
function initResultsView() {
  const resultView = new ResultsView(getElement('ResultsView'));
  TopPageLayoutManager.init([resultView]);
}

// ダウンロードボタンの初期化
function initDownloadButtons() {
  ['DownloadJson', 'DownloadCsv', 'DownloadTsv'].forEach((id) => {
    new DownloadButton(getElement(id));
  });
}

// サイドバーの初期化
function initSidebar() {
  new SideBar(getElement('SideBar'));
  new PanelViewCheckList(
    getElement('FilterDatasets'),
    'dataset',
    'statisticsDataset'
  );
  new PanelViewFilterAlternativeAlleleFrequency(
    getElement('FilterAlternativeAlleleFrequency')
  );
  new PanelViewFilterVariantCallingQuality(
    getElement('FilterVariantCallingQuality')
  );
  new PanelViewCheckList(
    getElement('FilterVariantType'),
    'type',
    'statisticsType'
  );
  new PanelViewCheckList(
    getElement('FilterClinicalSignificance'),
    'significance',
    'statisticsSignificance'
  );
  new PanelViewFilterConsequence(getElement('FilterConsequence'));
  new PanelViewCheckList(getElement('FilterSIFT'), 'sift');
  new PanelViewCheckList(getElement('FilterPolyPhen'), 'polyphen');
  new PanelViewCheckList(getElement('FilterAlphaMissense'), 'alphamissense');
}

// バリアントプレビューの初期化
function initVariantPreview() {
  new PanelViewPreviewGene(getElement('PreviewGene'));
  new PreviewToVariantReport(getElement('PreviewToVariantReport'));
  new PanelViewPreviewExternalLinks(getElement('PreviewExternalLinks'));
  new PanelViewPreviewAlternativeAlleleFrequencies(
    getElement('PreviewAlternativeAlleleFrequencies')
  );
  new PanelViewPreviewConsequence(getElement('PreviewConsequence'));
  new PanelViewPreviewClinicalSignificance(
    getElement('PreviewClinicalSignificance')
  );
}

// 検索窓の初期化
function initSearchInputs() {
  new SimpleSearchView();
  new AdvancedSearchBuilderView(getElement('AdvancedSearchBuilderView'));

  // 検索モード変更の設定
  getAllElements('#SearchInputView > .tabscontainer > ul > li').forEach(
    (elm) => {
      elm.addEventListener('click', (e) => {
        storeManager.setData('searchMode', e.target.dataset.target);
      });
    }
  );
}

// モジュールタブメニューの初期化
function initModuleTabs() {
  getAllElements('.module-tabs-view').forEach((elm) => {
    new ModuleTabsView(elm);
  });
}

// ツールチップの初期化
function initTooltip() {
  new TippyBox();
}
