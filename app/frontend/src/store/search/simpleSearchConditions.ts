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
 * extractSearchCondition（本ファイル）は検索API・ダウンロードAPI・URLのfilter条件で使う
 * 送信用条件の抽出口のため、Storeに正規化前のtermが残っていても送信用の値はここで揃える。
 * Simple Search URLの可読なtermパラメータだけは、検索ボックス表示と共有URLを一致させるため
 * simpleSearchURL.ts側でStoreの生のtermをそのまま使う。
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
 * 検索API・ダウンロードAPI・URLのfilter条件では、termの染色体表記正規化もここで行う。
 * URL上で読めるtermパラメータは表示表記を保つため、simpleSearchURL.tsで別途扱う。
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
