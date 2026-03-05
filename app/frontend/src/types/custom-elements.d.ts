import type { ConditionItemValueView } from '../components/ConditionItemValueView';
import type { RangeSliderData } from '../classes/Condition/ConditionValueEditor/ConditionValueEditorFrequencyCount';

declare global {
  interface HTMLElementTagNameMap {
    'condition-item-value-view': ConditionItemValueView;
    'range-slider': RangeSliderElement;
  }
  interface RangeSliderElement extends HTMLElement {
    searchType: string;
    sliderStep: number;
    inputStep: number;
    value1: number;
    value2: number;
    min: string | number;
    max: string | number;
    invert: string | boolean;
    match: string;
  }

  interface HTMLElementEventMap {
    'range-changed': CustomEvent<RangeSliderData>;
  }
}
export {};
