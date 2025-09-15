// app/frontend/src/classes/Condition/query-builders/variantId.ts
import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  IdQuery,
  BuildContext,
} from '../../../types';

/** Build query for variant id(s). */
export function buildVariantIdQuery(context: BuildContext): ConditionQuery {
  const ids = context.values.map((v: ConditionItemValueViewElement) => v.value);
  const query: IdQuery = { id: ids };
  return query;
}
