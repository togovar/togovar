import type { ResultData } from '../types';

/** variant page への導線を組み立てるのに必要な最小限のフィールド */
export type VariantLocusFields = Pick<
  ResultData,
  'id' | 'chromosome' | 'position' | 'reference' | 'alternate'
>;

/**
 * バリアントの識別子を取得する。
 * TogoVar ID (tgvid) が無いバリアントも variant page へ遷移できるよう、
 * その場合は chromosome-position-reference-alternate を代替識別子として組み立てる。
 */
export function getVariantIdentifier(result: VariantLocusFields): {
  value: string;
  isTogovarId: boolean;
} {
  if (result.id) {
    return { value: result.id, isTogovarId: true };
  }

  return {
    value: `${result.chromosome}-${result.position}-${result.reference}-${result.alternate}`,
    isTogovarId: false,
  };
}

/**
 * ハイフン区切りのlocus URLを安全に復元できるよう、区切り文字に使うハイフンも明示的にエンコードする。
 */
function encodeVariantPathComponent(value: string | number): string {
  return encodeURIComponent(String(value)).replace(/-/g, '%2D');
}

/**
 * locus形式のURLパスセグメントを組み立てる。
 * 表示用の識別子とは異なり、各要素を個別にエンコードしてからハイフンで結合する。
 */
function getVariantLocusPathSegment(result: VariantLocusFields): string {
  return [
    result.chromosome,
    result.position,
    result.reference,
    result.alternate,
  ]
    .map(encodeVariantPathComponent)
    .join('-');
}

/** variant page への相対パスを組み立てる。tgvid が無い場合は locus 形式のパスになる。 */
export function getVariantReportPath(result: VariantLocusFields): string {
  if (result.id) {
    return `/variant/${encodeURIComponent(result.id)}`;
  }

  return `/variant/${getVariantLocusPathSegment(result)}`;
}
