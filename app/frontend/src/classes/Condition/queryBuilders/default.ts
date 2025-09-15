// app/frontend/src/classes/Condition/query-builders/default.ts
import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  DefaultQuery,
  BuildContext,
} from '../../../types';

/** Fallback builder for miscellaneous condition types. */
export function buildDefaultQuery(ctx: BuildContext): ConditionQuery {
  const terms = ctx.values.map((v: ConditionItemValueViewElement) => v.value);
  const q: DefaultQuery = {
    [ctx.type]: { relation: ctx.relation, terms },
  };
  return q;
}
