import { ADVANCED_CONDITION_TYPE } from '../../advancedCondition';
import { API_URL } from '../../global';
import { axios } from '../../utils/cachedAxios';
import {
  isQueryObject,
  makeValue,
  getString,
  type QueryObject,
  type RestoredItem,
} from './AdvancedSearchRestorerUtils';

/**
 * Gene symbolはURL上では数値IDだけを持つため、表示用symbolをAPIから引き直す。
 * URLに labels 辞書があれば API を省略し、なければ gene_symbol API へフォールバックする。
 */
export async function restoreGeneItem(
  gene: QueryObject
): Promise<RestoredItem | null> {
  const terms = gene.terms;
  if (!Array.isArray(terms)) return null;

  const relation = gene.relation === 'ne' ? 'ne' : 'eq';
  const values = await Promise.all(
    terms.map(async (term) => {
      const value = String(term);
      const label =
        _getGeneLabelFromQuery(gene.labels, value) ??
        (await _findGeneSymbolLabel(value)) ??
        value;
      return makeValue(value, label);
    })
  );

  return {
    conditionType: ADVANCED_CONDITION_TYPE.gene_symbol,
    relation,
    values,
  };
}

/** URLに埋め込まれた labels 辞書があれば、APIを叩かずにそこからラベルを取る。 */
function _getGeneLabelFromQuery(
  labels: unknown,
  geneId: string
): string | null {
  if (!isQueryObject(labels)) return null;
  return getString(labels[geneId]);
}

/** labels がない場合のフォールバック。gene_symbol APIでIDからsymbolを引き直す。 */
async function _findGeneSymbolLabel(geneId: string): Promise<string | null> {
  const url = new URL(`${API_URL}/api/search/${ADVANCED_CONDITION_TYPE.gene_symbol}`);
  url.searchParams.set('term', geneId);

  try {
    const { data } = await axios.get(url.toString());
    const suggestions = Array.isArray(data) ? data : [];
    const matched = suggestions.find(
      (suggestion) =>
        isQueryObject(suggestion) && String(suggestion.id) === geneId
    );
    if (!isQueryObject(matched)) return null;

    return getString(matched.symbol ?? matched.label ?? matched.name);
  } catch (_error) {
    return null;
  }
}
