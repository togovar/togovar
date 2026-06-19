import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import SearchFieldWithSuggestions from '../../SearchField/suggestions/SearchFieldWithSuggestions';
import { API_URL } from '../../../global';
import { createEl } from '../../../utils/dom/createEl';

/** Gene Symbol のサジェスト検索UIエディタ。APIからサジェストを取得してgene IDへ変換する。 */
export class ConditionValueEditorGene extends ConditionValueEditor {
  private _searchFieldView!: SearchFieldWithSuggestions;
  private _value: string = '';
  private _label: string = '';
  private _lastValue: string = '';
  private _lastLabel: string = '';

  /**
   * 検索フィールドUIを生成してサジェスト選択イベントを登録する。
   * bodyEl に SearchFieldWithSuggestions をインスタンス化することで、
   * 内部コンポーネントが自身の挿入先を管理できる。
   */
  constructor(
    conditionValues: ConditionValues,
    conditionItemView: ConditionItemView
  ) {
    super(conditionValues, conditionItemView);

    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', { text: `Search for ${this.conditionType}` }),
      createEl('div', { class: 'section-content' }),
    ]);

    this._searchFieldView = new SearchFieldWithSuggestions(
      'BRCA2',
      `${API_URL}/api/search/${this.conditionType}`,
      'term',
      this.bodyEl,
      {
        valueMappings: {
          valueKey: 'id',
          labelKey: 'symbol',
          aliasOfKey: 'alias_of',
        },
      }
    );

    this._searchFieldView.addEventListener(
      'new-suggestion-selected',
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: number; label: string }>;
        this._handleSuggestSelect(customEvent);
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Cancel時に戻す基準として、DOM上のvalue-viewの値・ラベルを保存する。 */
  keepLastValues(): void {
    const valueView = this.valuesContainerEl.querySelector(
      'condition-item-value-view'
    ) as Element & { value?: string; label?: string };

    this._lastValue = valueView?.value || '';
    this._lastLabel = valueView?.label || '';
  }

  /** 保存済み値でvalue-viewを再追加して編集前の状態に戻す。 */
  restore(): void {
    this.addValueView(this._lastValue, this._lastLabel, true);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * サジェスト選択時にvalue-viewを上書きしてOKボタンの活性を更新する。
   * isOnly=true で既存value-viewを上書きすることで、遺伝子は常に1件だけ選択できるようにする。
   */
  private _handleSuggestSelect = (
    e: CustomEvent<{ id: number; label: string }>
  ): void => {
    this._value = String(e.detail.id);
    this._label = e.detail.label;
    this.addValueView(this._value, this._label, true, false);

    this.notifyValidity();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** value-viewが1件以上あれば選択済みと判断する。OKボタンの活性制御に使う。 */
  get isValid(): boolean {
    return this.conditionItemValueViews.length > 0;
  }
}
