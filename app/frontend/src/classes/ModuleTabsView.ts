type ModuleTab = HTMLLIElement;
type ModuleSection = HTMLElement;

export default class ModuleTabsView {
  private readonly _tabs: ModuleTab[];
  private readonly _sections: ModuleSection[];
  private readonly _sectionByTab = new Map<ModuleTab, ModuleSection>();
  private readonly _boundUrlParam: string | undefined;

  /**
   * タブとセクションの対応をDOM構造から確定し、初期タブ選択までをこのView内に閉じ込める。
   */
  constructor(elm: HTMLElement) {
    this._tabs = Array.from(
      elm.querySelectorAll<ModuleTab>(
        ':scope > .tabscontainer > ul > li[data-target]'
      )
    );
    this._sections = Array.from(
      elm.querySelectorAll<ModuleSection>(
        ':scope > .sectionscontainer > [data-tab-id]'
      )
    );
    this._boundUrlParam = elm.dataset.boundUrlParam;

    this._setupTabTargets();
    this._setupTabEvents();
    this._selectInitialTab();
  }

  /**
   * DOM要素へ独自プロパティを足さずに、タブと表示先セクションの対応を型付きで保持する。
   */
  private _setupTabTargets(): void {
    this._tabs.forEach((tab) => {
      const targetId = tab.dataset.target;
      const section = this._sections.find(
        (candidate) => candidate.dataset.tabId === targetId
      );

      if (section) {
        this._sectionByTab.set(tab, section);
      }
    });
  }

  /**
   * タブ切替時の状態更新を、各タブのclickイベントに集約する。
   */
  private _setupTabEvents(): void {
    this._tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this._selectTab(tab);
      });
    });
  }

  /**
   * 初期表示では検索実行を再発火させず、タブの見た目だけを現在の状態へ揃える。
   */
  private _selectInitialTab(): void {
    const selectedTab = this._findInitialTab();
    if (selectedTab) {
      this._selectTab(selectedTab);
    }
  }

  /**
   * タブ未定義の壊れたDOMでも初期化処理が止まらないよう、候補がなければundefinedを返す。
   */
  private _findInitialTab(): ModuleTab | undefined {
    const defaultTab = this._tabs[0];
    const storedTab = this._getStoredTab(defaultTab);

    if (!storedTab) {
      return defaultTab;
    }

    return (
      this._tabs.find((tab) => tab.dataset.target === storedTab) ?? defaultTab
    );
  }

  /**
   * boundUrlParam が設定されている場合は URL パラメータのみを正として扱い、
   * localStorage にはフォールバックしない。
   * こうすることで初期タブ選択と initializeApp() の searchMode 判定が同じ基準になり、
   * 「localStorage='advanced' + URL パラメータなし」のときに store と UI が不整合にならない。
   * boundUrlParam がない場合は従来通り localStorage の前回値を使う。
   */
  private _getStoredTab(defaultTab: ModuleTab | undefined): string | null {
    if (this._boundUrlParam) {
      return new URL(window.location.href).searchParams.get(this._boundUrlParam);
    }

    const tabGroup = defaultTab?.dataset.tabGroup;
    return tabGroup ? window.localStorage.getItem(tabGroup) : null;
  }

  /**
   * 表示中クラスとlocalStorageを同時に更新し、タブ状態をDOMと保存値で揃える。
   */
  private _selectTab(selectedTab: ModuleTab): void {
    const selectedSection = this._sectionByTab.get(selectedTab);
    if (!selectedSection) return;

    this._tabs.forEach((tab) => {
      tab.classList.remove('-current');
    });
    this._sections.forEach((section) => {
      section.classList.remove('-current');
    });

    selectedTab.classList.add('-current');
    selectedSection.classList.add('-current');
    this._storeSelectedTab(selectedTab);
  }

  /**
   * タブグループがある場合だけ保存し、別グループのタブ状態と混ざらないようにする。
   */
  private _storeSelectedTab(tab: ModuleTab): void {
    const tabGroup = tab.dataset.tabGroup;
    const target = tab.dataset.target;

    if (!tabGroup || !target) return;

    window.localStorage.setItem(tabGroup, target);
  }
}
