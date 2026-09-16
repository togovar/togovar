/** variant page への導線を組み立てるのに必要な最小限のフィールド */
export type VariantLocusFields = {
  id?: string;
  chromosome: string;
  position: number;
  reference: string;
  alternate?: string;
  alternative?: string;
};

/**
 * API移行中に alternate / alternative が混在しても、URL生成側の分岐を増やさず同じALTとして扱う。
 */
function getVariantAlternate(result: VariantLocusFields): string {
  return result.alternate ?? result.alternative ?? '';
}

/**
 * 文字単位の事前判定で巨大SVのURL生成コストを避けるため、locus構成要素の素の長さを合算する。
 */
function getRawVariantLocusLength(result: VariantLocusFields): number {
  return (
    String(result.chromosome).length +
    String(result.position).length +
    result.reference.length +
    getVariantAlternate(result).length
  );
}

/**
 * TogoVar IDがないバリアントからもレポートへ遷移できるよう、locusを代替識別子として返す。
 * TogoVar ID (tgvid) がある場合は既存の表示・遷移の互換性を優先する。
 */
export function getVariantIdentifier(result: VariantLocusFields): {
  value: string;
  isTogovarId: boolean;
} {
  if (result.id) {
    return { value: result.id, isTogovarId: true };
  }

  const alternate = getVariantAlternate(result);

  return {
    value: `${result.chromosome}-${result.position}-${result.reference}-${alternate}`,
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
 * locus形式のURLを安全に扱えるよう、表示用識別子とは別にパス専用のセグメントを作る。
 * 各要素を個別にエンコードしてからハイフンで結合する。
 */
function getVariantLocusPathSegment(result: VariantLocusFields): string {
  return [
    result.chromosome,
    result.position,
    result.reference,
    getVariantAlternate(result),
  ]
    .map(encodeVariantPathComponent)
    .join('-');
}

/** TogoVar IDがない検索結果も開けるよう、tgvidまたはlocus形式でvariant pageへの相対パスを作る。 */
export function getVariantReportPath(result: VariantLocusFields): string {
  if (result.id) {
    return `/variant/${encodeURIComponent(result.id)}`;
  }

  return `/variant/${getVariantLocusPathSegment(result)}`;
}

/**
 * search結果からReportリンクを出す上限（URL文字数）。
 * locus形式のURLはREF/ALTの塩基配列をそのままパスへ埋め込むため、大きなSVでは
 * URL長が各種ミドルウェアの上限を超えてしまう。tgvidがあるバリアントは短いURLで遷移できるため、
 * この上限はtgvidがないlocus形式のReportリンクだけに適用する。
 */
export const REPORT_LINK_MAX_LENGTH = 10000;

/**
 * 実際に発行するURL長で判定し、REF+ALT合算やpercent-encoding分の超過も取りこぼさない。
 */
export function exceedsReportLinkLength(result: VariantLocusFields): boolean {
  if (result.id) return false;
  if (getRawVariantLocusLength(result) > REPORT_LINK_MAX_LENGTH) return true;
  return getVariantReportPath(result).length > REPORT_LINK_MAX_LENGTH;
}
