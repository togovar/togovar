import { ADVANCED_CONDITIONS, API_URL } from '../../global';
import {
  CONDITION_TYPE,
  type ConditionTypeValue,
  type FrequencyDataset,
} from '../../definition';
import { axios } from '../../utils/cachedAxios';
import type { ConditionGroupView } from '../Condition/ConditionGroupView';
import type {
  RestoredFrequencyMode,
  RestoredConditionValue,
} from '../Condition/ConditionItemView';
import type {
  LogicalOperator,
  Relation,
  SignificanceSource,
} from '../../types';

type QueryObject = Record<string, unknown>;

type RestoredItem = Readonly<{
  conditionType: ConditionTypeValue;
  relation?: Relation;
  values: RestoredConditionValue[];
}>;

/**
 * URLから復元したAdvanced Search条件を、BuilderのView構造へ戻す。
 *
 * 検索APIへ送るquery fragmentは表示用のView構造を持っていないため、
 * ここで「論理グループ」と「条件行」に分解し直してからUIへ流し込む。
 */
export async function restoreAdvancedSearchCondition(
  rootGroup: ConditionGroupView,
  query: unknown
): Promise<void> {
  if (!isQueryObject(query) || Object.keys(query).length === 0) return;

  // URL条件を正本として扱うため、既存の空行や前回の条件は一度消す。
  rootGroup.clearConditionViews();
  await appendQueryToGroup(rootGroup, query, true);
}

// query fragmentを再帰的にたどり、論理グループまたは条件行として追加する。
async function appendQueryToGroup(
  parentGroup: ConditionGroupView,
  query: unknown,
  useCurrentGroup: boolean = false
): Promise<void> {
  if (!isQueryObject(query)) return;

  const logical = getLogicalQuery(query);
  if (logical) {
    const mergedItem = toMergedFrequencyItem(logical);
    if (mergedItem) {
      await appendRestoredItem(parentGroup, mergedItem);
      return;
    }

    // ルートqueryが {and: [...]} / {or: [...]} の場合は、既存のroot groupをそのまま使う。
    const targetGroup = useCurrentGroup
      ? parentGroup
      : parentGroup.addEmptyConditionGroup(logical.operator);
    targetGroup.logicalOperator = logical.operator;

    const resumeAutoUngroup = useCurrentGroup
      ? null
      : targetGroup.suspendAutoUngroup();
    try {
      for (const child of logical.children) {
        await appendQueryToGroup(targetGroup, child);
      }
    } finally {
      resumeAutoUngroup?.();
    }
    return;
  }

  const item = await toRestoredItem(query);
  if (!item) return;

  await appendRestoredItem(parentGroup, item);
}

async function appendRestoredItem(
  parentGroup: ConditionGroupView,
  item: RestoredItem
): Promise<void> {
  // ConditionItemViewの通常生成後に値だけを注入し、編集モードを閉じた状態に戻す。
  const itemView = parentGroup.addNewConditionItem(item.conditionType);
  await itemView.hydrateFromRestoredQuery({
    relation: item.relation,
    values: item.values,
  });
}

// { and: [...] } / { or: [...] } だけを論理グループとして扱う。
function getLogicalQuery(
  query: QueryObject
): { operator: LogicalOperator; children: unknown[] } | null {
  const operator = query.and ? 'and' : query.or ? 'or' : null;
  if (!operator) return null;

  const children = query[operator];
  if (!Array.isArray(children)) return null;

  return { operator, children };
}

// query leafのキーから、復元すべき条件種別と表示値へ変換する。
async function toRestoredItem(
  query: QueryObject
): Promise<RestoredItem | null> {
  if (isQueryObject(query.frequency)) {
    return restoreFrequencyItem(query.frequency);
  }

  if (isQueryObject(query.location)) {
    return restoreLocationItem(query.location);
  }

  if (isQueryObject(query.gene)) {
    return restoreGeneItem(query.gene);
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
    return restoreSignificanceItem(query.significance);
  }

  return null;
}

// dataset/genotypeの複数選択はquery上では { or: [frequency, ...] } になるため、UI復元時は1条件行に畳み戻す。
function toMergedFrequencyItem(logical: {
  operator: LogicalOperator;
  children: unknown[];
}): RestoredItem | null {
  if (logical.operator !== 'or') return null;

  const items = logical.children
    .map((child) =>
      isQueryObject(child) && isQueryObject(child.frequency)
        ? restoreFrequencyItem(child.frequency)
        : null
    )
    .filter((item): item is RestoredItem => item !== null);

  if (items.length !== logical.children.length || items.length <= 1) {
    return null;
  }

  const conditionType = items[0].conditionType;
  const canMerge = items.every(
    (item) =>
      item.conditionType === conditionType &&
      item.values.length > 0 &&
      item.values.every((value) => value.frequency)
  );
  if (!canMerge) return null;

  return {
    conditionType,
    values: items.flatMap((item) => item.values),
  };
}

// Gene symbolはURL上では数値IDだけを持つため、表示用symbolをAPIから引き直す。
async function restoreGeneItem(
  gene: QueryObject
): Promise<RestoredItem | null> {
  const terms = gene.terms;
  if (!Array.isArray(terms)) return null;

  const relation = gene.relation === 'ne' ? 'ne' : 'eq';
  const values = await Promise.all(
    terms.map(async (term) => {
      const value = String(term);
      const label =
        getGeneLabelFromQuery(gene.labels, value) ??
        (await findGeneSymbolLabel(value)) ??
        value;
      return makeValue(value, label);
    })
  );

  return {
    conditionType: CONDITION_TYPE.gene_symbol,
    relation,
    values,
  };
}

function getGeneLabelFromQuery(labels: unknown, geneId: string): string | null {
  if (!isQueryObject(labels)) return null;
  return getString(labels[geneId]);
}

async function findGeneSymbolLabel(geneId: string): Promise<string | null> {
  const url = new URL(`${API_URL}/api/search/${CONDITION_TYPE.gene_symbol}`);
  url.searchParams.set('term', geneId);

  try {
    const { data } = await axios.get(url.toString());
    const suggestions = Array.isArray(data) ? data : [];
    const matched = suggestions.find(
      (suggestion) =>
        isQueryObject(suggestion) && String(suggestion.id) === geneId
    );
    if (!isQueryObject(matched)) return null;

    return getString(matched.symbol ?? matched.label ?? matched.name);
  } catch (_error) {
    return null;
  }
}

// dataset/genotype条件は、外側の値表示と内側のfrequency-count-value-viewの状態を両方復元する。
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

// genotypeは genotype.key、datasetは frequency/count のどちらを持つかでUIモードを決める。
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

// UI側が対応しているgenotypeモードだけを復元対象にする。
function toSupportedFrequencyMode(value: string): RestoredFrequencyMode | null {
  return value === 'aac' || value === 'arc' || value === 'hac' ? value : null;
}

// query内でrangeが入っている位置はdataset条件とgenotype条件で異なる。
function getFrequencyRange(
  frequency: QueryObject,
  genotype: unknown
): unknown {
  if (isQueryObject(genotype)) return genotype.count;
  return frequency.frequency ?? frequency.count;
}

// API用のlocation queryを、Location editorが扱う "chr:start-end" 形式へ戻す。
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

// Clinical significanceはsourceごとに表示ラベル(MGeND/ClinVar)とqueryを分ける必要がある。
function restoreSignificanceItem(
  significance: QueryObject
): RestoredItem | null {
  const terms = significance.terms;
  if (!Array.isArray(terms)) return null;

  const sources = getSignificanceSources(significance.source);
  if (sources.length === 0) return null;

  const relation = significance.relation === 'ne' ? 'ne' : 'eq';
  return {
    conditionType: CONDITION_TYPE.significance,
    relation,
    values: sources.flatMap((source) =>
      terms.map((term) => {
        const value = String(term);
        return {
          ...makeValue(
            value,
            findConditionLabel(CONDITION_TYPE.significance, value)
          ),
          source,
        };
      })
    ),
  };
}

function getSignificanceSources(source: unknown): SignificanceSource[] {
  if (!Array.isArray(source)) return [];

  return source.filter(
    (item): item is SignificanceSource =>
      item === 'mgend' || item === 'clinvar'
  );
}

// relationとtermsを持つ標準的な条件を、共通の表示値配列へ戻す。
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

// ラベルが見つからない条件でもUI表示できるよう、valueをlabelの代替にする。
function makeValue(value: string, label: string = value): RestoredConditionValue {
  return { value, label };
}

// gt/gteの違いは現状の表示UIでは区別しないため、開始値としてまとめて扱う。
function getRangeStart(range: QueryObject): number | null {
  return getNumber(range.gte ?? range.gt);
}

// lt/lteの違いは現状の表示UIでは区別しないため、終了値としてまとめて扱う。
function getRangeEnd(range: QueryObject): number | null {
  return getNumber(range.lte ?? range.lt);
}

// URL由来の値は信用せず、有限なnumberだけをrange値として採用する。
function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// 検索条件マスタから表示ラベルを探し、URL復元後も通常操作時に近い見た目へ戻す。
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

// datasetのような階層値と、significanceのようなsource別値の両方を再帰的に探す。
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

// 1つのマスタ項目を調べ、子要素があればさらに下へ潜る。
function findLabelInValueItem(item: unknown, targetValue: string): string | null {
  if (!isQueryObject(item)) return null;

  if (item.value === targetValue && typeof item.label === 'string') {
    return item.label;
  }

  return findLabelInValues(item.children, targetValue);
}

// URL由来のunknownを安全に扱うため、配列ではないプレーンなobjectだけに絞る。
function isQueryObject(value: unknown): value is QueryObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
