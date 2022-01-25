import {LitElement, css, html} from 'lit';
console.log(css)
console.log(customElements)
// import Style from '../../stylesheets/foundation/_variables.scss';

export class ConditionItemValueView extends LitElement {
  // static properties = {
  //   name: {},
  // };
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
  :host {
    --height-container: var(--height-advanced-search-condition);
    --height: 18px;
  }
  :host > .inner {
    height: 18px;
    line-height: 18px;
    padding: 0 calc(var(--height-container) - var(--height) * .5);
    background-color: white;
    border: solid 1px var(--color-key-dark1);
    border-radius: calc(var(--height) * .5);
    font-weight: bold;
    margin-right: 2px;
  }
  :host([data-condition-type="dataset"]) > .inner {
    min-width: 120px;
  }
  /*
  :host([data-condition-type="dataset"]) > .inner::before {
    font-family: fontello;
    content: $CHAR_DATASET;
    margin-right: 4px;
  }
  :host([data-condition-type="jga_ngs"]) > .inner,
  :host([data-condition-type="jga_snp"]) > .inner {
    border-color: $COLOR_DATASET_JGA;
    background-color: $COLOR_DATASET_JGA_LIGHT;
  }
  :host([data-condition-type="jga_ngs"]) > .inner::before,
  :host([data-condition-type="jga_snp"]) > .inner::before {
    color: $COLOR_DATASET_JGA;
  }
  :host([data-condition-type="tommo_4.7kjpn"]) > .inner {
    border-color: $COLOR_DATASET_3_5KJPN;
    background-color: $COLOR_DATASET_3_5KJPN_LIGHT;
  }
  :host([data-condition-type="tommo_4.7kjpn"]) > .inner::before {
    color: $COLOR_DATASET_3_5KJPN;
  }
  :host([data-condition-type="hgvd"]) > .inner,
  :host([data-condition-type="mgend"]) > .inner {
    border-color: $COLOR_DATASET_HGVD;
    background-color: $COLOR_DATASET_HGVD_LIGHT;
  }
  :host([data-condition-type="hgvd"]) > .inner::before,
  :host([data-condition-type="mgend"]) > .inner::before {
    color: $COLOR_DATASET_HGVD;
  }
  :host([data-condition-type="gem_j_wga"]) > .inner {
    border-color: $COLOR_DATASET_GEM_J;
    background-color: $COLOR_DATASET_GEM_J_LIGHT;
  }
  :host([data-condition-type="gem_j_wga"]) > .inner::before {
    color: $COLOR_DATASET_GEM_J;
  }
  :host([data-condition-type="bbj"]) > .inner {
    border-color: $COLOR_DATASET_BBJ;
    background-color: $COLOR_DATASET_BBJ_LIGHT;
  }
  :host([data-condition-type="bbj"]) > .inner::before {
    color: $COLOR_DATASET_BBJ;
  }
  :host([data-condition-type="clinvar"]) > .inner,
  :host([data-condition-type="exac"]) > .inner,
  :host([data-condition-type="gnomad"]) > .inner {
    border-color: $COLOR_DATASET_FOREIGN;
    background-color: $COLOR_DATASET_FOREIGN_LIGHT;
  }
  :host([data-condition-type="clinvar"]) > .inner::before,
  :host([data-condition-type="exac"]) > .inner::before,
  :host([data-condition-type="gnomad"]) > .inner::before {
    color: $COLOR_DATASET_FOREIGN;
  }
  :host([data-condition-type="significance"]) > .inner::before {
    margin-right: 4px;
    margin-left: -2px;
    font-size: 10px;
    position: relative;
    top: -1px;
  }
  :host([data-condition-type="significance"][data-value="P"]) > .inner {
    border-color: $COLOR_SIGN_DANGEROUS;
    background-color: $COLOR_SIGN_DANGEROUS_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="P"]) > .inner::before {
    content: "P";
    color: $COLOR_SIGN_DANGEROUS;
  }
  :host([data-condition-type="significance"][data-value="LP"]) > .inner {
    border-color: $COLOR_SIGN_WARNING;
    background-color: $COLOR_SIGN_WARNING_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="LP"]) > .inner::before {
    content: "LP";
    color: $COLOR_SIGN_WARNING;
  }
  :host([data-condition-type="significance"][data-value="US"]) > .inner {
    border-color: $COLOR_SIGN_UNKNOWN;
    background-color: $COLOR_SIGN_UNKNOWN_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="US"]) > .inner::before {
    content: "US";
    color: $COLOR_SIGN_UNKNOWN;
  }
  :host([data-condition-type="significance"][data-value="LB"]) > .inner {
    border-color: $COLOR_SIGN_NORMAL;
    background-color: $COLOR_SIGN_NORMAL_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="LB"]) > .inner::before {
    content: "LB";
    color: $COLOR_SIGN_NORMAL;
  }
  :host([data-condition-type="significance"][data-value="B"]) > .inner {
    border-color: $COLOR_SIGN_SAFE;
    background-color: $COLOR_SIGN_SAFE_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="B"]) > .inner::before {
    content: "B";
    color: $COLOR_SIGN_SAFE;
  }
  :host([data-condition-type="significance"][data-value="CI"]) > .inner {
    border-color: $COLOR_SIGN_MODIFIER;
    background-color: $COLOR_SIGN_MODIFIER_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="CI"]) > .inner::before {
    content: "CI";
    color: $COLOR_SIGN_MODIFIER;
  }
  :host([data-condition-type="significance"][data-value="DR"]) > .inner,
  :host([data-condition-type="significance"][data-value="A"]) > .inner,
  :host([data-condition-type="significance"][data-value="RF"]) > .inner,
  :host([data-condition-type="significance"][data-value="PR"]) > .inner,
  :host([data-condition-type="significance"][data-value="AF"]) > .inner,
  :host([data-condition-type="significance"][data-value="O"]) > .inner {
    border-color: $COLOR_SIGN_OTHER;
    background-color: $COLOR_SIGN_OTHER_LIGHT;
  }
  :host([data-condition-type="significance"][data-value="DR"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="A"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="RF"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="PR"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="AF"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="O"]) > .inner::before {
    color: $COLOR_SIGN_OTHER;
  }
  :host([data-condition-type="significance"][data-value="DR"]) > .inner::before {
    content: "DR";
  }
  :host([data-condition-type="significance"][data-value="A"]) > .inner::before {
    content: "A";
  }
  :host([data-condition-type="significance"][data-value="RF"]) > .inner::before {
    content: "RF";
  }
  :host([data-condition-type="significance"][data-value="PR"]) > .inner::before {
    content: "PR";
  }
  :host([data-condition-type="significance"][data-value="AF"]) > .inner::before {
    content: "AF";
  }
  :host([data-condition-type="significance"][data-value="O"]) > .inner::before {
    content: "O";
  }
  :host([data-condition-type="significance"][data-value="NP"]) > .inner,
  :host([data-condition-type="significance"][data-value="AF"]) > .inner,
  :host([data-condition-type="significance"][data-value="O"]) > .inner {
    border-color: $COLOR_GRAY;
    background-color: white;
  }
  :host([data-condition-type="significance"][data-value="NP"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="AN"]) > .inner::before,
  :host([data-condition-type="significance"][data-value="NC"]) > .inner::before {
    color: $COLOR_GRAY;
  }
  :host([data-condition-type="significance"][data-value="NP"]) > .inner::before {
    content: "NP";
  }
  :host([data-condition-type="significance"][data-value="AN"]) > .inner::before {
    content: "AN";
  }
  :host([data-condition-type="significance"][data-value="NC"]) > .inner::before {
    content: "NC";
  } */
  `;

  // static get styles() {
	// 	return [Style];
  // }

  constructor() {
    super();
    console.log(this)
    // Declare reactive properties
    this.label;
    this.conditionType;
    this.value;
  }

  // Render the UI as a function of component state
  render() {
    this.dataset.conditionType = this.conditionType;
    this.dataset.value = this.value;
    return html`<span
      class="inner"
      data-condition-type="${this.conditionType}"
      data-value="${this.value}"
    >${this.label}</span>`;
  }
}
customElements.define('condition-item-value-view', ConditionItemValueView);
