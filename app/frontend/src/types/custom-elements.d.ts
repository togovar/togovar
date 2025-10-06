import type { ConditionItemValueView } from '../components/ConditionItemValueView';
import type { FrequencyCondition } from '../classes/Condition/ConditionValueEditor/ConditionValueEditorFrequencyCount';

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
    'range-changed': CustomEvent<Partial<FrequencyCondition>>;
  }
}
export {};
