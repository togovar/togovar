// app/frontend/src/classes/Condition/query-builders/variantId.ts
import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  IdQuery,
  BuildContext,
} from '../../../types';

/** Build query for variant id(s). */
export function buildVariantIdQuery(context: BuildContext): ConditionQuery {
  const ids = context.values.map((v: ConditionItemValueViewEl) => v.value);
  const query: IdQuery = { id: ids };
  return query;
}
