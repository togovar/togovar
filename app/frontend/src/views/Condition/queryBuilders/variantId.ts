import type { IdLeaf, BuildContext } from '../../../types';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';

/**
 * Variant ID 条件のクエリを組み立てる。
 * API の id クエリは配列をそのまま OR として扱うため、明示的な OR 結合は不要。
 * 空文字・空白のみのIDは API 側でエラーになるため事前に除外する。
 */
export function buildVariantIdQuery(context: BuildContext<'id'>): IdLeaf {
  const ids = context.values
    .map((v: ConditionItemValueView) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);

  return { id: ids };
}
