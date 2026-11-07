import { ADVANCED_CONDITION_TYPE } from '../../advancedCondition';
import { fetchDiseaseNode } from '../../api/diseaseInspect';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';
import { makeValue, type QueryObject, type RestoredItem } from './AdvancedSearchRestorerUtils';

/**
 * Disease は URL 上では MONDO ID だけを持つため、表示名を API から引き直してから復元する。
 * 条件行へ注入する前に表示名を確定させ、リロード直後に MONDO ID が一瞬見えるのを防ぐ。
 */
export async function restoreDiseaseItem(disease: QueryObject): Promise<RestoredItem | null> {
  const terms = disease.terms;
  if (!Array.isArray(terms)) return null;

  const relation = disease.relation === 'ne' ? 'ne' : 'eq';
  const values = await Promise.all(
    terms.map(async (term) => {
      const value = String(term);
      return makeValue(value, (await _findDiseaseLabel(value)) ?? value);
    })
  );

  return {
    conditionType: ADVANCED_CONDITION_TYPE.disease,
    relation,
    values,
  };
}

/**
 * 疾患検索UIが選択時に先頭を大文字にした表示名を使うため、同じ表記に揃えて
 * 復元後に検索UIから届く表示名との差で文字が切り替わらないようにする。
 * 取得に失敗した場合は、条件自体は復元できるよう null を返して ID 表示にフォールバックする。
 */
async function _findDiseaseLabel(id: string): Promise<string | null> {
  try {
    const { label } = await fetchDiseaseNode(id);
    if (!label) return null;
    return capitalizeFirstLetter(label);
  } catch (_error) {
    return null;
  }
}
