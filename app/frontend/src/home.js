import { storeManager } from '../src/store/StoreManager';
import { ResultsView } from '../src/classes/Results/ResultsView';
import SideBar from '../src/classes/SideBar.js';
import Karyotype from '../src/classes/Karyotype.js';
import ActivityIndicator from '../src/classes/ActivityIndicator.js';
import ModuleTabsView from '../src/classes/ModuleTabsView.js';
// import CollapseView from '../src/classes/CollapseView.js';
import TopPageLayoutManager from '../src/classes/TopPageLayoutManager.js';
import DownloadButton from './classes/DownloadButton.ts';
// Search
import SimpleSearchView from './components/SearchField/SimpleSearch/SimpleSearchView';
// PanelViews
// PanelViews: Filters
import PanelViewCheckList from '../src/classes/PanelViewCheckList.ts';
import PanelViewFilterAlternateAlleleFrequency from '../src/classes/PanelViewFilterAlternateAlleleFrequency.js';
import PanelViewFilterVariantCallingQuality from '../src/classes/PanelViewFilterVariantCallingQuality.js';
import PanelViewFilterConsequence from '../src/classes/PanelViewFilterConsequence.ts';
// PanelViews: Variant preview
import PanelViewPreviewGene from '../src/classes/PanelViewPreviewGene.js';
import PreviewToVariantReport from '../src/classes/PreviewToVariantReport.js';
import PanelViewPreviewExternalLinks from '../src/classes/PanelViewPreviewExternalLinks.js';
import PanelViewPreviewAlternateAlleleFrequencies from '../src/classes/PanelViewPreviewAlternateAlleleFrequencies.js';
import PanelViewPreviewConsequence from '../src/classes/PanelViewPreviewConsequence.js';
import PanelViewPreviewClinicalSignificance from '../src/classes/PanelViewPreviewClinicalSignificance.js';
import FloatingInfo from '../src/classes/FloatingInfo.ts';

import qs from 'qs';
import { extractSearchCondition } from './store/searchManager';
import { initializeApp } from './store/initializeApp';
const _currentUrlParams = qs.parse(window.location.search.substring(1));

export function initHome() {
  setUserAgent();

  storeManager.setData('offset', 0);
  storeManager.setData('selectedRow', undefined);

  initializeApp(); // 先にURLからモードを設定

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

    // クリーンアップハンドラーを設定
    setupCleanupHandlers();
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

// グローバル変数: ResultsView インスタンスを管理
let globalResultsView = null;
let globalFloatingInfo = null;
let advancedSearchBuilderView = null;
let advancedSearchBuilderViewPromise = null;

// 検索結果画面の初期化
function initResultsView() {
  const resultView = new ResultsView(getElement('ResultsView'));
  globalResultsView = resultView; // グローバル参照を保存
  TopPageLayoutManager.init([resultView]);
  requestAnimationFrame(() => {
    document.body.classList.add('-layout-ready');
  });
}

// クリーンアップ機能: すべてのリソースを解放
function cleanupApplication() {
  console.log('Cleaning up application resources...');

  // ResultsView のクリーンアップ
  if (globalResultsView && typeof globalResultsView.destroy === 'function') {
    try {
      globalResultsView.destroy();
      console.log('ResultsView cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up ResultsView:', error);
    }
    globalResultsView = null;
  }

  // FloatingInfo のクリーンアップ
  if (globalFloatingInfo && typeof globalFloatingInfo.dispose === 'function') {
    try {
      globalFloatingInfo.dispose();
    } catch (error) {
      console.error('Error cleaning up FloatingInfo:', error);
    }
    globalFloatingInfo = null;
  }

  // TopPageLayoutManager のクリーンアップ
  if (typeof TopPageLayoutManager.cleanup === 'function') {
    try {
      TopPageLayoutManager.cleanup();
      console.log('TopPageLayoutManager cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up TopPageLayoutManager:', error);
    }
  }

  // StoreManager のクリーンアップ（必要に応じて）
  if (typeof storeManager.cleanup === 'function') {
    try {
      storeManager.cleanup();
      console.log('StoreManager cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up StoreManager:', error);
    }
  }

  console.log('Application cleanup completed.');
}

// ページ離脱時のクリーンアップ設定
function setupCleanupHandlers() {
  // bfcache 復元時にイベントリスナーが消えないよう、キャッシュされない離脱時だけ破棄する
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      cleanupApplication();
    }
  });

  // ページ非表示時（タブ切り替えやブラウザ最小化）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // 必要に応じてクリーンアップ（通常は beforeunload で十分）
      // cleanupApplication();
    }
  });

  // 開発環境用: グローバル関数として手動クリーンアップを公開
  if (typeof window !== 'undefined') {
    window.cleanupTogovar = cleanupApplication;
  }
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
  new PanelViewFilterAlternateAlleleFrequency(
    getElement('FilterAlternateAlleleFrequency')
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
  new PanelViewPreviewAlternateAlleleFrequencies(
    getElement('PreviewAlternateAlleleFrequencies')
  );
  new PanelViewPreviewConsequence(getElement('PreviewConsequence'));
  new PanelViewPreviewClinicalSignificance(
    getElement('PreviewClinicalSignificance')
  );
}

// 検索窓の初期化
function initSearchInputs() {
  new SimpleSearchView();

  if (storeManager.getData('searchMode') === 'advanced') {
    loadAdvancedSearchBuilderView();
  }

  // 検索モード変更の設定
  getAllElements('#SearchInputView > .tabscontainer > ul > li').forEach(
    (elm) => {
      elm.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.target;
        if (mode !== 'simple' && mode !== 'advanced') return;

        storeManager.setData('searchMode', mode);

        if (mode === 'advanced') {
          loadAdvancedSearchBuilderView();
        }
      });
    }
  );
}

function loadAdvancedSearchBuilderView() {
  if (advancedSearchBuilderView) {
    return Promise.resolve(advancedSearchBuilderView);
  }

  if (advancedSearchBuilderViewPromise) {
    return advancedSearchBuilderViewPromise;
  }

  advancedSearchBuilderViewPromise = import(
    /* webpackChunkName: "advanced-search" */
    '../src/classes/AdvancedSearchBuilderView.ts'
  )
    .then(({ AdvancedSearchBuilderView }) => {
      advancedSearchBuilderView = new AdvancedSearchBuilderView(
        getElement('AdvancedSearchBuilderView')
      );
      return advancedSearchBuilderView;
    })
    .catch((error) => {
      advancedSearchBuilderViewPromise = null;
      console.error('Failed to import advanced search module:', error);
    });

  return advancedSearchBuilderViewPromise;
}

// モジュールタブメニューの初期化
function initModuleTabs() {
  getAllElements('.module-tabs-view').forEach((elm) => {
    new ModuleTabsView(elm);
  });
}

// ツールチップの初期化
function initTooltip() {
  if (globalFloatingInfo && typeof globalFloatingInfo.dispose === 'function') {
    globalFloatingInfo.dispose();
  }

  globalFloatingInfo = new FloatingInfo();
}
