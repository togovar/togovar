import { LitElement, html } from 'lit';
import { customElement, property, queryAll } from 'lit/decorators.js';
import './PredictionRangeSliderView.js';
import Styles from '../../../stylesheets/object/component/tab-view.scss';

/** Class to create a TabView */
@customElement('tab-view')
class TabView extends LitElement {
  static styles = [Styles];

  @property({ type: Object }) datasets;
  @queryAll('ul[role="tablist"] > li > a.tab') _tabButtons;
  @queryAll('.tab-panel > prediction-range-slider') _predictionRangeSlider;

  _handleSwitchTab(e) {
    e.preventDefault();
    const activePanelId = e.target.getAttribute('href').replace('#', '');
    const activePanel = Array.from(this._predictionRangeSlider).find(
      (panel) => panel.id === activePanelId
    );

    this._tabButtons.forEach((button) => {
      button.setAttribute('aria-selected', false);
      button.setAttribute('tabindex', '-1');
    });

    this._predictionRangeSlider.forEach((panel) => {
      panel.setAttribute('hidden', true);
    });

    activePanel.removeAttribute('hidden', false);
    e.target.setAttribute('aria-selected', true);
    e.target.setAttribute('tabindex', '0');

    this._switchTabEvent(activePanel);
  }

  _switchTabEvent(activePanel) {
    this.dispatchEvent(
      new CustomEvent('switch-tab', {
        detail: {
          dataset: activePanel.dataset.dataset,
          values: [
            parseFloat(activePanel.minValue),
            parseFloat(activePanel.maxValue),
          ],
          inequalitySigns: [
            activePanel.minInequalitySign,
            activePanel.maxInequalitySign,
          ],
          unassignedChecks: activePanel.unassignedChecks,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const datasetEntries = Object.entries(this.datasets);

    return html`
      <ul aria-labelledby="tabs-title" role="tablist">
        ${datasetEntries.map(
          ([predictionScoreName, details], index) => html`
            <li>
              <a
                id="tab-${predictionScoreName}"
                class="tab"
                href="#${predictionScoreName}"
                aria-selected=${index === 0 ? 'true' : 'false'}
                tabindex=${index === 0 ? '0' : '-1'}
                @click=${this._handleSwitchTab}
                >${details.label}
              </a>
            </li>
          `
        )}
      </ul>

      <div class="tab-panel">
        ${datasetEntries.map(
          ([predictionScoreName, details], index) => html`
            <prediction-range-slider
              id="${predictionScoreName}"
              aria-labelledby="tab-${predictionScoreName}"
              .predictionScoreName=${predictionScoreName}
              .minValue=${0}
              .maxValue=${1}
              .minInequalitySign=${'gte'}
              .maxInequalitySign=${'lte'}
              .unassignedChecks=${[]}
              .activeDataset=${details.threshold}
              .unassignedLists=${details.unassignedLists}
              ?hidden=${index !== 0}
            >
            </prediction-range-slider>
          `
        )}
      </div>
    `;
  }
}

export default TabView;
