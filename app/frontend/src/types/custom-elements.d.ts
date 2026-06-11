import type { ConditionItemValueView } from '../components/Condition/ConditionItemValueView';
import type { RangeSliderData } from '../components/Condition/ConditionValueEditor/ConditionValueEditorFrequencyCount';
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
