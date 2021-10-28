const REF_ALT_SHOW_LENGTH = 4;

export default class RefAltView {

  constructor(container) {
    container.innerHTML = `
    <span class="ref-alt not-what-it-looks-like">
      <span class="looking">
        <span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""></span>
      </span>
      <span class="taking"></span>
    </span>`;
    const root = container.querySelector(':scope > .ref-alt');
    const rolookingot = root.querySelector(':scope > .looking');
    this._ref = rolookingot.querySelector(':scope > .ref');
    this._alt = rolookingot.querySelector(':scope > .alt');
    this._taking = root.querySelector(':scope > .taking');
  }

  setValues(data) {
    // looking
    const ref = data.reference ? data.reference : '';
    const alt = data.alternative ? data.alternative : '';
    this._ref.textContent = ref.substr(0, REF_ALT_SHOW_LENGTH) + (ref.length > REF_ALT_SHOW_LENGTH ? '...' : '');
    this._ref.dataset.sum = ref.length;
    this._alt.textContent = alt.substr(0, REF_ALT_SHOW_LENGTH) + (alt.length > REF_ALT_SHOW_LENGTH ? '...' : '');
    this._alt.dataset.sum = alt.length;
    // taking
    this._taking.textContent = `${data.reference},${data.alternative}`;
  }

}