import { LitElement, html } from 'lit';
import { customElement, property, queryAll } from 'lit/decorators.js';
import type { PredictionChangeDetail } from './../../types';
import type { PredictionRangeSlider } from './PredictionRangeSliderView';
import type { PredictionKey, PredictionDatasets } from './PredictionDatasets';
import Styles from '../../../stylesheets/object/component/tab-view.scss';

/** Class to create a TabView */
@customElement('tab-view')
export class TabView extends LitElement {
  static styles = [Styles];

  @property({ type: Object })
  datasets!: PredictionDatasets;

  @queryAll('ul[role="tablist"] > li > a.tab')
  private _tabButtons!: NodeListOf<HTMLAnchorElement>;
  @queryAll('.tab-panel > prediction-range-slider')
  private _sliders!: NodeListOf<PredictionRangeSlider>;

  private _handleSwitchTab(e: Event) {
    e.preventDefault();
    const btn = e.currentTarget as HTMLAnchorElement;
    const activePanelId = btn.getAttribute('href')!.replace('#', '');
    const activePanel = Array.from(this._sliders).find(
      (p) => p.id === activePanelId
    );
    if (!activePanel) return;

    this._tabButtons.forEach((b) => {
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    this._sliders.forEach((p) => p.setAttribute('hidden', 'true'));

    activePanel.removeAttribute('hidden');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');

    this._emitSwitchTab(activePanel);
  }

  private _emitSwitchTab(activePanel: PredictionRangeSlider) {
    const detail: PredictionChangeDetail = {
      dataset: activePanel.predictionScoreName,
      values: [Number(activePanel.minValue), Number(activePanel.maxValue)],
      inequalitySigns: [
        activePanel.minInequalitySign,
        activePanel.maxInequalitySign,
      ],
      includeUnassigned: activePanel.includeUnassigned,
      includeUnknown: activePanel.includeUnknown,
    };
    this.dispatchEvent(
      new CustomEvent<PredictionChangeDetail>('switch-tab', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const keys = Object.keys(this.datasets) as PredictionKey[];
    return html`
      <ul role="tablist">
        ${keys.map(
          (key, i) => html`
            <li>
              <a
                id=${`tab-${key}`}
                class="tab"
                href=${`#${key}`}
                aria-selected=${i === 0}
                tabindex=${i === 0 ? '0' : '-1'}
                @click=${(e: Event) => this._handleSwitchTab(e)}
                >${this.datasets[key].label}
              </a>
            </li>
          `
        )}
      </ul>

      <div class="tab-panel">
        ${keys.map((key, i) => {
          const details = this.datasets[key];
          return html`
            <prediction-range-slider
              id=${key}
              aria-labelledby=${`tab-${key}`}
              .predictionScoreName=${key}
              .minValue=${0}
              .maxValue=${1}
              .minInequalitySign=${'gte'}
              .maxInequalitySign=${'lte'}
              .activeDataset=${details.threshold}
              .unassignedLists=${details.unassignedLists}
              .includeUnassigned=${false}
              .includeUnknown=${false}
              ?hidden=${i !== 0}
            ></prediction-range-slider>
          `;
        })}
      </div>
    `;
  }
}
