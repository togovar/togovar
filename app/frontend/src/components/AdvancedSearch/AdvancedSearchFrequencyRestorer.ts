import { ADVANCED_CONDITION_TYPE, type FrequencyDataset } from '../../advancedCondition';
import type { RestoredFrequencyMode } from '../../types';
import type { LogicalOperator } from '../../types';
import {
  isQueryObject,
  findConditionLabel,
  getRangeStart,
  getRangeEnd,
  type QueryObject,
  type RestoredItem,
} from './AdvancedSearchRestorerUtils';

/**
 * dataset/genotypeの複数選択はquery上では { or: [frequency, ...] } になる。
 * UI復元時はこれを1条件行へ畳み戻すことで、ユーザーが操作したのと同じ形にする。
 * 全子要素がfrequency条件でない場合は、通常のor論理グループとして扱わせるためnullを返す。
 */
export function toMergedFrequencyItem(logical: {
  operator: LogicalOperator;
  children: unknown[];
}): RestoredItem | null {
  if (logical.operator !== 'or') return null;

  const invertedItem = _restoreInvertedDatasetFrequencyItem(logical.children);
  if (invertedItem) return invertedItem;

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

/**
 * dataset frequencyのinvertはquery上で [0..from] OR [to..1] になる。
 * 複数dataset選択と同じOR形なので、先に単一のinvert条件へ戻す。
 */
function _restoreInvertedDatasetFrequencyItem(
  children: unknown[]
): RestoredItem | null {
  if (children.length !== 2) return null;

  const first = _toDatasetFrequencyLeaf(children[0]);
  const second = _toDatasetFrequencyLeaf(children[1]);
  if (!first || !second) return null;
  if (first.name !== second.name || first.filtered !== second.filtered) {
    return null;
  }

  const left = _getInvertedLeftRange(first, second);
  if (!left) return null;

  const right = left === first ? second : first;
  if (getRangeEnd(right.range) !== 1) return null;

  const from = getRangeEnd(left.range);
  const to = getRangeStart(right.range);
  if (from === null || to === null) return null;

  return {
    conditionType: ADVANCED_CONDITION_TYPE.dataset,
    values: [
      {
        value: left.name,
        label: findConditionLabel(ADVANCED_CONDITION_TYPE.dataset, left.name),
        frequency: {
          conditionType: ADVANCED_CONDITION_TYPE.dataset,
          mode: 'frequency',
          from,
          to,
          invert: true,
          filtered: left.filtered,
        },
      },
    ],
  };
}

function _getInvertedLeftRange(
  first: DatasetFrequencyLeaf,
  second: DatasetFrequencyLeaf
): DatasetFrequencyLeaf | null {
  if (getRangeStart(first.range) === 0) return first;
  if (getRangeStart(second.range) === 0) return second;
  return null;
}

type DatasetFrequencyLeaf = {
  name: FrequencyDataset;
  range: QueryObject;
  filtered: boolean;
};

function _toDatasetFrequencyLeaf(child: unknown): DatasetFrequencyLeaf | null {
  if (!isQueryObject(child) || !isQueryObject(child.frequency)) return null;

  const frequency = child.frequency;
  const dataset = frequency.dataset;
  const range = frequency.frequency;
  if (
    !isQueryObject(dataset) ||
    typeof dataset.name !== 'string' ||
    !isQueryObject(range)
  ) {
    return null;
  }

  return {
    name: dataset.name as FrequencyDataset,
    range,
    filtered: frequency.filtered === true,
  };
}

/** dataset/genotype条件を、外側の値表示と内側のfrequency-count-value-viewの状態として復元する。 */
export function restoreFrequencyItem(
  frequency: QueryObject
): RestoredItem | null {
  const dataset = frequency.dataset;
  if (!isQueryObject(dataset) || typeof dataset.name !== 'string') return null;

  const datasetName = dataset.name as FrequencyDataset;
  const genotype = frequency.genotype;
  const isGenotype = isQueryObject(genotype);
  const conditionType = isGenotype
    ? ADVANCED_CONDITION_TYPE.genotype
    : ADVANCED_CONDITION_TYPE.dataset;

  const mode = _getFrequencyMode(frequency, genotype);
  const range = _getFrequencyRange(frequency, genotype);
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

/** genotypeは genotype.key、datasetは frequency/count のどちらを持つかでUIモードを決める。 */
function _getFrequencyMode(
  frequency: QueryObject,
  genotype: unknown
): RestoredFrequencyMode | null {
  if (isQueryObject(genotype) && typeof genotype.key === 'string') {
    return _toSupportedFrequencyMode(genotype.key);
  }
  if (isQueryObject(frequency.frequency)) return 'frequency';
  if (isQueryObject(frequency.count)) return 'count';
  return null;
}

/**
 * UIが対応しているgenotypeモードだけを復元対象にする。
 * 対応外のmodeはnullを返し、その条件行を無視させる。
 */
function _toSupportedFrequencyMode(
  value: string
): RestoredFrequencyMode | null {
  return value === 'aac' || value === 'arc' || value === 'hac' ? value : null;
}

/**
 * rangeが入っている位置はdataset条件とgenotype条件で異なる。
 * dataset: frequency.frequency / frequency.count
 * genotype: genotype.count
 */
function _getFrequencyRange(
  frequency: QueryObject,
  genotype: unknown
): unknown {
  if (isQueryObject(genotype)) return genotype.count;
  return frequency.frequency ?? frequency.count;
}
