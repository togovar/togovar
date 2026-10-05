import type {
  BuildContext,
  DefaultLeaf,
  DefaultQueryKey,
} from '../../../types';

/**
 * 専用ビルダーを持たない条件型（Consequence・Disease・Variant type など）の共通クエリを組み立てる。
 * 空文字・空白のみの値は API 側でエラーになるため事前に除外する。
 */
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
