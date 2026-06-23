import { ADVANCED_CONDITION_TYPE } from '../../advancedCondition';
import {
  PREDICTIONS,
  type PredictionKey,
} from '../Condition/ConditionPathogenicityPredictionSearch/PredictionDatasets';
import type { RestoredPredictionValue } from '../../types';
import type {
  Inequality,
  LogicalOperator,
  SignificanceSource,
} from '../../types';
import {
  isQueryObject,
  makeValue,
  getRangeStart,
  getRangeEnd,
  findConditionLabel,
  type QueryObject,
  type RestoredItem,
} from './AdvancedSearchRestorerUtils';

type LogicalQuery = Readonly<{
  operator: LogicalOperator;
  children: unknown[];
}>;

/**
 * Clinical significanceはsourceごとに表示ラベル（MGeND/ClinVar）とqueryを分ける必要がある。
 * terms × sources の全組み合わせをvalues配列に展開することで1条件行として扱う。
 */
export function restoreSignificanceItem(
  significance: QueryObject
): RestoredItem | null {
  const terms = significance.terms;
  if (!Array.isArray(terms)) return null;

  const sources = _getSignificanceSources(significance.source);
  if (sources.length === 0) return null;

  const relation = significance.relation === 'ne' ? 'ne' : 'eq';
  return {
    conditionType: ADVANCED_CONDITION_TYPE.significance,
    relation,
    values: sources.flatMap((source) =>
      terms.map((term) => {
        const value = String(term);
        return {
          ...makeValue(
            value,
            findConditionLabel(ADVANCED_CONDITION_TYPE.significance, value)
          ),
          source,
        };
      })
    ),
  };
}

/** 'mgend' / 'clinvar' 以外の値はAPIが対応していないため弾く。 */
function _getSignificanceSources(source: unknown): SignificanceSource[] {
  if (!Array.isArray(source)) return [];

  return source.filter(
    (item): item is SignificanceSource => item === 'mgend' || item === 'clinvar'
  );
}

/**
 * Clinical significanceは2 source選択時にsourceごとのleafへ分かれる。
 * UI復元時は、同じrelationのleafを1条件行へ戻す。
 */
export function toMergedSignificanceItem(
  logical: LogicalQuery
): RestoredItem | null {
  const items = logical.children
    .map((child) =>
      isQueryObject(child) && isQueryObject(child.significance)
        ? restoreSignificanceItem(child.significance)
        : null
    )
    .filter((item): item is RestoredItem => item !== null);

  if (items.length !== logical.children.length || items.length <= 1) {
    return null;
  }

  const relation = items[0].relation;
  const expectedOperator = relation === 'ne' ? 'and' : 'or';
  const canMerge = items.every(
    (item) =>
      item.conditionType === ADVANCED_CONDITION_TYPE.significance &&
      item.relation === relation
  );
  if (!relation || logical.operator !== expectedOperator || !canMerge) {
    return null;
  }

  return {
    conditionType: ADVANCED_CONDITION_TYPE.significance,
    relation,
    values: items.flatMap((item) => item.values),
  };
}

/**
 * Pathogenicity predictionはquery key（alphamissense/sift/polyphen）から
 * 共通の条件行へ戻す。scoreがオブジェクトならrangeモード、配列ならcategoryモード。
 */
export function restorePredictionItem(query: QueryObject): RestoredItem | null {
  const predictionKey = _getPredictionKey(query);
  if (!predictionKey) return null;

  const leaf = query[predictionKey];
  if (!isQueryObject(leaf)) return null;

  const prediction = _toRestoredPredictionValue(predictionKey, leaf.score);
  if (!prediction) return null;

  return {
    conditionType: ADVANCED_CONDITION_TYPE.pathogenicity_prediction,
    values: [
      {
        value: predictionKey,
        label: PREDICTIONS[predictionKey].label,
        prediction,
      },
    ],
  };
}

/**
 * Pathogenicity predictionでUnassigned/Unknownとrangeを同時に選ぶと、
 * queryは { or: [category leaf, range leaf] } になる。これを1条件行へ戻す。
 */
export function toMergedPredictionItem(
  logical: LogicalQuery
): RestoredItem | null {
  if (logical.operator !== 'or') return null;

  const leaves = logical.children
    .map(_toPredictionLeaf)
    .filter((leaf): leaf is PredictionLeaf => leaf !== null);
  if (leaves.length !== logical.children.length || leaves.length <= 1) {
    return null;
  }

  const dataset = leaves[0].dataset;
  if (!leaves.every((leaf) => leaf.dataset === dataset)) return null;

  const range = leaves.find((leaf) => isQueryObject(leaf.score));
  const categories = leaves.filter((leaf) => Array.isArray(leaf.score));
  if (!range || categories.length === 0) return null;

  const rangePrediction = _toRestoredPredictionValue(dataset, range.score);
  if (!rangePrediction) return null;

  const selectedCategories = categories.flatMap((leaf) =>
    Array.isArray(leaf.score) ? leaf.score : []
  );

  return {
    conditionType: ADVANCED_CONDITION_TYPE.pathogenicity_prediction,
    values: [
      {
        value: dataset,
        label: PREDICTIONS[dataset].label,
        prediction: {
          ...rangePrediction,
          includeUnassigned: selectedCategories.includes('unassigned'),
          includeUnknown: selectedCategories.includes('unknown'),
        },
      },
    ],
  };
}

type PredictionLeaf = Readonly<{
  dataset: PredictionKey;
  score: unknown;
}>;

function _toPredictionLeaf(child: unknown): PredictionLeaf | null {
  if (!isQueryObject(child)) return null;

  const dataset = _getPredictionKey(child);
  if (!dataset) return null;

  const leaf = child[dataset];
  if (!isQueryObject(leaf)) return null;

  return { dataset, score: leaf.score };
}

/** queryのキーがPREDICTIONSに含まれるものだけを予測スコア条件として識別する。 */
function _getPredictionKey(query: QueryObject): PredictionKey | null {
  return (
    (Object.keys(PREDICTIONS) as PredictionKey[]).find((key) =>
      isQueryObject(query[key])
    ) ?? null
  );
}

function _toRestoredPredictionValue(
  dataset: PredictionKey,
  score: unknown
): RestoredPredictionValue | null {
  // scoreがオブジェクト: rangeモード（gte/gt + lte/lt の数値指定）
  if (isQueryObject(score)) {
    return {
      dataset,
      values: [getRangeStart(score) ?? 0, getRangeEnd(score) ?? 1],
      inequalitySigns: [_getLeftInequality(score), _getRightInequality(score)],
      includeUnassigned: false,
      includeUnknown: false,
    };
  }

  // scoreが配列: unassigned/unknown のカテゴリ指定
  if (Array.isArray(score)) {
    return {
      dataset,
      values: [0, 0],
      inequalitySigns: ['gt', 'lt'],
      includeUnassigned: score.includes('unassigned'),
      includeUnknown: score.includes('unknown'),
    };
  }

  return null;
}

/** score.gt が存在すれば exclusive（>）、なければ inclusive（>=）として扱う。 */
function _getLeftInequality(
  score: QueryObject
): Extract<Inequality, 'gte' | 'gt'> {
  return score.gt === undefined ? 'gte' : 'gt';
}

/** score.lt が存在すれば exclusive（<）、なければ inclusive（<=）として扱う。 */
function _getRightInequality(
  score: QueryObject
): Extract<Inequality, 'lte' | 'lt'> {
  return score.lt === undefined ? 'lte' : 'lt';
}
