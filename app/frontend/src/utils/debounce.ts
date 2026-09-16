/** 連続入力中のAPI呼び出しを抑えるため、最後の呼び出しだけを遅延実行する。 */
export function debounce<This, Args extends unknown[]>(
  func: (this: This, ...args: Args) => unknown,
  ms = 1000
): (this: This, ...args: Args) => void {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;

  return function debounced(this: This, ...args: Args): void {
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
    }

    timeout = globalThis.setTimeout(() => {
      // funcの戻り値(Promiseの場合)を誰も購読していないと、rejectがunhandled
      // rejectionとして扱われてしまう(例: 開発サーバーのエラーオーバーレイ)。
      Promise.resolve(func.apply(this, args)).catch((error: unknown) => {
        console.error(error);
      });
    }, ms);
  };
}
