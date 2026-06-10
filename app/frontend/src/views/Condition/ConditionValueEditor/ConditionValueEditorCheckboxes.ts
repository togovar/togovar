import { createEl } from '../../../utils/dom/createEl';
import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';

/**
 * フラット列挙型条件（Variant type など）向けのチェックボックスエディタ。
 * ADVANCED_CONDITIONS.type のフラット values をそのままチェックボックスとして描画し、
 * condition-item-value-view と同期する。
 *
 * 前提:
 * - ADVANCED_CONDITIONS[this.conditionType] はフラット列挙定義（values が {value, label}[] の配列）
 * - MGeND/ClinVar 分割が必要な clinical significance は別エディタクラスを使う
 */
export class ConditionValueEditorCheckboxes extends ConditionValueEditor {
  private _checkboxes: HTMLInputElement[] = [];
  private _lastValues: string[] = [];

  /**
   * チェックボックスのDOM生成・参照キャッシュ・イベント登録を1箇所にまとめる。
   * createSectionEl 実行後に参照を取得することで、DOM確定前の取得ミスを防ぐ。
   */
  constructor(
    conditionValues: ConditionValues,
    conditionView: ConditionItemView
  ) {
    super(conditionValues, conditionView);

    const master = ADVANCED_CONDITIONS.type;
    if (!master) {
      throw new Error('type condition not found');
    }

    this.createSectionEl('checkboxes-editor-view', () => [
      createEl('header', { text: `Select ${this.conditionType}` }),

      createEl('div', {
        class: 'buttons',
        children: [
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Select all',
          }),
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Clear all',
          }),
        ],
      }),

      createEl('ul', {
        class: ['checkboxes', 'body'],
        children: master.values.map((item) =>
          createEl('li', {
            dataset: { value: item.value },
            children: [
              createEl('label', {
                children: [
                  createEl('input', {
                    attrs: { type: 'checkbox' },
                    domProps: { value: item.value },
                    dataset: { label: item.label },
                  }),
                  ' ',
                  item.label,
                ],
              }),
            ],
          })
        ),
      }),
    ]);

    // createSectionEl 実行後に参照を確定させることで、未挿入のDOMへのアクセスを防ぐ。
    this._checkboxes = Array.from(
      this.sectionEl.querySelectorAll<HTMLInputElement>(
        ':scope > ul > li > label > input[type="checkbox"]'
      )
    );

    this._checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this._update());
    });

    this.sectionEl
      .querySelectorAll<HTMLButtonElement>(':scope > .buttons > button')
      .forEach((button, index) => {
        button.addEventListener('click', () => {
          // index: 0 => Select all, 1 => Clear all
          const checked = index === 0;
          this._checkboxes.forEach((cb) => (cb.checked = checked));
          this._update();
        });
      });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Cancel時に戻す基準として、DOM上のvalue-viewから現在の値を保存する。 */
  keepLastValues(): void {
    const views = Array.from(
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
    this._lastValues = views.map((v) => v.value);
  }

  /** 保存済みスナップショットにチェック状態を巻き戻してUIを更新する。 */
  restore(): void {
    this._checkboxes.forEach((checkbox) => {
      checkbox.checked = this._lastValues.includes(checkbox.value);
    });
    this._update();
  }

  /** 1件以上チェックがあればOK可能とする。全解除のままOKを押せないようにするため。 */
  get isValid(): boolean {
    return this._checkboxes.some((checkbox) => checkbox.checked);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * チェック状態をvalue-viewに反映しOKボタンの活性を更新する。
   * DOMとデータを常に同期させるため毎回全件走査する。
   */
  private _update(): void {
    this._checkboxes.forEach((checkbox) => {
      const label = checkbox.dataset.label ?? checkbox.value;
      if (checkbox.checked) {
        this.addValueView(checkbox.value, label);
      } else {
        this.removeValueView(checkbox.value);
      }
    });

    this.notifyValidity();
  }
}
