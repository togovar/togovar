import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import SearchFieldWithSuggestions from '../../SearchField/suggestions/SearchFieldWithSuggestions';
import { API_URL } from '../../../global';
import { axios } from '../../../utils/cachedAxios';
import { createEl } from '../../../utils/dom/createEl';
import {
  hasMultipleSearchTerms,
  insertPastedTextKeepingLineBreaks,
  splitSearchTerms,
} from '../../../utils/searchTerms';

const GENE_SYMBOL_PLACEHOLDER =
  'Type or paste gene symbol(s) separated by a comma, newline, vertical bar(|), semi-colon(;), space, or tab (e.g. BRCA2, ALDH2)';

type GeneSuggestion = { id: number | string; symbol: string };

/**
 * シンボル1件の変換結果。
 * 見つからなかった場合と通信エラーの場合で、ユーザーに伝える内容（綴りの確認か再試行か）が違うため区別する。
 */
type GeneLookupResult =
  | { status: 'found'; gene: GeneSuggestion }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * gene ID への変換リクエスト1件のタイムアウト（ミリ秒）。
 * 変換中はOK・Cancel・Escapeを止めるため、応答のないリクエストでモーダルから出られなくならないようにする。
 */
const GENE_LOOKUP_TIMEOUT_MS = 10_000;

/** 見つからなかったシンボルをメッセージに並べる上限。大量に貼り付けたときにメッセージが長くなりすぎないようにする。 */
const MAX_SYMBOLS_IN_MESSAGE = 10;

/**
 * gene ID への変換で同時に送るリクエストの上限。
 * Excel から数百件を貼り付けたときに、APIへ一度に大量のリクエストを送らないようにする。
 * API は HTTP/2 で1本の接続に多数のリクエストを並べられるため、処理速度を優先して多めにしている。
 */
const MAX_CONCURRENT_GENE_LOOKUPS = 20;

/**
 * items を最大 concurrency 件ずつ並行して処理し、結果を items と同じ順で返す。
 * 空いた枠から順に次の item を処理するため、遅いリクエストがあっても全体は止まらない。
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

/**
 * Gene Symbol の複数入力エディタ。
 * サジェスト選択、またはEnterキー・Addボタンで入力欄の値を区切り文字で分割して追加し、削除ボタンで個別削除できる。
 * APIは gene ID で検索するため、Enterで入力したシンボルはサジェストAPIで gene ID に変換する。
 */
export class ConditionValueEditorGene extends ConditionValueEditor {
  private _searchFieldView!: SearchFieldWithSuggestions;
  private _addButtonEl!: HTMLButtonElement;
  /** 追加できなかったシンボルの理由（見つからない・通信エラー）を表示する領域。 */
  private _messagesEl!: HTMLDivElement;
  private _lastValueViews: ConditionItemValueView[] = [];
  /** gene ID への変換中か。変換中にEnter・Addを重ねて押しても二重に追加しないために使う。 */
  private _isAdding = false;

  /**
   * 検索フィールドUIを生成してサジェスト選択・Enter・貼り付け・削除イベントを登録する。
   * bodyEl に SearchFieldWithSuggestions をインスタンス化することで、
   * 内部コンポーネントが自身の挿入先を管理できる。
   */
  constructor(
    conditionValues: ConditionValues,
    conditionItemView: ConditionItemView
  ) {
    super(conditionValues, conditionItemView);

    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', {
        class: 'section-header',
        text: 'Search by gene symbol',
      }),
      createEl('div', { class: 'section-content' }),
    ]);

    // Enterキーを知らなくても追加できるよう、入力欄の横にAddボタンを並べる。
    const inputRowEl = createEl('div', { class: 'input-row' });
    this.bodyEl.append(inputRowEl);

    this._searchFieldView = new SearchFieldWithSuggestions(
      GENE_SYMBOL_PLACEHOLDER,
      `${API_URL}/api/search/${this.conditionType}`,
      'term',
      inputRowEl,
      {
        valueMappings: {
          valueKey: 'id',
          labelKey: 'symbol',
          aliasOfKey: 'alias_of',
        },
      }
    );

    this._addButtonEl = createEl('button', {
      class: 'button-view',
      text: 'Add',
      attrs: { type: 'button' },
    });
    // Enterと同じ処理を通し、候補一覧を閉じて再表示も止めたうえで search-term-enter で追加する。
    this._addButtonEl.addEventListener('click', () => {
      this._searchFieldView.executeSearchWithoutSuggestion();
    });
    inputRowEl.append(this._addButtonEl);

    // 変換が終わったときに読み上げられるよう、status ロールにしておく。
    this._messagesEl = createEl('div', {
      class: ['messages-view', '-hidden'],
      attrs: { role: 'status' },
    });
    this.bodyEl.append(this._messagesEl);

    this._searchFieldView.addEventListener(
      'new-suggestion-selected',
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string; label: string }>;
        this._handleSuggestSelect(customEvent);
      }
    );

    // サジェスト未選択のままEnterを押したときに発火する。
    this._searchFieldView.addEventListener('search-term-enter', (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      void this._addTypedSymbols(customEvent.detail);
    });

    this._searchFieldView.addEventListener('paste', (e: ClipboardEvent) => {
      insertPastedTextKeepingLineBreaks(e);
    });

    // 区切り文字を含む＝複数入力中は、1件分の候補一覧が入力の邪魔になるため表示しない。
    // ユーザー入力では現在の値に合わせて切り替え、失敗した値の復元時は別途候補を閉じる。
    this._searchFieldView.addEventListener('input-change', (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      this._searchFieldView.hideSuggestions = hasMultipleSearchTerms(
        String(customEvent.detail ?? '')
      );
    });

    this.valuesContainerEl?.addEventListener(
      'delete-condition-item',
      (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        this._handleDeleteValue(customEvent);
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Cancel時に戻す基準として現在のvalue-view一覧をDOMノードごと保存する。 */
  keepLastValues(): void {
    this._lastValueViews = this.conditionItemValueViews;
    // 編集を開き直したときに、前回の編集のメッセージを残さない。
    this._showLookupMessages([], []);
  }

  /** 現在のvalue-viewを全削除してスナップショットを再挿入する。 */
  restore(): void {
    this.conditionItemValueViews.forEach((view) => view.remove());
    this.valuesContainerEl.append(...this._lastValueViews);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /** サジェスト選択時に遺伝子を追加し、続けて次の遺伝子を入力できるよう入力欄を空にする。 */
  private _handleSuggestSelect = (
    e: CustomEvent<{ id: string; label: string }>
  ): void => {
    this.addValueView(e.detail.id, e.detail.label, false, true);
    this._searchFieldView.handleInputReset();
    this.notifyValidity();
  };

  /**
   * Enter・Addで入力されたシンボルを区切り文字で分割し、サジェストAPIで gene ID に変換して追加する。
   * 変換にはAPIの応答を待つため、押した直後に入力欄を空にしてAddボタンを押せなくし、
   * 重ねて押されても二重に追加しないようにする。処理中であることは仮の値タグで示す。
   * 見つからなかった・通信エラーで変換できなかったシンボルは、入力欄に戻して理由をメッセージで示す。
   */
  private async _addTypedSymbols(text: string): Promise<void> {
    if (this._isAdding) return;

    const symbols = splitSearchTerms(text);
    if (symbols.length === 0) return;

    this._setAdding(true);
    this._searchFieldView.term = '';
    this._showLookupMessages([], []);

    // 結果が出る値エリアにすぐ仮の値タグを並べ、追加処理中であることを示す。
    const pendingEls = symbols.map((symbol) =>
      this._createPendingValueEl(symbol)
    );
    this.valuesContainerEl.append(...pendingEls);

    try {
      const results = await mapWithConcurrency(
        symbols,
        MAX_CONCURRENT_GENE_LOOKUPS,
        async (symbol) => ({
          symbol,
          result: await this._findGeneBySymbol(symbol),
        })
      );

      // 仮の値タグを、同じ位置で本物の値タグに置き換える。
      // 既に追加済みの遺伝子は二重に並べないよう、仮の値タグを消すだけにする。
      results.forEach(({ result }, index) => {
        const pendingEl = pendingEls[index];
        if (result.status !== 'found') return;

        const geneId = String(result.gene.id);
        const exists = this.conditionItemValueViews.some(
          (view) => view.value === geneId
        );
        const valueView = this.addValueView(
          geneId,
          result.gene.symbol,
          false,
          true
        );
        if (!exists) pendingEl.replaceWith(valueView);
      });

      const notFound = results
        .filter(({ result }) => result.status === 'not_found')
        .map(({ symbol }) => symbol);
      const failed = results
        .filter(({ result }) => result.status === 'error')
        .map(({ symbol }) => symbol);
      // 追加できなかったシンボルは、直したり再試行したりできるよう入力順のまま入力欄に戻す。
      const unresolved = results
        .filter(({ result }) => result.status !== 'found')
        .map(({ symbol }) => symbol);
      // 変換中に入力された文字は消さず、戻したシンボルの後ろに残す。
      // プログラムで書き戻した値でサジェストAPIを呼ばないよう、ユーザー入力扱いを解除する。
      this._searchFieldView.hasUserInput = false;
      this._searchFieldView.term = [...unresolved, this._searchFieldView.term]
        .filter((term) => term.length > 0)
        .join(' ');
      // 復元ではinput-changeが発火しないため、古い候補の選択で未解決の入力を失わないよう閉じる。
      if (hasMultipleSearchTerms(this._searchFieldView.term)) {
        this._searchFieldView.hideSuggestions = true;
        this._searchFieldView.closeSuggestions();
      }
      this._showLookupMessages(notFound, failed);
      this.notifyValidity();
    } finally {
      // 置き換えなかった仮の値タグ（見つからない・追加済み・エラー）を残さない。
      pendingEls.forEach((pendingEl) => pendingEl.remove());
      this._setAdding(false);
      this._restoreFocusIfLost();
    }
  }

  /**
   * gene ID への変換中に表示する仮の値タグ。
   * condition-item-value-view とは別の要素にすることで、検索条件やOKボタンの判定に含めない。
   */
  private _createPendingValueEl(symbol: string): HTMLElement {
    return createEl('span', {
      class: 'pending-value-view',
      text: symbol,
      attrs: { 'aria-busy': 'true' },
    });
  }

  /**
   * 変換中はAddボタンを押せなくする。ボタンの幅が変わらないよう、ラベルは「Add」のままにする。
   * OK・Cancelも押せなくし、閉じた後に値が追加されて表示と検索条件がずれないようにする。
   */
  private _setAdding(isAdding: boolean): void {
    this._isAdding = isAdding;
    this._addButtonEl.disabled = isAdding;
    this.conditionValues.setBusy(isAdding);
  }

  /**
   * Addボタンは変換中に押せなくするため、押した直後にフォーカスが外れてしまう。
   * 見つからなかったシンボルを直して続けて追加できるよう、フォーカスが外れたときだけ入力欄へ戻す。
   * 変換中にユーザーが別の場所へ移したフォーカスは奪わない。
   */
  private _restoreFocusIfLost(): void {
    const active = document.activeElement;
    if (!active || active === document.body || active === this._addButtonEl) {
      this._searchFieldView.focusInput();
    }
  }

  /**
   * 追加できなかったシンボルを理由ごとにメッセージで示す。どちらも空ならメッセージ領域を隠す。
   * 見つからないものは綴りの確認を、通信エラーのものは再試行を促すため、別のメッセージにする。
   */
  private _showLookupMessages(notFound: string[], failed: string[]): void {
    const messageEls: HTMLElement[] = [];

    if (notFound.length > 0) {
      messageEls.push(
        createEl('div', {
          class: ['message', '-warning'],
          text: `Gene symbol not found: ${this._formatSymbolList(notFound)}`,
        })
      );
    }
    if (failed.length > 0) {
      messageEls.push(
        createEl('div', {
          class: ['message', '-error'],
          text: `Could not look up ${failed.length} gene symbol(s) due to a network or server error. Please try again.`,
        })
      );
    }

    this._messagesEl.replaceChildren(...messageEls);
    this._messagesEl.classList.toggle('-hidden', messageEls.length === 0);
  }

  /** シンボルをカンマ区切りで並べ、上限を超えた分は件数だけ示す。 */
  private _formatSymbolList(symbols: string[]): string {
    const shown = symbols.slice(0, MAX_SYMBOLS_IN_MESSAGE).join(', ');
    const rest = symbols.length - MAX_SYMBOLS_IN_MESSAGE;
    return rest > 0 ? `${shown}, and ${rest} more` : shown;
  }

  /** サジェストAPIの結果から、シンボルが完全一致（大文字・小文字は区別しない）する遺伝子を探す。 */
  private async _findGeneBySymbol(symbol: string): Promise<GeneLookupResult> {
    const url = new URL(`${API_URL}/api/search/${this.conditionType}`);
    url.searchParams.set('term', symbol);

    try {
      const { data } = await axios.get(url.toString(), {
        timeout: GENE_LOOKUP_TIMEOUT_MS,
      });
      const suggestions: GeneSuggestion[] = Array.isArray(data) ? data : [];
      const upperSymbol = symbol.toUpperCase();
      const gene = suggestions.find(
        (suggestion) => suggestion.symbol?.toUpperCase() === upperSymbol
      );
      return gene ? { status: 'found', gene } : { status: 'not_found' };
    } catch (error) {
      console.error(`Failed to find gene symbol: ${symbol}`, error);
      return { status: 'error' };
    }
  }

  /** 削除イベントのvalue値でvalue-viewを削除してバリデーションを更新する。 */
  private _handleDeleteValue(e: CustomEvent<string>): void {
    e.stopPropagation();
    this.removeValueView(e.detail);
    this.notifyValidity();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** value-viewが1件以上あれば選択済みと判断する。OKボタンの活性制御に使う。 */
  get isValid(): boolean {
    return this.conditionItemValueViews.length > 0;
  }
}
