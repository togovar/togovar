import { LitElement, html } from 'lit';
import { customElement, property, queryAll } from 'lit/decorators.js';
import type { PredictionChangeDetail, Inequality } from '../../../types';
import type { PredictionRangeSlider } from './PredictionRangeSliderView';
import type { PredictionKey, PredictionDatasets } from './PredictionDatasets';
import Styles from '../../../../stylesheets/web-components/tab-view.scss';

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

  /**
   * 指定したデータセットのタブをアクティブにし、スライダー値を設定して switch-tab を emit する。
   * 編集モード開始時に保存済みの条件をタブへ反映するために使う。
   */
  restoreTab(
    dataset: PredictionKey,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned: boolean,
    includeUnknown: boolean
  ): void {
    const btn = Array.from(this._tabButtons).find(
      (b) => b.getAttribute('href') === `#${dataset}`
    );
    const activePanel = Array.from(this._sliders).find(
      (p) => p.id === dataset
    );
    if (!btn || !activePanel) return;

    this._tabButtons.forEach((b) => {
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    this._sliders.forEach((p) => p.setAttribute('hidden', 'true'));

    activePanel.removeAttribute('hidden');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');

    // スライダー値を先に設定してから emit することで、switch-tab に正しい値が乗る
    activePanel.minValue = values[0];
    activePanel.maxValue = values[1];
    activePanel.minInequalitySign = inequalitySigns[0];
    activePanel.maxInequalitySign = inequalitySigns[1];
    activePanel.includeUnassigned = includeUnassigned;
    activePanel.includeUnknown = includeUnknown;

    this._emitSwitchTab(activePanel);
  }

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
              .scoreMin=${details.scoreMin}
              .scoreMax=${details.scoreMax}
              .scoreStep=${details.scoreStep}
              .numberOfScales=${details.numberOfScales}
              .scoreLabel=${details.scoreLabel}
              .showThreshold=${details.showThreshold}
              .minValue=${details.scoreMin}
              .maxValue=${details.scoreMax}
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
