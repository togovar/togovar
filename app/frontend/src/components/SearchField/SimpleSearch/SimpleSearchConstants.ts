import { API_URL } from '../../../global';

/** SimpleSearchConstants - SimpleSearchView関連の定数定義 */

/** グローバル変数の型宣言 */
declare const TOGOVAR_FRONTEND_REFERENCE: 'GRCh37' | 'GRCh38' | string;

/** 検索例のアイテム型 */
export interface ExampleItem {
  key: string;
  value: string;
}

/** 検索フィールド設定の型 */
export interface SearchFieldConfig {
  placeholder: string;
  suggestAPIURL: string;
  suggestAPIQueryParam: string;
  options: {
    valueMappings: {
      valueKey: string;
      labelKey: string;
      aliasOfKey: string;
    };
    titleMappings: {
      gene: string;
      disease: string;
    };
  };
}

/** 検索例のデータ */
export const EXAMPLES: ExampleItem[] = (() => {
  switch (TOGOVAR_FRONTEND_REFERENCE) {
    case 'GRCh37':
      return [
        {
          key: 'Disease',
          value: 'Breast-ovarian cancer, familial 2',
        },
        {
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs114202595',
        },
        {
          key: 'TogoVar',
          value: 'tgv56616325',
        },
        {
          key: 'Position(GRCh37/hg19)',
          value: '16:48258198',
        },
        {
          key: 'Region(GRCh37/hg19)',
          value: '10:73270743-73376976',
        },
        {
          key: 'HGVSc',
          value: 'NM_000690:c.1510G>A',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
      ];
    case 'GRCh38':
      return [
        {
          key: 'Disease',
          value: 'Breast-ovarian cancer, familial 2',
        },
        {
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs114202595',
        },
        {
          key: 'TogoVar',
          value: 'tgv56616325',
        },
        {
          key: 'Position(GRCh38)',
          value: '16:48224287',
        },
        {
          key: 'Region(GRCh38)',
          value: '10:71510986-71617219',
        },
        {
          key: 'HGVSc',
          value: 'NM_000690:c.1510G>A',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
      ];
    default:
      return [];
  }
})();

/** 検索フィールドの設定 */
export const SEARCH_FIELD_CONFIG: SearchFieldConfig = {
  placeholder: 'Search for disease or gene symbol or rs...',
  suggestAPIURL: `${API_URL}/suggest`,
  suggestAPIQueryParam: 'term',
  options: {
    valueMappings: {
      valueKey: 'term',
      labelKey: 'term',
      aliasOfKey: 'alias_of',
    },
    titleMappings: {
      gene: 'Gene names',
      disease: 'Disease names',
    },
  },
};

/** 染色体パターンの正規表現 */
export const CHROMOSOME_PATTERN: RegExp = /([1-9]|1[0-9]|2[0-2]|X|Y|M|MT):\d+/i;
