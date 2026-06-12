import type { ConditionItemValueView } from '../components/Condition/ConditionItemValueView';
import type { ConditionDiseaseSearch } from '../components/Condition/ConditionDiseaseSearch/ConditionDiseaseSearch';
import type { ConditionDiseaseOntologyView } from '../components/Condition/ConditionDiseaseSearch/ConditionDiseaseSearchOntologyView';
import type { RangeSliderData } from '../components/RangeSlider/RangeSliderTypes';
import type { Frequency } from './api';

declare global {
  interface HTMLElementTagNameMap {
    'condition-item-value-view': ConditionItemValueView;
    'condition-disease-search': ConditionDiseaseSearch;
    'condition-disease-ontology-view': ConditionDiseaseOntologyView;
    'frequency-block-view': FrequencyBlockElement;
    'range-slider': RangeSliderElement;
    'search-field-with-suggestions': SearchFieldWithSuggestionsElement;
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
    lazy: boolean;
  }
  interface SearchFieldWithSuggestionsElement extends HTMLElement {
    showSuggestions: boolean;
  }

  interface HTMLElementEventMap {
    'range-changed': CustomEvent<RangeSliderData>;
  }
}
export {};
