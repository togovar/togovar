import {LitElement, css, html} from 'lit';
console.log(css)
console.log(customElements)

export class ConditionItemValueView extends LitElement {
  // static properties = {
  //   name: {},
  // };
  // Define scoped styles right with your component, in plain CSS
  // static styles = css`
  //   :host {
  //     color: blue;
  //   }
  // `;

  constructor() {
    super();
    console.log(this)
    // Declare reactive properties
    this.name = 'World';
  }

  // Render the UI as a function of component state
  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
customElements.define('condition-item-value-view', ConditionItemValueView);
