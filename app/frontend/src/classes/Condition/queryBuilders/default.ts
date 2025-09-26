import type {
  BuildContext,
  DefaultLeaf,
  DefaultQueryKey,
} from '../../../types';

/** Fallback builder for Consequence, Disease, Variant type condition types. */
export function buildDefaultQuery(
  ctx: BuildContext<DefaultQueryKey>
): DefaultLeaf {
  const key = ctx.type;
  const terms = ctx.values
    .map((v) => v.value?.trim())
    .filter((s): s is string => !!s && s.length > 0);

  return {
    [key]: { relation: ctx.relation, terms },
  } as DefaultLeaf;
}
