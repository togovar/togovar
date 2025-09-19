import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  DefaultQueryKey,
  DefaultQuery,
  BuildContext,
} from '../../../types';

/** Fallback builder for Consequence, Disease, Variant type condition types. */
export function buildDefaultQuery(ctx: BuildContext): ConditionQuery {
  const terms = ctx.values
    .map((v: ConditionItemValueViewEl) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);
  if (terms.length === 0) return {};

  const key = ctx.type as DefaultQueryKey;

  return { [key]: { relation: ctx.relation, terms } } as DefaultQuery;
}
