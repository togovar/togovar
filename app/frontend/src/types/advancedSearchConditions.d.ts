// types.ts など
import type { ConditionTypeValue } from '../definition';
import type { SignificanceSource } from './condition';

interface EnumerationItem {
  value: string;
  label: string;
}
/* ------------ peculiar ------------- */
/** Tree node used by "peculiar" conditions that have hierarchical values. */
type TreeNode =
  | { label: string; children: ReadonlyArray<TreeNode> } // group
  | { label: string; value: string; children?: ReadonlyArray<TreeNode> }; // leaf or leaf+subtree

/** Keys whose "peculiar" condition HAS hierarchical values. */
export type PeculiarWithTreeKeys = 'dataset' | 'genotype';

/** Keys whose "peculiar" condition HAS NO values (UI/editor derives from key). */
export type PeculiarEmptyKeys = 'location' | 'pathogenicity_prediction';

/** dataset: peculiar with tree values. */
export interface DatasetCondition {
  label: string;
  type: 'peculiar';
  values: ReadonlyArray<TreeNode>;
}

/** genotype: peculiar with tree values. */
export interface GenotypeCondition {
  label: string;
  type: 'peculiar';
  values: ReadonlyArray<TreeNode>;
}

/** location: peculiar without values. */
export interface LocationCondition {
  label: string;
  type: 'peculiar';
}

/** pathogenicity_prediction: peculiar without values. */
export interface PathogenicityPredictionCondition {
  label: string;
  type: 'peculiar';
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

interface CheckboxesCondition {
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
  label: string;
  type: 'tree';
  values: ConsequenceNodeBase[];
}

/* --------------- text --------------- */
interface TextCondition {
  label: string;
  type: 'text';
}

export type ConditionDefinition =
  | DatasetCondition
  | GenotypeCondition
  | LocationCondition
  | PathogenicityPredictionCondition
  | TreeCondition
  | TextCondition
  | SignificanceCondition
  | CheckboxesCondition;

/**
 * Strongly-typed map of all condition definitions by key.
 * - Keys not declared here fall back to a generic shape (if必要なら) or simply remain absent (Partial).
 */
type AdvancedConditionMap = Partial<
  Record<
    // 汎用キーは unknown（= まだ厳密にしていない）
    Exclude<
      ConditionTypeValue,
      | 'dataset'
      | 'genotype'
      | 'location'
      | 'pathogenicity_prediction'
      | 'significance'
      | 'type'
    >,
    unknown
  >
> & {
  dataset?: DatasetCondition;
  genotype?: GenotypeCondition;
  location?: LocationCondition; // values なし
  pathogenicity_prediction?: PathogenicityPredictionCondition; // values なし
  significance?: SignificanceCondition; // mgend/clinvar のレコード
  type?: CheckboxesCondition; // フラット配列
};

interface GRChConditions {
  conditions: AdvancedConditionMap;
}
