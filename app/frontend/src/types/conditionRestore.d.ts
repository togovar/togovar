import type { FrequencyCountValueView } from '../views/Condition/FrequencyCountValueView';
import type { SignificanceSource } from './condition';

// FrequencyCountValueView の setValues 第2引数を型として使うことで、
// UIコンポーネント側のシグネチャ変更が自動的にここへ伝播する。
export type RestoredFrequencyMode =
  Parameters<FrequencyCountValueView['setValues']>[1];

export type RestoredFrequencyValue = Readonly<{
  conditionType: 'dataset' | 'genotype';
  mode: RestoredFrequencyMode;
  from: number | null;
  to: number | null;
  invert: boolean;
  filtered: boolean;
}>;

// 条件種別ごとに異なる付加フィールド（source / frequency / prediction）を
// optional にすることで、Restorer → ItemView の受け渡し型を1つに統一する。
export type RestoredConditionValue = Readonly<{
  value: string;
  label: string;
  source?: SignificanceSource;
  frequency?: RestoredFrequencyValue;
  prediction?: RestoredPredictionValue;
}>;

export type RestoredPredictionValue = Readonly<{
  dataset: 'alphamissense' | 'sift' | 'polyphen';
  values: [number, number];
  inequalitySigns: ['gte' | 'gt', 'lte' | 'lt'];
  includeUnassigned: boolean;
  includeUnknown: boolean;
}>;
