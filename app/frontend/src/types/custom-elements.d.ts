import type { ConditionItemValueView } from '../components/ConditionItemValueView';
import type { RangeSliderData } from '../classes/Condition/ConditionValueEditor/ConditionValueEditorFrequencyCount';
import type { Frequency } from './api';

declare global {
  interface HTMLElementTagNameMap {
    'condition-item-value-view': ConditionItemValueView;
    'logarithmized-block-graph-frequency-view': LogarithmizedBlockGraphFrequencyElement;
    'range-slider': RangeSliderElement;
  }
  interface LogarithmizedBlockGraphFrequencyElement extends HTMLElement {
    frequency?: Frequency;
  }
  interface RangeSliderElement extends HTMLElement {
    searchType: string;
    sliderStep: number;
    inputStep: number;
  }

  interface HTMLElementEventMap {
    'range-changed': CustomEvent<RangeSliderData>;
  }
}
export {};
