// Common
type ConditionType = 'peculiar' | 'enumeration' | 'tree' | 'text';

interface ConditionBase {
  label: string;
  type: ConditionType;
}

/* ------------ peculiar ------------- */
// Trees with arbitrary depth like dataset/genotype (id is not used)
// Group nodes do not have values, while leaves have values
type TreeNode =
  | { label: string; children: TreeNode[] } // Group
  | { value: string; label: string; children?: TreeNode[] }; // Leaf or Leaf + Sub-level

interface PeculiarCondition extends ConditionBase {
  type: 'peculiar';
  values?: TreeNode[];
}

/* ------------ enumeration ----------- */
// significance: values are Record<string, EnumerationItem[]>
// type: values are EnumerationItem[] (array)
interface EnumerationItem {
  value: string;
  label: string;
}
type EnumerationValues = EnumerationItem[] | Record<string, EnumerationItem[]>;

interface EnumerationCondition extends ConditionBase {
  type: 'enumeration';
  values: EnumerationValues;
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
interface TreeCondition extends ConditionBase {
  type: 'tree';
  values: ConsequenceNodeBase[];
}

/* --------------- text --------------- */
interface TextCondition extends ConditionBase {
  type: 'text';
}

/* ----------- Root Type --------------- */
type Condition =
  | PeculiarCondition
  | EnumerationCondition
  | TreeCondition
  | TextCondition;

export interface GRChConditions {
  conditions: Record<string, Condition>;
}
