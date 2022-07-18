import TopPageLayoutManager from './TopPageLayoutManager.js';

export default class ModuleTabsView {
  constructor(elm) {
    const tabs = Array.from(
      elm.querySelectorAll(':scope > .tabscontainer > ul > li')
    );
    const sections = Array.from(
      elm.querySelectorAll(':scope > .sectionscontainer > *')
    );

    // attach event
    tabs.forEach((tab) => {
      tab.target = sections.find(
        (section) => section.dataset.tabId === tab.dataset.target
      );
      tab.addEventListener('click', (e) => {
        // reset
        tabs.forEach((tab) => tab.classList.remove('-current'));
        sections.forEach((tab) => tab.classList.remove('-current'));
        // select tab
        e.target.classList.add('-current');
        e.target.target.classList.add('-current');
        // set status in localStorage
        window.localStorage.setItem(
          e.target.dataset.tabGroup,
          e.target.dataset.target
        );
        // update layout
        TopPageLayoutManager.update();
      });
    });

    // default
    // if bound to URL params, URL params are preferred
    let storedTab = window.localStorage.getItem(tabs[0].dataset.tabGroup);
    const boundUrlParam = elm.dataset.boundUrlParam;
    if (elm.dataset.boundUrlParam) {
      const param = new URL(window.location).searchParams.get(boundUrlParam);
      storedTab = param ?? storedTab;
    }
    let selectedTab = tabs[0];
    if (storedTab) {
      const foundTab = tabs.find((tab) => tab.dataset.target === storedTab);
      selectedTab = foundTab ?? selectedTab;
    }
    selectedTab.dispatchEvent(new Event('click'));
  }
}
