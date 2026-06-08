import { CONDITION_TYPE, type ConditionTypeValue } from '../../definition';
import type { ConditionGroupView } from '../Condition/ConditionGroupView';
import type { LogicalOperator } from '../../types';
import {
  toMergedFrequencyItem,
  restoreFrequencyItem,
} from './AdvancedSearchFrequencyRestorer';
import { restoreGeneItem } from './AdvancedSearchGeneRestorer';
import {
  restoreSignificanceItem,
  restorePredictionItem,
} from './AdvancedSearchSignificanceRestorer';
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

/** query fragmentを再帰的にたどり、論理グループまたは条件行として追加する。 */
async function appendQueryToGroup(
  parentGroup: ConditionGroupView,
  query: unknown,
  useCurrentGroup: boolean = false
): Promise<void> {
  if (!isQueryObject(query)) return;

  const logical = getLogicalQuery(query);
  if (logical) {
    // dataset/genotypeの複数選択はorで展開されているため、先にまとめを試みる。
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

    // autoUngroupを一時停止しないと、子の追加ごとに不要なungroup処理が走る。
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

/** ConditionItemViewを通常生成した後に値だけを注入し、編集モードを閉じた状態に戻す。 */
async function appendRestoredItem(
  parentGroup: ConditionGroupView,
  item: RestoredItem
): Promise<void> {
  const itemView = parentGroup.addNewConditionItem(item.conditionType);
  await itemView.hydrateFromRestoredQuery({
    relation: item.relation,
    values: item.values,
  });
}

/** { and: [...] } / { or: [...] } だけを論理グループとして扱う。 */
function getLogicalQuery(
  query: QueryObject
): { operator: LogicalOperator; children: unknown[] } | null {
  const operator = query.and ? 'and' : query.or ? 'or' : null;
  if (!operator) return null;

  const children = query[operator];
  if (!Array.isArray(children)) return null;

  return { operator, children };
}

/** query leafのキーから、復元すべき条件種別と表示値へ変換するディスパッチャ。 */
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
      return restoreTermItem(conditionType, leaf);
    }
  }

  if (isQueryObject(query.significance)) {
    return restoreSignificanceItem(query.significance);
  }

  return restorePredictionItem(query);
}

/** API用のlocation queryを、Location editorが扱う "chr:start-end" 形式へ戻す。 */
function restoreLocationItem(location: QueryObject): RestoredItem | null {
  const chromosome = location.chromosome;
  if (typeof chromosome !== 'string') return null;

  const position = location.position;
  const value =
    typeof position === 'number'
      ? `${chromosome}:${position}`
      : isQueryObject(position)
      ? `${chromosome}:${getRangeStart(position) ?? ''}-${getRangeEnd(position) ?? ''}`
      : null;

  if (!value) return null;

  return {
    conditionType: CONDITION_TYPE.location,
    values: [makeValue(value)],
  };
}

/** relationとtermsを持つ標準的な条件を、共通の表示値配列へ戻す。 */
function restoreTermItem(
  conditionType: ConditionTypeValue,
  leaf: QueryObject
): RestoredItem | null {
  const terms = leaf.terms;
  if (!Array.isArray(terms)) return null;

  const relation = leaf.relation === 'ne' ? 'ne' : 'eq';
  return {
    conditionType,
    relation,
    values: terms.map((term) => {
      const value = String(term);
      return makeValue(value, findConditionLabel(conditionType, value));
    }),
  };
}
