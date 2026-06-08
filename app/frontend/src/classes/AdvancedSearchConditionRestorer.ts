import { ADVANCED_CONDITIONS } from '../global';
import {
  CONDITION_TYPE,
  type ConditionTypeValue,
  type FrequencyDataset,
} from '../definition';
import type { ConditionGroupView } from './Condition/ConditionGroupView';
import type {
  RestoredFrequencyMode,
  RestoredConditionValue,
} from './Condition/ConditionItemView';
import type { LogicalOperator, Relation } from '../types';

type QueryObject = Record<string, unknown>;

type RestoredItem = Readonly<{
  conditionType: ConditionTypeValue;
  relation?: Relation;
  values: RestoredConditionValue[];
}>;

/** URLから復元したAdvanced Search条件を、BuilderのView構造へ戻す。 */
export async function restoreAdvancedSearchCondition(
  rootGroup: ConditionGroupView,
  query: unknown
): Promise<void> {
  if (!isQueryObject(query) || Object.keys(query).length === 0) return;

  rootGroup.clearConditionViews();
  await appendQueryToGroup(rootGroup, query, true);
}

async function appendQueryToGroup(
  parentGroup: ConditionGroupView,
  query: unknown,
  useCurrentGroup: boolean = false
): Promise<void> {
  if (!isQueryObject(query)) return;

  const logical = getLogicalQuery(query);
  if (logical) {
    const targetGroup = useCurrentGroup
      ? parentGroup
      : parentGroup.addEmptyConditionGroup(logical.operator);
    targetGroup.logicalOperator = logical.operator;

    for (const child of logical.children) {
      await appendQueryToGroup(targetGroup, child);
    }
    return;
  }

  const item = toRestoredItem(query);
  if (!item) return;

  const itemView = parentGroup.addNewConditionItem(item.conditionType);
  await itemView.hydrateFromRestoredQuery({
    relation: item.relation,
    values: item.values,
  });
}

function getLogicalQuery(
  query: QueryObject
): { operator: LogicalOperator; children: unknown[] } | null {
  const operator = query.and ? 'and' : query.or ? 'or' : null;
  if (!operator) return null;

  const children = query[operator];
  if (!Array.isArray(children)) return null;

  return { operator, children };
}

function toRestoredItem(query: QueryObject): RestoredItem | null {
  if (isQueryObject(query.frequency)) {
    return restoreFrequencyItem(query.frequency);
  }

  if (isQueryObject(query.location)) {
    return restoreLocationItem(query.location);
  }

  if (isQueryObject(query.gene)) {
    return restoreTermItem(CONDITION_TYPE.gene_symbol, query.gene, true);
  }

  if (Array.isArray(query.id)) {
    return {
      conditionType: CONDITION_TYPE.variant_id,
      values: query.id.map((id) => makeValue(String(id))),
    };
  }

  for (const conditionType of [
    CONDITION_TYPE.type,
    CONDITION_TYPE.consequence,
    CONDITION_TYPE.disease,
  ] as const) {
    const leaf = query[conditionType];
    if (isQueryObject(leaf)) {
      return restoreTermItem(conditionType, leaf, false);
    }
  }

  if (isQueryObject(query.significance)) {
    return restoreTermItem(
      CONDITION_TYPE.significance,
      query.significance,
      false
    );
  }

  return null;
}

function restoreFrequencyItem(frequency: QueryObject): RestoredItem | null {
  const dataset = frequency.dataset;
  if (!isQueryObject(dataset) || typeof dataset.name !== 'string') return null;

  const datasetName = dataset.name as FrequencyDataset;
  const genotype = frequency.genotype;
  const isGenotype = isQueryObject(genotype);
  const conditionType = isGenotype
    ? CONDITION_TYPE.genotype
    : CONDITION_TYPE.dataset;

  const mode = getFrequencyMode(frequency, genotype);
  const range = getFrequencyRange(frequency, genotype);
  if (!mode || !isQueryObject(range)) return null;

  return {
    conditionType,
    values: [
      {
        value: datasetName,
        label: findConditionLabel(conditionType, datasetName),
        frequency: {
          conditionType,
          mode,
          from: getRangeStart(range),
          to: getRangeEnd(range),
          invert: false,
          filtered: frequency.filtered === true,
        },
      },
    ],
  };
}

function getFrequencyMode(
  frequency: QueryObject,
  genotype: unknown
): RestoredFrequencyMode | null {
  if (isQueryObject(genotype) && typeof genotype.key === 'string') {
    return toSupportedFrequencyMode(genotype.key);
  }
  if (isQueryObject(frequency.frequency)) return 'frequency';
  if (isQueryObject(frequency.count)) return 'count';
  return null;
}

function toSupportedFrequencyMode(value: string): RestoredFrequencyMode | null {
  return value === 'aac' || value === 'arc' || value === 'hac' ? value : null;
}

function getFrequencyRange(
  frequency: QueryObject,
  genotype: unknown
): unknown {
  if (isQueryObject(genotype)) return genotype.count;
  return frequency.frequency ?? frequency.count;
}

function restoreLocationItem(location: QueryObject): RestoredItem | null {
  const chromosome = location.chromosome;
  if (typeof chromosome !== 'string') return null;

  const position = location.position;
  const value =
    typeof position === 'number'
      ? `${chromosome}:${position}`
      : isQueryObject(position)
      ? `${chromosome}:${getRangeStart(position) ?? ''}-${
          getRangeEnd(position) ?? ''
        }`
      : null;

  if (!value) return null;

  return {
    conditionType: CONDITION_TYPE.location,
    values: [makeValue(value)],
  };
}

function restoreTermItem(
  conditionType: ConditionTypeValue,
  leaf: QueryObject,
  numericTerms: boolean
): RestoredItem | null {
  const terms = leaf.terms;
  if (!Array.isArray(terms)) return null;

  const relation = leaf.relation === 'ne' ? 'ne' : 'eq';
  return {
    conditionType,
    relation,
    values: terms.map((term) => {
      const value = numericTerms ? String(Number(term)) : String(term);
      return makeValue(value, findConditionLabel(conditionType, value));
    }),
  };
}

function makeValue(value: string, label: string = value): RestoredConditionValue {
  return { value, label };
}

function getRangeStart(range: QueryObject): number | null {
  return getNumber(range.gte ?? range.gt);
}

function getRangeEnd(range: QueryObject): number | null {
  return getNumber(range.lte ?? range.lt);
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function findConditionLabel(
  conditionType: ConditionTypeValue,
  value: string
): string {
  const condition = ADVANCED_CONDITIONS[conditionType];
  if (!condition || typeof condition !== 'object' || !('values' in condition)) {
    return value;
  }

  return findLabelInValues(condition.values, value) ?? value;
}

function findLabelInValues(values: unknown, targetValue: string): string | null {
  if (Array.isArray(values)) {
    for (const item of values) {
      const label = findLabelInValueItem(item, targetValue);
      if (label) return label;
    }
    return null;
  }

  if (isQueryObject(values)) {
    for (const value of Object.values(values)) {
      const label = findLabelInValues(value, targetValue);
      if (label) return label;
    }
  }

  return null;
}

function findLabelInValueItem(item: unknown, targetValue: string): string | null {
  if (!isQueryObject(item)) return null;

  if (item.value === targetValue && typeof item.label === 'string') {
    return item.label;
  }

  return findLabelInValues(item.children, targetValue);
}

function isQueryObject(value: unknown): value is QueryObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
