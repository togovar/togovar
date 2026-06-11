export type RangeSliderData = {
  from?: number;
  to?: number;
  match?: string;
  invert?: boolean | '0' | '1' | 'true' | 'false';
};

export type RangeSliderState = {
  from: number;
  to: number;
  invert: '0' | '1';
  min: number;
  max: number;
  step: number;
  'input-step': number;
  'slider-step': number;
  match: string;
  rulerNumberOfSteps: number;
};

export type RangeSliderAttribute =
  | 'min'
  | 'max'
  | 'input-step'
  | 'slider-step'
  | 'value1'
  | 'value2'
  | 'orientation'
  | 'invert'
  | 'match'
  | 'ruler-number-of-steps';

export type RangeStateKey = 'from' | 'to';
