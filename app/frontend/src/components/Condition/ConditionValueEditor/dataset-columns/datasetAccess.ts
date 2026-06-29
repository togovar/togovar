import type { UiNode } from './types';

// JGA-WGSのdataset定義を更新したときは、この未ログイン選択可能リストも必ず見直す。
// 将来的にマスターJSONへ requires_login のような属性を持たせた場合は、この手書きリストを廃止する。
export const PUBLIC_JGA_WGS_DATASETS = new Set([
  'jga_wgs.jgad000758',
  'jga_wgs.jgad000868',
]);

/**
 * 未ログイン時にJGAD制限データセットを選択状態へ含めないため、表示と状態更新で同じ判定を使う。
 */
export function isDatasetLockedForAnonymousUser(
  datasetNode: Pick<UiNode, 'value'>,
  userIsLoggedIn: boolean
): boolean {
  return (
    userIsLoggedIn === false &&
    (datasetNode.value?.includes('jga_wgs.') ?? false) &&
    !PUBLIC_JGA_WGS_DATASETS.has(datasetNode.value ?? '')
  );
}
