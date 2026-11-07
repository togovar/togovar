import type { GeneSymbol, ResultData } from '../../types';
import type { ConditionQuery } from '../../types/query';
import type { DiseaseNodeSummary } from '../../api/diseaseInspect';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';

/** 検索結果ヘッダーに並べる Gene/Disease レポートへのリンク1件分。 */
export type ReportLink = {
  kind: 'gene' | 'disease';
  label: string;
  href: string;
};

type AdvancedSearchReportTerms = {
  genes: { id: number; label: string }[];
  diseases: string[];
};

const MEDGEN_CUI_PATTERN = /^C\d+$/;

// ClinVar で疾患名の代わりに入るプレースホルダーは、疾患ページへ誘導する意味が無いため除外する
const PLACEHOLDER_CONDITION_NAMES = new Set(['not provided', 'not specified']);

/**
 * Simple Search では引用符付きのフレーズ検索や大文字小文字違いがあるため、比較前に表記を揃える。
 */
function normalizeTerm(term: string): string {
  return term
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2')
    .trim()
    .toLowerCase();
}

/**
 * 検索APIは疾患名を部分一致で検索するため（例: "Alcohol sensitivity" → "Alcohol sensitivity, acute"）、
 * 完全一致が無い場合は検索語を語として含む疾患名も候補にする。語境界で区切り、語の途中への一致は除外する。
 */
function containsTermAsWords(name: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(name);
}

/**
 * 移行中の旧配列レスポンスと `{ total, items }` 形式の両方から遺伝子一覧を取り出すため、形を吸収する。
 */
function getGeneItems(result: ResultData): GeneSymbol[] {
  const genes: unknown = result.genes;
  if (Array.isArray(genes)) return genes as GeneSymbol[];
  return result.genes?.items ?? [];
}

/**
 * 未取得ページは null で埋まっているため、取得済みのレコードだけを対象にする。
 */
function getLoadedResults(results: readonly (ResultData | null)[]): ResultData[] {
  return results.filter((result): result is ResultData => result !== null);
}

/**
 * 疾患ページは MedGen CUI で開くため、取得済み結果の臨床的意義の条件から CUI と疾患名の対応表を作る。
 */
function buildMedgenNameMap(results: ResultData[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const result of results) {
    for (const significance of result.significance ?? []) {
      for (const condition of significance.conditions ?? []) {
        if (
          condition.medgen &&
          condition.name &&
          !PLACEHOLDER_CONDITION_NAMES.has(condition.name.toLowerCase()) &&
          !names.has(condition.medgen)
        ) {
          names.set(condition.medgen, condition.name);
        }
      }
    }
  }
  return names;
}

/**
 * Simple Search の結果APIは検索語が何に一致したかを返さないため、
 * 取得済み結果の遺伝子名・別名・疾患名と検索語を照合してレポートページを推定する。
 * 遺伝子は記号の部分一致で別遺伝子へ誘導しないよう完全一致（別名を含む）に限る。
 * 疾患は完全一致を優先し、無ければ検索語を語として含む疾患名を候補にする。
 * 候補が複数ある場合は、すべて返して利用者に選ばせる。
 */
export function collectSimpleSearchReportLinks(
  term: string | undefined,
  results: readonly (ResultData | null)[]
): ReportLink[] {
  const key = term ? normalizeTerm(term) : '';
  if (!key) return [];

  const loadedResults = getLoadedResults(results);
  const genes = new Map<number, string>();

  for (const result of loadedResults) {
    for (const gene of getGeneItems(result)) {
      const names = [gene.name, ...(gene.synonyms ?? [])];
      if (names.some((name) => name?.toLowerCase() === key)) {
        genes.set(gene.id, gene.name);
      }
    }
  }

  const medgenNames = buildMedgenNameMap(loadedResults);
  const exactDiseases = new Map(
    [...medgenNames].filter(([, name]) => name.toLowerCase() === key)
  );
  const diseases =
    exactDiseases.size > 0
      ? exactDiseases
      : new Map(
          [...medgenNames].filter(([, name]) => containsTermAsWords(name.toLowerCase(), key))
        );

  return [
    ...Array.from(genes, ([id, name]) => ({
      kind: 'gene' as const,
      label: name,
      href: `/gene/${encodeURIComponent(String(id))}`,
    })),
    ...Array.from(diseases, ([medgen, name]) => ({
      kind: 'disease' as const,
      label: name,
      href: `/disease/${encodeURIComponent(medgen)}`,
    })),
  ];
}

/**
 * AND/OR の入れ子になった Advanced Search 条件から、レポートページを持つ遺伝子・疾患の条件値を集める。
 * 「含まない（ne）」条件の遺伝子・疾患へ誘導すると意図と逆になるため、eq 条件だけを対象にする。
 */
export function collectAdvancedSearchReportTerms(
  query: ConditionQuery | undefined
): AdvancedSearchReportTerms {
  const terms: AdvancedSearchReportTerms = { genes: [], diseases: [] };

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;

    for (const key of ['and', 'or'] as const) {
      const children = record[key];
      if (Array.isArray(children)) children.forEach(walk);
    }

    const gene = record.gene as
      | { relation?: string; terms?: number[]; labels?: Record<string, string> }
      | undefined;
    if (gene?.relation === 'eq') {
      for (const id of gene.terms ?? []) {
        terms.genes.push({ id, label: gene.labels?.[String(id)] ?? String(id) });
      }
    }

    const disease = record.disease as { relation?: string; terms?: string[] } | undefined;
    if (disease?.relation === 'eq') {
      terms.diseases.push(...(disease.terms ?? []));
    }
  };

  walk(query);
  return terms;
}

/**
 * Advanced Search の条件値からレポートリンクを組み立てる。
 * 遺伝子は条件に保存された ID と表示名をそのまま使い、疾患は MONDO ID を CUI へ変換してからリンクする。
 * CUI を持たない疾患や取得に失敗した疾患は、開けないページへ誘導しないよう除外する。
 */
export async function resolveAdvancedSearchReportLinks(
  query: ConditionQuery | undefined,
  results: readonly (ResultData | null)[],
  fetchDiseaseNode: (id: string) => Promise<DiseaseNodeSummary>
): Promise<ReportLink[]> {
  const { genes, diseases } = collectAdvancedSearchReportTerms(query);
  const medgenNames = buildMedgenNameMap(getLoadedResults(results));

  const geneLinks: ReportLink[] = genes.map(({ id, label }) => ({
    kind: 'gene',
    label,
    href: `/gene/${encodeURIComponent(String(id))}`,
  }));

  const diseaseLinks = await Promise.all(
    Array.from(new Set(diseases)).map(async (term): Promise<ReportLink | null> => {
      if (MEDGEN_CUI_PATTERN.test(term)) {
        return {
          kind: 'disease',
          label: medgenNames.get(term) ?? term,
          href: `/disease/${encodeURIComponent(term)}`,
        };
      }
      try {
        const node = await fetchDiseaseNode(term);
        if (!node.cui) return null;
        return {
          kind: 'disease',
          // 条件チップと同じ表記にするため、API の疾患名は先頭を大文字に揃える
          label: node.label
            ? capitalizeFirstLetter(node.label)
            : (medgenNames.get(node.cui) ?? term),
          href: `/disease/${encodeURIComponent(node.cui)}`,
        };
      } catch {
        return null;
      }
    })
  );

  const links = [...geneLinks, ...diseaseLinks.filter((link): link is ReportLink => !!link)];
  // 同じ遺伝子・疾患が複数の条件に含まれていても、リンクは1つにまとめる
  return links.filter(
    (link, index) => links.findIndex((other) => other.href === link.href) === index
  );
}
