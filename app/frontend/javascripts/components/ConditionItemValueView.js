import { LitElement, css, html } from "lit";
import FrequencyCountValueView from "./FrequencyCountValueView"; // for embedding
// import Style from '../../stylesheets/foundation/_variables.scss';

export class ConditionItemValueView extends LitElement {
  // static properties = {
  //   name: {},
  // };
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      --height-container: var(
        --height-advanced-search-condition-values-container
      );
      --height: var(--height-advanced-search-condition-value);
      display: inline-block;
    }
    :host([data-condition-type="dataset"]) {
      display: block;
      position: relative;
    }
    :host > .inner {
      height: var(--height);
      line-height: 1;
      padding: 0 10px;
      background-color: white;
      border: solid 1px var(--color-key-dark1);
      border-radius: calc(var(--height) * 0.5);
      font-weight: bold;
      margin-right: 2px;
    }
    :host([data-condition-type="dataset"]) > .inner {
      min-width: 120px;
    }
    :host([data-condition-type="dataset"]) > .inner::before {
      font-family: fontello;
      content: var(--char-dataset);
      margin-right: 4px;
    }
    :host([data-value="jga_ngs"]) > .inner,
    :host([data-value="jga_snp"]) > .inner {
      border-color: var(--color-dataset-jga);
      background-color: var(--color-dataset-jga-light);
    }
    :host([data-value="jga_ngs"]) > .inner::before,
    :host([data-value="jga_snp"]) > .inner::before {
      color: var(--color-dataset-jga);
    }
    :host([data-value="tommo"]) > .inner {
      border-color: var(--color-dataset-tommo);
      background-color: var(--color-dataset-tommo-light);
    }
    :host([data-value="tommo"]) > .inner::before {
      color: var(--color-dataset-tommo);
    }
    :host([data-value="hgvd"]) > .inner,
    :host([data-value="mgend"]) > .inner {
      border-color: var(--color-dataset-hgvd);
      background-color: var(--color-dataset-hgvd-light);
    }
    :host([data-value="hgvd"]) > .inner::before,
    :host([data-value="mgend"]) > .inner::before {
      color: var(--color-dataset-hgvd);
    }
    :host([data-value="gem_j_wga"]) > .inner {
      border-color: var(--color-dataset-gemj);
      background-color: var(--color-dataset-gemj-light);
    }
    :host([data-value="gem_j_wga"]) > .inner::before {
      color: var(--color-dataset-gemj);
    }
    :host([data-value="bbj"]) > .inner {
      border-color: var(--color-dataset-bbj);
      background-color: var(--color-dataset-bbj-light);
    }
    :host([data-value="bbj"]) > .inner::before {
      color: var(--color-dataset-bbj);
    }
    :host([data-value="clinvar"]) > .inner,
    :host([data-value="exac"]) > .inner,
    :host([data-value="gnomad"]) > .inner {
      border-color: var(--color-dataset-foreign);
      background-color: var(--color-dataset-foreign-light);
    }
    :host([data-value="clinvar"]) > .inner::before,
    :host([data-value="exac"]) > .inner::before,
    :host([data-value="gnomad"]) > .inner::before {
      color: var(--color-dataset-foreign);
    }
    :host([data-condition-type="significance"]) > .inner::before {
      margin-right: 4px;
      margin-left: -2px;
      font-size: 10px;
      position: relative;
      top: -1px;
    }
    :host([data-condition-type="significance"][data-value="P"]) > .inner {
      border-color: var(--color-sign-dangerous);
      background-color: var(--color-sign-dangerous-light);
    }
    :host([data-condition-type="significance"][data-value="P"])
      > .inner::before {
      content: "P";
      color: var(--color-sign-dangerous);
    }
    :host([data-condition-type="significance"][data-value="LP"]) > .inner {
      border-color: var(--color-sign-warning);
      background-color: var(--color-sign-warning-light);
    }
    :host([data-condition-type="significance"][data-value="LP"])
      > .inner::before {
      content: "LP";
      color: var(--color-sign-warning);
    }
    :host([data-condition-type="significance"][data-value="US"]) > .inner {
      border-color: var(--color-sign-unknown);
      background-color: var(--color-sign-unknown-light);
    }
    :host([data-condition-type="significance"][data-value="US"])
      > .inner::before {
      content: "US";
      color: var(--color-sign-unknown);
    }
    :host([data-condition-type="significance"][data-value="LB"]) > .inner {
      border-color: var(--color-sign-normal);
      background-color: var(--color-sign-normal-light);
    }
    :host([data-condition-type="significance"][data-value="LB"])
      > .inner::before {
      content: "LB";
      color: var(--color-sign-normal);
    }
    :host([data-condition-type="significance"][data-value="B"]) > .inner {
      border-color: var(--color-sign-safe);
      background-color: var(--color-sign-safe-light);
    }
    :host([data-condition-type="significance"][data-value="B"])
      > .inner::before {
      content: "B";
      color: var(--color-sign-safe);
    }
    :host([data-condition-type="significance"][data-value="CI"]) > .inner {
      border-color: var(--color-sign-modifier);
      background-color: var(--color-sign-modifier-light);
    }
    :host([data-condition-type="significance"][data-value="CI"])
      > .inner::before {
      content: "CI";
      color: var(--color-sign-modifier);
    }
    :host([data-condition-type="significance"][data-value="DR"]) > .inner,
    :host([data-condition-type="significance"][data-value="A"]) > .inner,
    :host([data-condition-type="significance"][data-value="RF"]) > .inner,
    :host([data-condition-type="significance"][data-value="PR"]) > .inner,
    :host([data-condition-type="significance"][data-value="AF"]) > .inner,
    :host([data-condition-type="significance"][data-value="O"]) > .inner {
      border-color: var(--color-sign-other);
      background-color: var(--color-sign-other-light);
    }
    :host([data-condition-type="significance"][data-value="DR"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="A"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="RF"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="PR"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="AF"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="O"])
      > .inner::before {
      color: var(--color-sign-other);
    }
    :host([data-condition-type="significance"][data-value="DR"])
      > .inner::before {
      content: "DR";
    }
    :host([data-condition-type="significance"][data-value="A"])
      > .inner::before {
      content: "A";
    }
    :host([data-condition-type="significance"][data-value="RF"])
      > .inner::before {
      content: "RF";
    }
    :host([data-condition-type="significance"][data-value="PR"])
      > .inner::before {
      content: "PR";
    }
    :host([data-condition-type="significance"][data-value="AF"])
      > .inner::before {
      content: "AF";
    }
    :host([data-condition-type="significance"][data-value="O"])
      > .inner::before {
      content: "O";
    }
    :host([data-condition-type="significance"][data-value="NP"]) > .inner,
    :host([data-condition-type="significance"][data-value="AN"]) > .inner,
    :host([data-condition-type="significance"][data-value="NC"]) > .inner {
      border-color: var(--color-gray);
      background-color: white;
    }
    :host([data-condition-type="significance"][data-value="NP"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="AN"])
      > .inner::before,
    :host([data-condition-type="significance"][data-value="NC"])
      > .inner::before {
      color: var(--color-gray);
    }
    :host([data-condition-type="significance"][data-value="NP"])
      > .inner::before {
      content: "NP";
    }
    :host([data-condition-type="significance"][data-value="AN"])
      > .inner::before {
      content: "AN";
    }
    :host([data-condition-type="significance"][data-value="NC"])
      > .inner::before {
      content: "NC";
    }
  `;

  constructor() {
    super();
    // Declare reactive properties
    this.label;
    this.conditionType;
    this.value;
  }

  // Render the UI as a function of component state
  render() {
    this.dataset.conditionType = this.conditionType;
    this.dataset.value = this.value;

    let option = "";
    if (this.conditionType == "dataset") {
      option = html`<frequency-count-value-view
        data-dataset="${this.value}"
      ></frequency-count-value-view>`;
    }
    return html`<span
        class="inner"
        data-condition-type="${this.conditionType}"
        data-value="${this.value}"
        >${this.label}</span
      >
      ${option} `;
  }
}
customElements.define("condition-item-value-view", ConditionItemValueView);
