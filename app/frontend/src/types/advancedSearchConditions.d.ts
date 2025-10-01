// types.ts など
import type { ConditionTypeValue } from '../definition';
import type { SignificanceSource } from './condition';

interface EnumerationItem {
  value: string;
  label: string;
}
/* ------------ peculiar ------------- */
// Trees with arbitrary depth like dataset/genotype (id is not used)
// Group nodes do not have values, while leaves have values
type TreeNode =
  | { label: string; children: TreeNode[] } // Group
  | { value: string; label: string; children?: TreeNode[] }; // Leaf or Leaf + Sub-level

interface PeculiarCondition {
  type: 'peculiar';
  values?: readonly TreeNode[];
}

/* ------------ enumeration ----------- */
// significance: values are Record<string, EnumerationItem[]>
// type: values are EnumerationItem[] (array)

type MutableSignificanceValues = {
  [K in SignificanceSource]: EnumerationItem[];
};

type SignificanceValues = Readonly<
  Record<SignificanceSource, ReadonlyArray<EnumerationItem>>
>;

interface SignificanceCondition {
  label: string;
  type: 'enumeration';
  values: SignificanceValues;
}

interface VariantTypeCondition {
  label: string;
  type: 'enumeration';
  values: ReadonlyArray<EnumerationItem>;
}

/* --------------- tree --------------- */
// Trees like "numeric id reference type" such as consequence
// Each node must have an id, children are referenced by an array of ids, descriptions are optional
interface ConsequenceNodeBase {
  id: number;
  label: string;
  parent?: number;
  children?: number[];
  value?: string;
  description?: string;
}
interface TreeCondition {
  type: 'tree';
  values: ConsequenceNodeBase[];
}

/* --------------- text --------------- */
interface TextCondition {
  type: 'text';
}

export type ConditionDefinition =
  | PeculiarCondition
  | TreeCondition
  | TextCondition
  | SignificanceCondition
  | VariantTypeCondition;

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
