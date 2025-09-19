import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  IdQuery,
  BuildContext,
} from '../../../types';

/** Build query for variant id(s). */
export function buildVariantIdQuery(context: BuildContext): ConditionQuery {
  const ids = context.values
    .map((v: ConditionItemValueViewEl) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);
  if (ids.length === 0) return {};

  return { id: ids } as IdQuery;
}
