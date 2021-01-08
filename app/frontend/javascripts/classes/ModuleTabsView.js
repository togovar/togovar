

export default class ModuleTabsView {

  constructor(elm) {
    const tabs = elm.querySelectorAll(':scope > .tabscontainer > ul > li');
    const sections = elm.querySelectorAll(':scope > .sectionscontainer > *');

    // attach event
    tabs.forEach(tab => {
      tab.target = document.getElementById(tab.dataset.target);
      tab.addEventListener('click', e => {
        tabs.forEach(tab => tab.classList.remove('-current'));
        sections.forEach(tab => tab.classList.remove('-current'));
        e.target.classList.add('-current');
        e.target.target.classList.add('-current');
      })
    })
  }

}