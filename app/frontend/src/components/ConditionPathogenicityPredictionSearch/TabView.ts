import { LitElement, html } from 'lit';
import { customElement, property, queryAll } from 'lit/decorators.js';
import type { Threshold } from './PredictionDatasets';
import type { PredictionChangeDetail } from './PredictionRangeSliderView';
import type { PredictionRangeSlider } from './PredictionRangeSliderView';
import Styles from '../../../stylesheets/object/component/tab-view.scss';

/** Class to create a TabView */
@customElement('tab-view')
export class TabView extends LitElement {
  static styles = [Styles];

  @property({ type: Object })
  datasets!: Record<
    string,
    {
      label: string;
      threshold: Threshold;
      unassignedLists: ReadonlyArray<'unassigned' | 'unknown'>;
    }
  >;

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
    const entries = Object.entries(this.datasets);

    return html`
      <ul aria-labelledby="tabs-title" role="tablist">
        ${entries.map(
          ([key, details], i) => html`
            <li>
              <a
                id="tab-${key}"
                class="tab"
                href="#${key}"
                aria-selected=${i === 0 ? 'true' : 'false'}
                tabindex=${i === 0 ? '0' : '-1'}
                @click=${(e: Event) => this._handleSwitchTab(e)}
                >${details.label}</a
              >
            </li>
          `
        )}
      </ul>

      <div class="tab-panel">
        ${entries.map(
          ([key, details], i) => html`
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
          `
        )}
      </div>
    `;
  }
}
