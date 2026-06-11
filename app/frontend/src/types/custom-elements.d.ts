import type { ConditionItemValueView } from '../components/Condition/ConditionItemValueView';
import type { RangeSliderData } from '../components/RangeSlider/RangeSliderTypes';
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
    value1: string | number | null;
    value2: string | number | null;
  }

  interface HTMLElementEventMap {
    'range-changed': CustomEvent<RangeSliderData>;
  }
}
export {};
