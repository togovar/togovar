import { CONDITION_TYPE } from '../../definition';
import {
  PREDICTIONS,
  type PredictionKey,
} from '../../components/ConditionPathogenicityPredictionSearch/PredictionDatasets';
import type { RestoredPredictionValue } from '../Condition/ConditionItemRestoreTypes';
import type { Inequality, SignificanceSource } from '../../types';
import {
  isQueryObject,
  makeValue,
  getRangeStart,
  getRangeEnd,
  findConditionLabel,
  type QueryObject,
  type RestoredItem,
} from './AdvancedSearchRestorerUtils';

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

/** 'mgend' / 'clinvar' 以外の値はAPIが対応していないため弾く。 */
function _getSignificanceSources(source: unknown): SignificanceSource[] {
  if (!Array.isArray(source)) return [];

  return source.filter(
    (item): item is SignificanceSource =>
      item === 'mgend' || item === 'clinvar'
  );
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
    conditionType: CONDITION_TYPE.pathogenicity_prediction,
    values: [
      {
        value: predictionKey,
        label: PREDICTIONS[predictionKey].label,
        prediction,
      },
    ],
  };
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
