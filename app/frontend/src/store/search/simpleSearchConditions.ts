import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';

/**
 * 染色体パターンの正規表現。
 * 先頭アンカーなしだと"foo1:123"のような無関係な検索語の一部にもマッチしてしまうため、
 * 先頭（"chr"等の接頭辞は許容）だけを対象にする。
 */
const CHROMOSOME_PATTERN: RegExp =
  /^(?:Chr|ch|Cr|cs)?([1-9]|1[0-9]|2[0-2]|X|Y|M|MT):\d+/i;

/**
 * 染色体名の表記をリファレンスゲノムのESインデックスに合わせて正規化する。
 * GRCh38は染色体名が"M"のみのためMTをMへ寄せる。
 * GRCh37はデータセットによって"M"("JGA-WES"/"JGA-SNP"/"MGeND"等)と
 * "MT"("ClinVar")に分かれて登録されているため、どちらか一方へ寄せてしまうと
 * 常に片方のデータセットへ到達できなくなる。そのためGRCh37では変換せず、
 * ユーザーが入力した表記のままAPIへ渡す。
 * extractSearchCondition（本ファイル）が検索API・ダウンロード・共有URLの
 * 全生成経路で共有される唯一の抽出口のため、ここで正規化することで
 * updateTerm()等が正規化前の生のtermをStoreへ書き込んでいても、
 * 実際にAPI/URLへ渡る値は必ず正規化される。
 * searchManager.ts/searchHistory.tsもStore書き込み時点の値を揃えるために
 * 同じ関数を呼ぶが、正規化は冪等なのでどちらで呼んでも結果は変わらない。
 */
export function normalizeChromosomeTerm(term: string): string {
  if (!CHROMOSOME_PATTERN.test(term)) return term;

  const normalized = term.replace(/^(?:Chr|ch|Cr|cs)/i, '').toUpperCase();

  if (TOGOVAR_FRONTEND_REFERENCE === 'GRCh38') {
    return normalized.replace(/^MT:/, 'M:');
  }

  return normalized;
}

/**
 * Simple SearchのURL/API送信用条件だけを取り出すため、マスター定義のdefaultと比較する。
 * 検索API・ダウンロードAPI・共有URLパラメータの生成が最終的にすべてここを通るため、
 * termの染色体表記正規化もここで行い、Store側の正規化漏れがあっても送信内容を保証する。
 */
export function extractSearchCondition(
  currentConditions: SimpleSearchCurrentConditions = {} as SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Record<string, unknown> {
  const diffConditions: Record<string, unknown> = {};
  const conditionMap = new Map(
    masterConditions.map((condition) => [condition.id, condition])
  );

  for (const [conditionKey, conditionValue] of Object.entries(
    currentConditions
  )) {
    const masterCondition = conditionMap.get(conditionKey as MasterConditionId);
    if (!masterCondition) continue;

    switch (masterCondition.type) {
      case 'array': {
        const filteredValues: Record<string, string | number> = {};
        if (typeof conditionValue === 'object' && conditionValue !== null) {
          for (const [itemKey, itemValue] of Object.entries(conditionValue)) {
            const defaultValue = masterCondition.items?.find(
              (item) => item.id === itemKey
            )?.default;
            if (itemValue !== defaultValue) {
              filteredValues[itemKey] = itemValue;
            }
          }
        }
        if (Object.keys(filteredValues).length > 0) {
          diffConditions[conditionKey] = filteredValues;
        }
        break;
      }

      case 'boolean':
      case 'string': {
        const defaultValue = masterCondition.default;
        if (conditionValue !== defaultValue) {
          diffConditions[conditionKey] =
            conditionKey === 'term' && typeof conditionValue === 'string'
              ? normalizeChromosomeTerm(conditionValue)
              : conditionValue;
        }
        break;
      }
    }
  }

  return diffConditions;
}
