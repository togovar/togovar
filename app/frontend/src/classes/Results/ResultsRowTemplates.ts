import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import { DatasetMasterItem } from '../../types';

export const REF_ALT_SHOW_LENGTH = 4;

// 各カラムのHTMLテンプレートを定数として分離
export const COLUMN_TEMPLATES = {
  togovar_id:
    '<td class="togovar_id"><a href="" class="hyper-text -internal" target="_blank"></a></td>',
  refsnp_id:
    '<td class="refsnp_id" data-remains=""><a href="" target="_blank" class="hyper-text -external"></a></td>',
  position:
    '<td class="position"><div class="chromosome-position"><div class="chromosome"></div><div class="coordinate"></div></div></td>',
  ref_alt:
    '<td class="ref_alt"><div class="ref-alt"><span class="ref" data-sum=""></span><span class="arrow"></span><span class="alt" data-sum=""><span class="sum"></span></span></div></td>',
  type: '<td class="type"><div class="variant-type"></div></td>',
  gene: '<td class="gene" data-remains=""><a href="" class="hyper-text -internal" target="_blank"></a></td>',
  consequence:
    '<td class="consequence" data-remains=""><div class="consequence-item"></div></td>',
  clinical_significance:
    '<td class="clinical_significance"><div class="clinical-significance" data-value=""></div><a class="hyper-text -internal" href="" target="_blank"></a><span class="icon" data-remains="" data-mgend=""></span></td>',
  alphamissense:
    '<td class="alphamissense"><div class="variant-function" data-function=""></div></td>',
  sift: '<td class="sift"><div class="variant-function" data-function=""></div></td>',
  polyphen:
    '<td class="polyphen"><div class="variant-function" data-function=""></div></td>',
} as const;

/** 頻度カラムのHTMLを生成 */
export function createFrequencyColumnHTML(): string {
  const master: DatasetMasterItem[] =
    getSimpleSearchConditionMaster('dataset').items;
  const frequencyElements = master
    .filter((dataset) => dataset.has_freq)
    .map(
      (dataset) =>
        `<logarithmized-block-graph-frequency-view
        data-dataset="${dataset.id}"
        data-direction="vertical"
      ></logarithmized-block-graph-frequency-view>`
    )
    .join('');

  return `<td class="alt_frequency">${frequencyElements}</td>`;
}
