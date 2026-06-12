import type { RangeSliderState } from './RangeSliderTypes';

export const RANGE_CHANGED_EVENT = 'range-changed';
export const METER_VERTICAL_CLASS = '-vertical';
export const EVENT_DETAIL_KEYS = ['from', 'to', 'match', 'invert'] as const;
export const DEFAULT_RANGE_SLIDER_STATE: RangeSliderState = {
  from: 0,
  to: 1,
  invert: false,
  min: 0,
  max: 1,
  step: 0.01,
  'input-step': 0.05,
  'slider-step': 0.01,
  match: 'any',
  rulerNumberOfSteps: 10,
};
