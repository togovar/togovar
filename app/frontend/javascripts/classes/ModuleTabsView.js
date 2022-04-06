import TopPageLayoutManager from "./TopPageLayoutManager.js";

export default class ModuleTabsView {

  constructor(elm) {
    const tabs = elm.querySelectorAll(':scope > .tabscontainer > ul > li');
    const sections = elm.querySelectorAll(':scope > .sectionscontainer > *');

    // attach event
    tabs.forEach(tab => {
      tab.target = document.getElementById(tab.dataset.target);
      tab.addEventListener('click', e => {
        // reset
        tabs.forEach(tab => tab.classList.remove('-current'));
        sections.forEach(tab => tab.classList.remove('-current'));
        // select tab
        e.target.classList.add('-current');
        e.target.target.classList.add('-current');
        // set status in localStorage
        window.localStorage.setItem(e.target.dataset.tabGroup, e.target.dataset.target);
        // update layout
        TopPageLayoutManager.update();
      })
    })

    // default
    const defaultTab = window.localStorage.getItem(tabs[0].dataset.tabGroup);
    if (defaultTab) {
      Array.from(tabs).filter(tab => tab.dataset.target === defaultTab)[0].dispatchEvent(new Event('click'));
    } else {
      tabs[0].dispatchEvent(new Event('click'));
    }
  }

}