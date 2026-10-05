/** 参照ゲノムごとの染色体両端座標 */
type ChromosomeRegion = {
  GRCh37: [number, number];
  GRCh38: [number, number];
};

/** 各染色体の選択状態と座標範囲 */
export type ChromosomeConfig = {
  selected: boolean;
  region: ChromosomeRegion;
};

/**
 * カリオタイプビューの設定。localStorage と Store の両方で共有するため types/ に定義する。
 */
export type KaryotypeState = {
  isOpened: boolean;
  isShowBand: boolean;
  height: number;
  reference: 'GRCh37' | 'GRCh38';
  version: number;
  chromosomes: Record<string, ChromosomeConfig>;
};
