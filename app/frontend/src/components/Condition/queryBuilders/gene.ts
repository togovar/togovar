import type { GeneLeaf, BuildContext } from '../../../types';

/**
 * Gene Symbol 条件のクエリを組み立てる。
 * API は gene ID（数値）で検索するが、UI 復元時に表示名（シンボル）が必要なため
 * labels マッピングを付与してストアへ保存できるようにする。
 * 同じ遺伝子が重複選択された場合に Set で一意化する。
 */
export function buildGeneQuery(ctx: BuildContext<'gene'>): GeneLeaf {
  const geneIds = ctx.values.map((v) => Number(v.value));
  const uniqueIds = Array.from(new Set(geneIds));
  const labels = Object.fromEntries(
    ctx.values.map((v) => [String(v.value), v.label])
  );

  return { gene: { relation: ctx.relation!, terms: uniqueIds, labels } };
}
