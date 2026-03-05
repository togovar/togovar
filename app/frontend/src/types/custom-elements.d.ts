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
  }

  interface HTMLElementEventMap {
    'range-changed': CustomEvent<RangeSliderData>;
  }
}
export {};
