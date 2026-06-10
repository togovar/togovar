import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionDiseaseSearch } from '../ConditionDiseaseSearch/ConditionDiseaseSearch.js';
import { createEl } from '../../../utils/dom/createEl';

interface DiseaseData {
  id: string | null;
  label: string | null;
}

interface DiseaseSelectionEventDetail {
  id: string;
  label: string;
}

/** 疾患検索UIのエディタ。disease-search コンポーネントと連携して疾患を1件選択する。 */
export class ConditionValueEditorDisease extends ConditionValueEditor {
  private _data: DiseaseData = { id: null, label: null };
  private _lastValues: DiseaseData = { id: null, label: null };
  private _conditionElem!: ConditionDiseaseSearch;

  /**
   * DOM生成・検索UIの配置・イベント登録をまとめる。
   * DOMを確定させてからイベントを登録することで、参照未取得のままリスナーが動くミスを防ぐ。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._initializeElements();
    this._setupEventListeners();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  /** セクションDOMを生成し、disease-search コンポーネントを body 要素へ配置する。 */
  private _initializeElements(): void {
    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', { text: `Select ${this.conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    this._conditionElem =
      this.bodyEl.querySelector('condition-disease-search') ||
      new ConditionDiseaseSearch(this.bodyEl);
  }

  /** disease-selected イベントで選択・解除を処理するリスナーを登録する。 */
  private _setupEventListeners(): void {
    this._conditionElem.addEventListener('disease-selected', (e: Event) => {
      this._handleDiseaseSelection(e);
    });
  }

  /**
   * カスタムイベントの detail に id があれば選択、なければ解除と判定する。
   * id の有無で2パターンを統一ハンドラで処理することで、登録イベント数を最小化するため。
   */
  private _handleDiseaseSelection(e: Event): void {
    e.stopPropagation();
    const customEvent = e as CustomEvent<DiseaseSelectionEventDetail>;
    const { id, label } = customEvent.detail;

    if (id) {
      this._selectDisease({ id, label });
    } else {
      this._clearSelection();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Cancel時に戻す基準として現在の _data スナップショットを保存する。 */
  keepLastValues(): void {
    this._lastValues = { ...this._data };
  }

  /** 保存済み _lastValues をvalue-viewに反映して編集前の状態に戻す。 */
  restore(): void {
    this._data = { ...this._lastValues };

    if (this._lastValues.id && this._lastValues.label) {
      this.addValueView(this._lastValues.id, this._lastValues.label, true);
    }

    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /** _data を更新してvalue-viewを上書き追加し、バリデーションを更新する。 */
  private _selectDisease(diseaseData: DiseaseData): void {
    this._data = { ...diseaseData };

    if (this._data.id && this._data.label) {
      this.addValueView(this._data.id, this._data.label, true);
    }

    this._update();
  }

  /** 選択を解除してvalue-viewを削除し、_data を空に戻す。 */
  private _clearSelection(): void {
    if (this._data.id) {
      this.removeValueView(this._data.id);
    }
    this._data = { id: null, label: null };
    this._update();
  }

  /** バリデーション結果をOKボタンへ反映する。値が確定するたびに呼ぶ。 */
  private _update(): void {
    this.notifyValidity();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** id が null でなければ疾患が選択済みと判断する。 */
  get isValid(): boolean {
    return !!this._data.id;
  }
}
