// types.ts など
import type { ConditionTypeValue } from '../definition';

export interface EnumerationItem {
  value: string;
  label: string;
}

export interface SignificanceCondition {
  label: string;
  type: 'enumeration';
  values: {
    mgend: ReadonlyArray<EnumerationItem>;
    clinvar: ReadonlyArray<EnumerationItem>;
  };
}

export interface VariantTypeCondition {
  label: string;
  type: 'enumeration';
  values: ReadonlyArray<EnumerationItem>;
}

export type ConditionDefinition =
  // | PeculiarCondition
  // | TreeCondition
  // | TextCondition
  SignificanceCondition | VariantTypeCondition;

// ★ ここをキー別に厳密化
export type AdvancedConditionMap = Partial<
  Record<
    Exclude<ConditionTypeValue, 'significance' | 'type'>,
    ConditionDefinition
  >
> & {
  significance?: SignificanceCondition;
  type?: VariantTypeCondition;
};

export interface GRChConditions {
  // JSON 全体の conditions は「キー別に厳密」
  conditions: AdvancedConditionMap;
}
