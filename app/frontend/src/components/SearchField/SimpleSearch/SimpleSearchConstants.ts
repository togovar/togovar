import { API_URL } from '../../../global';
import type { ExampleItem } from './SimpleSearchTypes';

/** SimpleSearchConstants - SimpleSearchView関連の定数定義 */

/** グローバル変数の型宣言 */
declare const TOGOVAR_FRONTEND_REFERENCE: 'GRCh37' | 'GRCh38' | string;

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
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs671',
        },
        {
          key: 'TogoVar',
          value: 'tgv47264307',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
        {
          key: 'HGVSc',
          value: ['ALDH2:c.1510G>A', 'NM_000690:c.1510G>A'],
        },
        {
          key: 'Chr:Position:Ref>Alt',
          value: '12:112241766:G>A',
        },
        {
          key: 'VCF',
          value: '12-112241766-G-A',
        },
        {
          key: 'Position',
          value: '12:112241766',
        },
        {
          key: 'Region',
          value: '12:112241766-112241766',
        },
        {
          key: 'Disease',
          value: '"Alcohol sensitivity"',
        },
      ];
    case 'GRCh38':
      return [
        {
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs671',
        },
        {
          key: 'TogoVar',
          value: 'tgv47264307',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
        {
          key: 'HGVSc',
          value: ['ALDH2:c.1510G>A', 'NM_000690:c.1510G>A'],
        },
        {
          key: 'Chr:Position:Ref>Alt',
          value: '12:111803962:G>A',
        },
        {
          key: 'VCF',
          value: '12-111803962-G-A',
        },
        {
          key: 'Position',
          value: '12:111803962',
        },
        {
          key: 'Region',
          value: '12:111803962-111803962',
        },
        {
          key: 'Disease',
          value: '"Alcohol sensitivity"',
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

/**
 * normalizeChromosomeTerm（store/search/simpleSearchConditions.ts）が書き込む"M:"表記を、
 * 検索ボックス表示用に"MT:"へ戻す。
 * Storeのtermは検索API・共有URLと表示(検索ボックス/カリオタイプ由来の検索)を兼ねているため、
 * "M:"のまま表示すると、Location条件やAdvanced Search復元で徹底している
 * 「表示は常にMT、Mへの変換はAPI/内部表現限定」という規則と食い違ってしまう。
 * そのためStoreの値自体は変えず、SimpleSearchViewが画面へ反映する直前だけここで変換する。
 * "M:"の後に数字が続く場合だけを対象にすることで、"M:ABC"のような
 * 染色体位置ではないtermを入力中に書き換えてしまわないようにする。
 */
export function toDisplayChromosomeTerm(term: string): string {
  if (TOGOVAR_FRONTEND_REFERENCE !== 'GRCh38') return term;
  if (!/^M:\d/.test(term)) return term;

  return term.replace(/^M:/, 'MT:');
}
