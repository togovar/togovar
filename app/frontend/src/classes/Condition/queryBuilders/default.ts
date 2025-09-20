import type {
  ConditionQuery,
  BuildContext,
  DefaultQuery,
} from '../../../types';

/** Fallback builder for Consequence, Disease, Variant type condition types. */
export function buildDefaultQuery(
  ctx: BuildContext<'consequence' | 'disease' | 'type'>
): ConditionQuery {
  const terms = ctx.values
    .map((v) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);
  const key = ctx.type;

  return { [key]: { relation: ctx.relation, terms } } as DefaultQuery;
}
