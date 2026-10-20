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
  'Type or paste gene symbol(s) separated by a comma, newline, vertical bar(|), semi-colon(;), space, or tab (e.g. BRCA2, ALDH)';

type GeneSuggestion = { id: number | string; symbol: string };

/**
 * Gene Symbol の複数入力エディタ。
 * サジェスト選択、またはEnterキー・Addボタンで入力欄の値を区切り文字で分割して追加し、削除ボタンで個別削除できる。
 * APIは gene ID で検索するため、Enterで入力したシンボルはサジェストAPIで gene ID に変換する。
 */
export class ConditionValueEditorGene extends ConditionValueEditor {
  private _searchFieldView!: SearchFieldWithSuggestions;
  private _addButtonEl!: HTMLButtonElement;
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
    this._addButtonEl.addEventListener('click', () => {
      this._searchFieldView.hideSuggestionsMethod();
      void this._addTypedSymbols(this._searchFieldView.term);
    });
    inputRowEl.append(this._addButtonEl);

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
    // ユーザーの入力時だけ切り替え、追加後に入力欄を書き換えたときに古い候補が出ないようにする。
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
   * 変換にはAPIの応答を待つため、押した直後に入力欄を空にしてボタンを「Adding…」にし、
   * 処理中であることを示すとともに、重ねて押されても二重に追加しないようにする。
   * 見つからなかったシンボルは、どれが追加できなかったか分かるよう入力欄に戻す。
   */
  private async _addTypedSymbols(text: string): Promise<void> {
    if (this._isAdding) return;

    const symbols = splitSearchTerms(text);
    if (symbols.length === 0) return;

    this._setAdding(true);
    this._searchFieldView.term = '';

    // 結果が出る値エリアにすぐ仮の値タグを並べ、追加処理中であることを示す。
    const pendingEls = symbols.map((symbol) =>
      this._createPendingValueEl(symbol)
    );
    this.valuesContainerEl.append(...pendingEls);

    try {
      const results = await Promise.all(
        symbols.map(async (symbol) => ({
          symbol,
          gene: await this._findGeneBySymbol(symbol),
        }))
      );

      // 仮の値タグを、同じ位置で本物の値タグに置き換える。
      // 既に追加済みの遺伝子は二重に並べないよう、仮の値タグを消すだけにする。
      results.forEach(({ gene }, index) => {
        const pendingEl = pendingEls[index];
        if (!gene) return;

        const geneId = String(gene.id);
        const exists = this.conditionItemValueViews.some(
          (view) => view.value === geneId
        );
        const valueView = this.addValueView(geneId, gene.symbol, false, true);
        if (!exists) pendingEl.replaceWith(valueView);
      });

      const notFound = results
        .filter(({ gene }) => !gene)
        .map(({ symbol }) => symbol);
      // 変換中に入力された文字は消さず、見つからなかったシンボルの後ろに残す。
      this._searchFieldView.term = [...notFound, this._searchFieldView.term]
        .filter((term) => term.length > 0)
        .join(' ');
      this.notifyValidity();
    } finally {
      // 置き換えなかった仮の値タグ（見つからない・追加済み・エラー）を残さない。
      pendingEls.forEach((pendingEl) => pendingEl.remove());
      this._setAdding(false);
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

  /** 変換中はAddボタンを押せなくし、表示を「Adding…」に変えて処理中であることを示す。 */
  private _setAdding(isAdding: boolean): void {
    this._isAdding = isAdding;
    this._addButtonEl.disabled = isAdding;
    this._addButtonEl.textContent = isAdding ? 'Adding…' : 'Add';
  }

  /** サジェストAPIの結果から、シンボルが完全一致（大文字・小文字は区別しない）する遺伝子を探す。 */
  private async _findGeneBySymbol(
    symbol: string
  ): Promise<GeneSuggestion | null> {
    const url = new URL(`${API_URL}/api/search/${this.conditionType}`);
    url.searchParams.set('term', symbol);

    try {
      const { data } = await axios.get(url.toString());
      const suggestions: GeneSuggestion[] = Array.isArray(data) ? data : [];
      const upperSymbol = symbol.toUpperCase();
      return (
        suggestions.find(
          (suggestion) => suggestion.symbol?.toUpperCase() === upperSymbol
        ) ?? null
      );
    } catch (error) {
      console.error(`Failed to find gene symbol: ${symbol}`, error);
      return null;
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
