import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import SearchField from '../../../components/SearchField/SearchField';
import { createEl } from '../../../utils/dom/createEl';

/** Variant ID の複数入力エディタ。Enterキーで1件ずつIDを追加し削除ボタンで個別削除できる。 */
export class ConditionValueEditorVariantID extends ConditionValueEditor {
  private _searchFieldView!: SearchField;
  private _lastValueViews: ConditionItemValueView[] = [];

  /**
   * 検索フィールドUI生成・EnterキーでのID追加・削除イベントを登録する。
   * 削除イベントは valuesContainerEl に委譲することで、後から追加されたvalue-viewにも効く。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', { text: `Search for ${this.conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    this._searchFieldView = new SearchField(
      this.bodyEl as HTMLDivElement,
      'rs1489251879'
    );

    this._searchFieldView.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const id = this._searchFieldView.value;

        if (this._searchFieldView.value.trim().length > 0) {
          this.addValueView(id, id, false, true);
          this._update();
          this._searchFieldView.value = '';
        }
      }
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

  /** バリデーション結果をOKボタンに反映する。IDが追加・削除されるたびに呼ぶ。 */
  private _update(): void {
    this.conditionValues.update(this.isValid);
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
