/**
 * Advanced search の Gene symbol / Variant ID で、複数のキーワードを区切る文字。
 * Variant ID と Gene symbol は空白を含まないため、空白・タブ・改行はすべて区切り文字とみなす。
 * Excel やテキストファイルから貼り付けた値もそのまま扱えるよう、カンマ・セミコロン・パイプも区切りに含める。
 */
const SEARCH_TERM_SEPARATOR = /[\s,;|]+/;

/**
 * 区切り文字を含む＝複数のキーワードを入力中かを判定する。
 * 前後の空白は入力途中でも付くため、trim してから判定する。
 */
export function hasMultipleSearchTerms(text: string): boolean {
  return SEARCH_TERM_SEPARATOR.test(text.trim());
}

/** 入力文字列を区切り文字で分割し、空要素と重複を除いて入力順に返す。 */
export function splitSearchTerms(text: string): string[] {
  const terms = text
    .split(SEARCH_TERM_SEPARATOR)
    .filter((term) => term.length > 0);
  return Array.from(new Set(terms));
}

/**
 * 1行の input は貼り付け時に改行を削除するため、Excel の複数行を貼ると値が連結されてしまう。
 * 改行を含む貼り付けだけ横取りし、改行を空白に置き換えてから入力欄へ挿入する。
 * 入力欄は Shadow DOM 内にあるため、composedPath() で実際の input を取得する。
 */
export function insertPastedTextKeepingLineBreaks(e: ClipboardEvent): void {
  const text = e.clipboardData?.getData('text');
  if (!text || !/[\r\n]/.test(text)) return;

  const input = e.composedPath()[0];
  if (!(input instanceof HTMLInputElement)) return;

  e.preventDefault();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  // trim すると先頭・末尾の改行が消え、カーソル前後の既存の値と連結されてしまうため空白のまま残す。
  // 余分な空白は splitSearchTerms が区切りとして読み飛ばす。
  input.setRangeText(text.replace(/[\r\n]+/g, ' '), start, end, 'end');
  // 値の変更を SearchField に伝えるため、通常の入力と同じ input イベントを発火する。
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}
