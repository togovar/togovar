import type { IdLeaf, BuildContext } from '../../../types';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';

/** Build query for variant id(s). */
export function buildVariantIdQuery(context: BuildContext<'id'>): IdLeaf {
  const ids = context.values
    .map((v: ConditionItemValueView) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);

  return { id: ids };
}
