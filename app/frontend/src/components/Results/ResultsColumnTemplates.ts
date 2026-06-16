import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import type { MasterConditionItem } from '../../types';

type FrequencyDatasetItem = MasterConditionItem & {
  id: string;
  has_freq: true;
};

/** Ref/Alt列は長い配列を省略表示するため、表示する最大文字数を共有する。 */
export const REF_ALT_SHOW_LENGTH = 4;

/**
 * ResultsRowViewで固定DOM行を再利用するため、列ごとの最小HTMLを定数で共有する。
 */
export const COLUMN_TEMPLATES = {
  togovar_id: '<td class="togovar_id"></td>',
  refsnp_id:
    '<td class="refsnp_id"><div class="remains-content"><span class="remains-badge" data-remains=""></span></div></td>',
  position:
    '<td class="position"><div class="chromosome-position"><div class="chromosome"></div><div class="coordinate"></div></div></td>',
  ref_alt:
    '<td class="ref_alt"><div class="ref-alt"><span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""><span class="sum"></span></span></div></td>',
  type: '<td class="type"><div class="variant-type"></div></td>',
  gene: '<td class="gene"><div class="remains-content"><span class="remains-badge" data-remains=""></span></div></td>',
  consequence:
    '<td class="consequence"><div class="remains-content"><div class="consequence-item"></div><span class="remains-badge" data-remains=""></span></div></td>',
  clinical_significance:
    '<td class="clinical_significance"><div class="clinical-significance-flex"><div class="clinical-significance" data-value=""></div><span class="clinical-remains" data-remains=""></span><span class="icon" data-mgend=""></span></div></td>',
  alphamissense:
    '<td class="alphamissense"><div class="variant-function" data-function=""></div></td>',
  sift: '<td class="sift"><div class="variant-function" data-function=""></div></td>',
  polyphen:
    '<td class="polyphen"><div class="variant-function" data-function=""></div></td>',
} as const;

/**
 * datasetマスター未ロード時もResults行のHTML生成を止めないため、空の頻度セルへフォールバックする。
 *
 * @returns 生成したHTMLテーブルセル文字列
 */
export function createFrequencyColumnHTML(): string {
  const frequencyElements = getFrequencyDatasetItems()
    .map(
      (dataset) =>
        `<frequency-block-view
        data-dataset="${dataset.id}"
      ></frequency-block-view>`
    )
    .join('');

  return `<td class="alt_frequency">${frequencyElements}</td>`;
}

/**
 * datasetマスターは初期化順で未取得になり得るため、頻度表示に使える項目だけを安全に返す。
 */
function getFrequencyDatasetItems(): FrequencyDatasetItem[] {
  const items = getSimpleSearchConditionMaster('dataset')?.items ?? [];
  return items.filter(isFrequencyDatasetItem);
}

/**
 * search.d.ts上は汎用マスター項目なので、頻度datasetとして必要なshapeだけをここで絞り込む。
 */
function isFrequencyDatasetItem(
  item: MasterConditionItem
): item is FrequencyDatasetItem {
  return typeof item.id === 'string' && item.has_freq === true;
}
