import { storeManager } from './store/StoreManager';
import { ResultsView } from './components/Results/ResultsView';
import SideBar from './components/SideBar';
import Karyotype from './components/Karyotype/Karyotype';
import LoadingIndicator from './components/LoadingIndicator';
import ModuleTabsView from './components/ModuleTabsView';
import DownloadButton from './components/DownloadButton';
import SimpleSearchView from './components/SearchField/SimpleSearch/SimpleSearchView';
import PanelViewCheckList from './components/PanelView/PanelViewCheckList';
import PanelViewFilterAlternateAlleleFrequency from './components/PanelView/PanelViewFilterAlternateAlleleFrequency';
import PanelViewFilterVariantCallingQuality from './components/PanelView/PanelViewFilterVariantCallingQuality';
import PanelViewFilterConsequence from './components/PanelView/PanelViewFilterConsequence';
import PanelViewPreviewGene from './components/PanelView/PanelViewPreviewGene';
import PreviewToVariantReport from './components/PanelView/PreviewToVariantReport';
import PanelViewPreviewExternalLinks from './components/PanelView/PanelViewPreviewExternalLinks';
import PanelViewPreviewAlternateAlleleFrequencies from './components/PanelView/PanelViewPreviewAlternateAlleleFrequencies';
import PanelViewPreviewConsequence from './components/PanelView/PanelViewPreviewConsequence';
import PanelViewPreviewClinicalSignificance from './components/PanelView/PanelViewPreviewClinicalSignificance';
import FloatingInfo from './components/FloatingInfo';
import qs from 'qs';
import { extractSearchCondition } from './store/searchManager';
import { initializeApp } from './store/initializeApp';
import { selectRequired } from './utils/dom/select';
import type {
  MasterConditions,
  SimpleSearchCurrentConditions,
} from './types/search';
import type { AdvancedSearchBuilderView as AdvancedSearchBuilderViewType } from './components/AdvancedSearch/AdvancedSearchBuilderView';

// webpackのrequire()をTypeScriptで使うための型宣言（FloatingInfo.tsと同じパターン）。
declare const require: (path: string) => unknown;

// 開発環境用クリーンアップをwindowに公開するための型補完。
declare global {
  interface Window {
    cleanupTogovar?: () => void;
  }
}

// モジュール起動時に一度だけURLを解析し、全初期化関数で参照できるようにする。
const _currentUrlParams = qs.parse(window.location.search.substring(1));

// ページライフサイクルをまたいでインスタンスを管理する変数。
// pagehide時にdestroy/disposeを呼ぶためモジュールスコープで保持する。
let globalResultsView: ResultsView | null = null;
let globalFloatingInfo: FloatingInfo | null = null;
let advancedSearchBuilderView: AdvancedSearchBuilderViewType | null = null;
let advancedSearchBuilderViewPromise: Promise<
  AdvancedSearchBuilderViewType | undefined
> | null = null;

/**
 * ホームページのエントリポイント。packs/index.ts のDOMContentLoaded後に呼ぶ。
 */
export function initHome(): void {
  setUserAgent();

  storeManager.setData('offset', 0);
  storeManager.setData('selectedRow', undefined);

  new Karyotype(selectRequired<HTMLElement>(document, '#Karyotype'));
  new LoadingIndicator(
    selectRequired<HTMLElement>(document, '#LoadingIndicator')
  );

  readyInitialSearch(() => {
    initResultsView();
    initDownloadButtons();
    initSidebar();
    initVariantPreview();
    initSearchInputs();
    initModuleTabs();
    initTooltip();
    setupCleanupHandlers();
  });
}

/**
 * OS情報をhtml要素のdata-os属性に書き込む。
 * OS別のフォント・スクロールバー調整をCSSのdata属性セレクターで分岐するため。
 */
function setUserAgent(): void {
  const ua = window.navigator.userAgent.toLowerCase();
  let os = '';
  switch (true) {
    case ua.includes('windows nt'):
      os = 'windows';
      break;
    case ua.includes('mac os x'):
      os = 'mac';
      break;
  }
  selectRequired<HTMLHtmlElement>(document, 'html').dataset.os = os;
}

/**
 * 検索マスタ読み込みからsearchMode確定までをまとめ、
 * サブスクライバが正しい条件で初回検索を発火できる順序を保証する。
 * StoreManagerの依存順（master → condition → mode）を一箇所で管理するため。
 */
function readyInitialSearch(callback: () => void): void {
  const simpleSearchConditionsMaster = loadSearchConditionsMaster();
  Object.freeze(simpleSearchConditionsMaster);
  storeManager.setData(
    'simpleSearchConditionsMaster',
    simpleSearchConditionsMaster
  );

  // URLパラメータからAdvanced条件をStoreへ反映し、searchModeを取得する。
  const searchMode = initializeApp();

  // Simple Searchの初期条件のみURLから復元する。Advanced側はinitializeApp内で処理済み。
  const simpleSearchConditions =
    searchMode === 'simple'
      ? extractSearchCondition(
          _currentUrlParams as SimpleSearchCurrentConditions
        )
      : {};
  storeManager.setData('simpleSearchConditions', simpleSearchConditions);

  // searchModeを最後にセットし、条件が揃った状態で検索開始の副作用を発火する。
  // 初期ロード時はURLがすでに正しいためsetSearchModeFromHistoryを使い、
  // pushStateによる「ユーザー操作なし履歴エントリ」警告を防ぐ。
  storeManager.setSearchModeFromHistory(searchMode);

  callback();
}

/**
 * TOGOVAR_FRONTEND_REFERENCEに対応するSimple Search条件マスタJSONをwebpack requireで取得する。
 * 型が'GRCh37'|'GRCh38'に限定されているためdefaultは到達しないが、型安全のため残す。
 */
function loadSearchConditionsMaster(): MasterConditions[] {
  switch (TOGOVAR_FRONTEND_REFERENCE) {
    case 'GRCh37':
      return require('../assets/GRCh37/search_conditions.json') as MasterConditions[];
    case 'GRCh38':
      return require('../assets/GRCh38/search_conditions.json') as MasterConditions[];
    default:
      return [];
  }
}

/**
 * ResultsViewインスタンスを生成し、pagehideで破棄できるようグローバル参照に保持する。
 * -layout-ready クラス付与をrAFで遅らせることで、初期レイアウト計算が完了してからCSSを適用する。
 */
function initResultsView(): void {
  globalResultsView = new ResultsView(
    selectRequired<HTMLElement>(document, '#ResultsView')
  );
  requestAnimationFrame(() => {
    document.body.classList.add('-layout-ready');
  });
}

/**
 * ページ離脱時にResultsViewとFloatingInfoのリソースを解放する。
 * bfcache対応のためpagehide+persisted=falseで呼ぶ（setupCleanupHandlers参照）。
 */
function cleanupApplication(): void {
  if (globalResultsView) {
    globalResultsView.destroy();
    globalResultsView = null;
  }

  if (globalFloatingInfo) {
    globalFloatingInfo.dispose();
    globalFloatingInfo = null;
  }
}

/**
 * bfcacheに入らない離脱（persisted=false）でのみクリーンアップを実行する。
 * キャッシュ復元時にイベントリスナーが消えないよう、visibilitychangeでは破棄しない。
 * 開発用にwindow.cleanupTogovarとして手動実行も公開する。
 */
function setupCleanupHandlers(): void {
  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    if (!event.persisted) {
      cleanupApplication();
    }
  });

  window.cleanupTogovar = cleanupApplication;
}

/**
 * ダウンロードボタン3種（JSON/CSV/TSV）をまとめて初期化する。
 */
function initDownloadButtons(): void {
  for (const id of ['DownloadJson', 'DownloadCsv', 'DownloadTsv']) {
    new DownloadButton(selectRequired<HTMLElement>(document, `#${id}`));
  }
}

/**
 * サイドバーとフィルタパネル群を初期化する。
 * Simple/Advanced共通の統計パネルとSimple専用の絞り込みフィルタをまとめて生成する。
 */
function initSidebar(): void {
  new SideBar(selectRequired<HTMLElement>(document, '#SideBar'));
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterDatasets'),
    'dataset',
    'statisticsDataset'
  );
  new PanelViewFilterAlternateAlleleFrequency(
    selectRequired<HTMLElement>(document, '#FilterAlternateAlleleFrequency')
  );
  new PanelViewFilterVariantCallingQuality(
    selectRequired<HTMLElement>(document, '#FilterVariantCallingQuality')
  );
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterVariantType'),
    'type',
    'statisticsType'
  );
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterClinicalSignificance'),
    'significance',
    'statisticsSignificance'
  );
  new PanelViewFilterConsequence(
    selectRequired<HTMLElement>(document, '#FilterConsequence')
  );
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterSIFT'),
    'sift'
  );
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterPolyPhen'),
    'polyphen'
  );
  new PanelViewCheckList(
    selectRequired<HTMLElement>(document, '#FilterAlphaMissense'),
    'alphamissense'
  );
}

/**
 * バリアント行クリック時にサイドバーへ展開するプレビューパネル群を初期化する。
 */
function initVariantPreview(): void {
  new PanelViewPreviewGene(
    selectRequired<HTMLElement>(document, '#PreviewGene')
  );
  new PreviewToVariantReport(
    selectRequired<HTMLElement>(document, '#PreviewToVariantReport')
  );
  new PanelViewPreviewExternalLinks(
    selectRequired<HTMLElement>(document, '#PreviewExternalLinks')
  );
  new PanelViewPreviewAlternateAlleleFrequencies(
    selectRequired<HTMLElement>(document, '#PreviewAlternateAlleleFrequencies')
  );
  new PanelViewPreviewConsequence(
    selectRequired<HTMLElement>(document, '#PreviewConsequence')
  );
  new PanelViewPreviewClinicalSignificance(
    selectRequired<HTMLElement>(document, '#PreviewClinicalSignificance')
  );
}

/**
 * SimpleSearchViewを初期化し、タブ切り替え時のsearchMode更新とAdvanced動的ロードを設定する。
 * Advanced SearchはWebpackのコード分割で初回タブ選択時のみロードし、初期バンドルサイズを抑える。
 */
function initSearchInputs(): void {
  new SimpleSearchView();

  if (storeManager.getData('searchMode') === 'advanced') {
    loadAdvancedSearchBuilderView();
  }

  document
    .querySelectorAll<HTMLLIElement>(
      '#SearchInputView > .tabscontainer > ul > li'
    )
    .forEach((elm) => {
      elm.addEventListener('click', (e: Event) => {
        const mode = (e.currentTarget as HTMLLIElement).dataset.target;
        if (mode !== 'simple' && mode !== 'advanced') return;

        storeManager.setData('searchMode', mode);

        if (mode === 'advanced') {
          loadAdvancedSearchBuilderView();
        }
      });
    });
}

/**
 * Advanced Search本体をWebpackの動的importで遅延ロードする。
 * 2回目以降の呼び出しでは既存インスタンスを再利用し、ロード中は同一Promiseを返して重複ロードを防ぐ。
 */
function loadAdvancedSearchBuilderView(): Promise<
  AdvancedSearchBuilderViewType | undefined
> {
  if (advancedSearchBuilderView) {
    return Promise.resolve(advancedSearchBuilderView);
  }

  if (advancedSearchBuilderViewPromise) {
    return advancedSearchBuilderViewPromise;
  }

  advancedSearchBuilderViewPromise = import(
    /* webpackChunkName: "advanced-search" */
    './components/AdvancedSearch/AdvancedSearchBuilderView'
  )
    .then(({ AdvancedSearchBuilderView }) => {
      advancedSearchBuilderView = new AdvancedSearchBuilderView(
        selectRequired<HTMLElement>(document, '#AdvancedSearchBuilderView')
      );
      return advancedSearchBuilderView;
    })
    .catch((error: unknown) => {
      advancedSearchBuilderViewPromise = null;
      console.error('Failed to import advanced search module:', error);
      return undefined;
    });

  return advancedSearchBuilderViewPromise;
}

/**
 * .module-tabs-view要素をすべてModuleTabsViewで初期化する。
 * SearchInputView（Simple/Advanced切り替えタブ）を含む複数箇所で共通利用するため一括処理する。
 */
function initModuleTabs(): void {
  document.querySelectorAll<HTMLElement>('.module-tabs-view').forEach((elm) => {
    new ModuleTabsView(elm);
  });
}

/**
 * FloatingInfoを初期化してツールチップを有効化する。
 * 再呼び出し時は前インスタンスをdisposeしてMutationObserverリークを防ぐ。
 */
function initTooltip(): void {
  if (globalFloatingInfo) {
    globalFloatingInfo.dispose();
  }
  globalFloatingInfo = new FloatingInfo();
}
