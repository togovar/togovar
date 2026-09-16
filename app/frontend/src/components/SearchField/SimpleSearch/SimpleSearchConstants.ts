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

/** 染色体パターンの正規表現 */
export const CHROMOSOME_PATTERN: RegExp = /([1-9]|1[0-9]|2[0-2]|X|Y|M|MT):\d+/i;

/**
 * 染色体名の表記をリファレンスゲノムのESインデックスに合わせて正規化する。
 * GRCh38は染色体名が"M"のみのためMTをMへ寄せる。
 * GRCh37はデータセットによって"M"("JGA-WES"/"JGA-SNP"/"MGeND"等)と
 * "MT"("ClinVar")に分かれて登録されているため、どちらか一方へ寄せてしまうと
 * 常に片方のデータセットへ到達できなくなる。そのためGRCh37では変換せず、
 * ユーザーが入力した表記のままAPIへ渡す。
 * 呼び出し口はsetSimpleSearchCondition（searchManager.ts）と
 * buildSimpleConditionsFromURL（searchHistory.ts）の2箇所で、
 * 検索ボックス入力・URL直読み込み・popstate復元のいずれもこのどちらかを
 * 経由してStoreへ書き込まれるため、両方を通すことで正規化を保証する。
 * termを書き込む経路を新設する場合はここも通すこと。
 */
export function normalizeChromosomeTerm(term: string): string {
  if (!CHROMOSOME_PATTERN.test(term)) return term;

  const normalized = term.replace(/Chr|ch|Cr|cs/i, '').toUpperCase();

  if (TOGOVAR_FRONTEND_REFERENCE === 'GRCh38') {
    return normalized.replace('MT:', 'M:');
  }

  return normalized;
}
