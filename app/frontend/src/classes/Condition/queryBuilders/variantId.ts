import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  BuildContext,
} from '../../../types';

/** Build query for variant id(s). */
export function buildVariantIdQuery(
  context: BuildContext<'id'>
): ConditionQuery {
  const ids = context.values
    .map((v: ConditionItemValueViewEl) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);

  return { id: ids };
}
