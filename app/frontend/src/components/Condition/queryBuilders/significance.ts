import type {
  SignificanceSource,
  SignificanceLeaf,
  SignificanceQuery,
  BuildContext,
  Relation,
} from '../../../types';

import {
  SIGNIFICANCE_TERM_SET,
  type SignificanceTerm,
} from '../../../advancedCondition';
import type { ConditionItemValueView } from '../ConditionItemValueView';

// ソースごとのセレクタを定数化する。変更時は1箇所だけ修正すれば済む。
const SEL = {
  mgend:
    ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view',
  clinvar:
    ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view',
} as const;

/**
 * 指定セレクタで条件要素を取得する。
 * container が null/undefined の場合は DOM 構造の問題として即座にエラーとする。
 */
function pickScoped(
  container: HTMLElement | null | undefined,
  selector: string
): ConditionItemValueView[] {
  if (!container) {
    throw new Error('pickScoped: missing container');
  }
  return Array.from(
    container.querySelectorAll(selector)
  ) as ConditionItemValueView[];
}

/** API に送れる有効な significance term かどうかを型ガードで判定する。 */
function isSignificanceTerm(v: unknown): v is SignificanceTerm {
  return (
    typeof v === 'string' && SIGNIFICANCE_TERM_SET.has(v as SignificanceTerm)
  );
}

/** 要素リストから significance term を収集する。無効な値は除外する。 */
function collectTerms(elements: ConditionItemValueView[]): SignificanceTerm[] {
  return elements.map((e) => e.value).filter(isSignificanceTerm);
}

/**
 * 1ソース（mgend/clinvar）の条件クエリを組み立てる。
 * DOM 要素が0件またはvalid termが0件の場合はnullを返し、呼び出し元でスキップさせる。
 */
function buildSourceCondition(
  relation: Relation,
  source: SignificanceSource,
  elements: ConditionItemValueView[]
): SignificanceLeaf | null {
  if (elements.length === 0) return null;
  const terms = collectTerms(elements);
  if (terms.length === 0) return null;

  return { significance: { relation, source: [source], terms } };
}

/**
 * Clinical significance 条件のクエリを組み立てる。
 * ソースが2つ選ばれた場合、除外（ne）は AND、包含（eq）は OR で結合する。
 * API の仕様として、除外条件はすべてのソースで否定しないと意図通りにならないため AND を使う。
 */
export function buildSignificanceQuery(
  ctx: BuildContext<'significance'>
): SignificanceQuery {
  const container = ctx.valuesContainer;
  const mgendEls = pickScoped(container, SEL.mgend);
  const clinvarEls = pickScoped(container, SEL.clinvar);

  // ソースごとにクエリを生成し、null（未選択）を除外する。
  const mgend = buildSourceCondition(ctx.relation, 'mgend', mgendEls);
  const clinvar = buildSourceCondition(ctx.relation, 'clinvar', clinvarEls);

  const conditions = [mgend, clinvar].filter(
    (clause): clause is SignificanceLeaf => clause !== null
  );

  // 両ソースとも未選択の場合はクエリが成立しない。
  if (conditions.length === 0) {
    throw new Error('significance: no terms selected');
  }

  // 1ソースのみ選択された場合はそのままの形で返す。
  if (conditions.length === 1) {
    return conditions[0];
  }

  // 2ソース選択: 除外（ne）は AND、包含（eq）は OR で結合する。
  return ctx.relation === 'ne' ? { and: conditions } : { or: conditions };
}
