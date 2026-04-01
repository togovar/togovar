import type { ConditionItemValueView } from '../components/ConditionItemValueView';
import type { RangeSliderData } from '../classes/Condition/ConditionValueEditor/ConditionValueEditorFrequencyCount';
import type { Frequency } from './api';

declare global {
  interface HTMLElementTagNameMap {
    'condition-item-value-view': ConditionItemValueView;
    'frequency-block-view': FrequencyBlockElement;
    'range-slider': RangeSliderElement;
  }
  interface FrequencyBlockElement extends HTMLElement {
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
