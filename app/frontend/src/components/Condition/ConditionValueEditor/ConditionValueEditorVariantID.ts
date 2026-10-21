import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import SearchField from '../../SearchField/SearchField';
import { createEl } from '../../../utils/dom/createEl';
import {
  insertPastedTextKeepingLineBreaks,
  splitSearchTerms,
} from '../../../utils/searchTerms';

const VARIANT_ID_PLACEHOLDER =
  'Type or paste TogoVar ID(s) or refSNP ID(s) separated by a comma, newline, vertical bar(|), semi-colon(;), space, or tab (e.g. tgv56616235, rs114202595)';

/**
 * Variant ID の複数入力エディタ。
 * Enterキー・Addボタンで入力欄の値を区切り文字で分割して追加し、削除ボタンで個別削除できる。
 */
export class ConditionValueEditorVariantID extends ConditionValueEditor {
  private _searchFieldView!: SearchField;
  private _lastValueViews: ConditionItemValueView[] = [];

  /**
   * 検索フィールドUI生成・EnterキーでのID追加・貼り付け・削除イベントを登録する。
   * 削除イベントは valuesContainerEl に委譲することで、後から追加されたvalue-viewにも効く。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', {
        class: 'section-header',
        text: 'Search by variant ID',
      }),
      createEl('div', { class: 'section-content' }),
    ]);

    // Enterキーを知らなくても追加できるよう、入力欄の横にAddボタンを並べる。
    const inputRowEl = createEl('div', { class: 'input-row' });
    this.bodyEl.append(inputRowEl);

    this._searchFieldView = new SearchField(inputRowEl, VARIANT_ID_PLACEHOLDER);

    const addButtonEl = createEl('button', {
      class: 'button-view',
      text: 'Add',
      attrs: { type: 'button' },
    });
    addButtonEl.addEventListener('click', () => this._addTypedIds());
    inputRowEl.append(addButtonEl);

    this._searchFieldView.addEventListener('paste', (e: ClipboardEvent) => {
      insertPastedTextKeepingLineBreaks(e);
    });

    this._searchFieldView.addEventListener('keydown', (e: KeyboardEvent) => {
      // 日本語入力の変換確定のEnterで追加しないようにする。
      if (e.key !== 'Enter' || e.isComposing) return;
      this._addTypedIds();
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

  /**
   * 現在のvalue-viewを全削除してスナップショットを再挿入する。
   * 同じDOMノードを再利用するため、createより安全にコストを抑えられる。
   */
  restore(): void {
    this.conditionItemValueViews.forEach((view) => view.remove());
    this.valuesContainerEl.append(...this._lastValueViews);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /** 入力欄の値を区切り文字で分割してIDを追加し、次の入力のため入力欄を空にする。 */
  private _addTypedIds(): void {
    const ids = splitSearchTerms(this._searchFieldView.value);
    if (ids.length === 0) return;

    ids.forEach((id) => this.addValueView(id, id, false, true));
    this._update();
    this._searchFieldView.value = '';
  }

  /** バリデーション結果をOKボタンに反映する。IDが追加・削除されるたびに呼ぶ。 */
  private _update(): void {
    this.notifyValidity();
  }

  /** 削除イベントのvalue値でvalue-viewを削除してバリデーションを更新する。 */
  private _handleDeleteValue(e: CustomEvent<string>): void {
    e.stopPropagation();
    this.removeValueView(e.detail);
    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** value-viewが1件以上あればID入力済みと判断する。OKボタンの活性制御に使う。 */
  get isValid(): boolean {
    return this.valuesContainerEl.hasChildNodes();
  }
}
