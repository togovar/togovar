import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  DefaultQuery,
  BuildContext,
} from '../../../types';

/** Fallback builder for miscellaneous condition types. */
export function buildDefaultQuery(ctx: BuildContext): ConditionQuery {
  const terms = ctx.values.map((v: ConditionItemValueViewEl) => v.value);
  const q: DefaultQuery = {
    [ctx.type]: { relation: ctx.relation, terms },
  };
  return q;
}
