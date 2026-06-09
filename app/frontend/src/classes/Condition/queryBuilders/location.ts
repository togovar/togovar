import type { LocationLeaf, BuildContext } from '../../../types';

/**
 * ゲノム座標条件のクエリを組み立てる。
 * 入力形式は "chr:pos" または "chr:start-end"。
 * start > end の逆順入力でも min/max を取り直すため正しく動く。
 */
export function buildLocationQuery(
  ctx: BuildContext<'location'>
): LocationLeaf {
  const v0 = ctx.values[0];
  if (!v0 || typeof v0.value !== 'string' || v0.value.trim() === '') {
    throw new Error('location: missing or empty value');
  }
  const raw = v0.value.trim();

  // chr: 1-22, X, Y, MT など。位置は半角数字1文字以上。
  const m = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(raw);
  if (!m) {
    throw new Error(
      `location: invalid format "${raw}". Expected "chr:pos" or "chr:start-end".`
    );
  }

  const [, chromosomeRaw, startStr, endStr] = m;

  const chromosome = chromosomeRaw.trim();
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : undefined;

  if (!Number.isFinite(start) || (endStr && !Number.isFinite(end!))) {
    throw new Error(`location: non-numeric position in "${raw}".`);
  }

  // 範囲指定の場合、start/end の大小を正規化してから API に渡す。
  const position =
    end === undefined
      ? start
      : { gte: Math.min(start, end), lte: Math.max(start, end) };

  return { location: { chromosome, position } };
}
