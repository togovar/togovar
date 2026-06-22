import { createEl } from '../../../utils/dom/createEl';
import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import type {
  EnumerationItem,
  MutableSignificanceValues,
  SignificanceSource,
} from '../../../types';

const LABELS = {
  selectHeader: (t: string) => `Select ${t}`,
  selectAll: 'Select all',
  clearAll: 'Clear all',
  mgend: 'MGeND',
  clinvar: 'ClinVar',
} as const;

/**
 * Clinical significance 条件のエディタ。
 * MGeND と ClinVar の2バケットを独立したチェックボックスリストで描画し、
 * 選択状態をソース別に condition-item-value-view と同期する。
 */
export class ConditionValueEditorClinicalSignificance extends ConditionValueEditor {
  private _checkboxes: HTMLInputElement[] = [];
  private _values: MutableSignificanceValues = { mgend: [], clinvar: [] };
  private _lastValues: MutableSignificanceValues = { mgend: [], clinvar: [] };

  // ULコンテナを事前に生成してcreateSelectionEl呼び出し前に参照を確定させるためのキャッシュ。
  private _mgendUl?: HTMLUListElement;
  private _clinvarUl?: HTMLUListElement;

  /**
   * MGeND/ClinVar の2バケットを生成してイベントを登録する。
   * バケット別のUL参照をコンストラクタ内で確定させることで、
   * 後続の append が正しい要素へ向かうことを保証するため。
   */
  constructor(
    conditionValues: ConditionValues,
    conditionView: ConditionItemView
  ) {
    super(conditionValues, conditionView);

    const master = ADVANCED_CONDITIONS.significance;
    if (!master) {
      throw new Error('Missing condition definition: significance');
    }

    this.createSectionEl('clinical-significance-view', () => [
      createEl('header', { class: 'section-header', text: LABELS.selectHeader(this.conditionType) }),
      createEl('div', {
        class: 'buttons',
        children: [
          createEl('button', {
            class: ['button-view', '-weak'],
            text: LABELS.selectAll,
          }),
          createEl('button', {
            class: ['button-view', '-weak'],
            text: LABELS.clearAll,
          }),
        ],
      }),
      createEl('div', {
        class: ['dataset-title', 'mgend'],
        text: LABELS.mgend,
      }),
      (this._mgendUl = createEl('ul', {
        class: ['checkboxes', 'section-content'],
        dataset: { type: 'clinical-significance', source: 'mgend' },
      })),
      createEl('hr'),
      createEl('div', {
        class: ['dataset-title', 'clinvar'],
        text: LABELS.clinvar,
      }),
      (this._clinvarUl = createEl('ul', {
        class: ['checkboxes', 'section-content'],
        dataset: { type: 'clinical-significance', source: 'clinvar' },
      })),
    ]);

    const mgendVals = this._filterValues(master.values.mgend, 'mgend');
    const clinvarVals = this._filterValues(master.values.clinvar, 'clinvar');

    this._mgendUl!.append(
      ...this._generateCheckboxListNodes(mgendVals, 'mgend')
    );
    this._clinvarUl!.append(
      ...this._generateCheckboxListNodes(clinvarVals, 'clinvar')
    );

    // createSectionEl 実行後に参照を確定させることで、未挿入のDOMへのアクセスを防ぐ。
    this._checkboxes = Array.from(
      this.sectionEl.querySelectorAll<HTMLInputElement>(
        ':scope ul[data-type="clinical-significance"] input[type="checkbox"]'
      )
    );

    this._attachCheckboxEventsDelegated();
    this._attachButtonEvents();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cancel時に戻す基準として、DOM上のvalue-viewからソース別に値を収集して保存する。
   * ソースが混在しないようMGeND/ClinVar別に保存することで restore の精度を保つ。
   */
  keepLastValues(): void {
    const mgendNodes =
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view'
      );
    const clinvarNodes =
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view'
      );

    this._lastValues = {
      mgend: Array.from(mgendNodes, (v) => ({
        value: v.value,
        label: v.label,
      })),
      clinvar: Array.from(clinvarNodes, (v) => ({
        value: v.value,
        label: v.label,
      })),
    };
  }

  /** 保存済みスナップショットにチェック状態を巻き戻してUIを更新する。 */
  restore(): void {
    const has = (src: SignificanceSource, val: string) =>
      this._lastValues[src].some((x) => x.value === val);

    for (const cb of this._checkboxes) {
      const src = (cb.dataset.source as SignificanceSource) || 'mgend';
      cb.checked = has(src, cb.value);
    }
    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM build helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 1バケット分のLI要素を生成する。
   * source 属性を input と li の両方に付与することで、
   * イベント委譲時にDOM操作なしでソースを特定できるようにするため。
   */
  private _generateCheckboxListNodes(
    values: ReadonlyArray<EnumerationItem>,
    source: SignificanceSource
  ): HTMLLIElement[] {
    return values.map(({ value, label }) =>
      createEl('li', {
        dataset: { value, source },
        children: [
          createEl('label', {
            children: [
              createEl('input', {
                attrs: { type: 'checkbox' },
                dataset: { source, label },
                domProps: { value },
              }),
              createEl('span', {
                class: 'clinical-significance',
                dataset: { value },
              }),
              ' ',
              label,
            ],
          }),
        ],
      })
    );
  }

  /**
   * チェックボックスごとにリスナーを登録せず、section要素への委譲1件で処理する。
   * 後から追加されたDOMにも自動で効くようにするため委譲を採用する。
   */
  private _attachCheckboxEventsDelegated(): void {
    this.sectionEl.addEventListener('change', (e) => {
      const t = e.target as Element | null;
      if (!t || !(t instanceof HTMLInputElement)) return;
      if (!t.matches('input[type="checkbox"]')) return;
      this._update();
    });
  }

  /**
   * 全選択/全解除ボタンを index 0/1 で判別することで、
   * ラベル変更にも型付けなしで対応できるようにする。
   */
  private _attachButtonEvents(): void {
    const btns = this.sectionEl.querySelectorAll<HTMLButtonElement>(
      ':scope > .buttons > button'
    );
    btns.forEach((button, index) => {
      button.addEventListener('click', () => {
        const check = index === 0; // 0: select all, 1: clear all
        for (const cb of this._checkboxes) cb.checked = check;
        this._update();
      });
    });
  }

  /**
   * ClinVar の 'NC' をUIから除外するための前処理。
   * APIの仕様として NC（No criteria provided）はURLクエリに含めないため除外する。
   */
  private _filterValues(
    values: ReadonlyArray<EnumerationItem>,
    source: SignificanceSource
  ): EnumerationItem[] {
    if (this.conditionType === 'significance' && source === 'clinvar') {
      return values.filter((v) => v.value !== 'NC');
    }
    return Array.from(values);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // State & rendering
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * チェックボックスの状態から values を再構築し、ソース別にvalue-viewを再描画してOKボタンの活性を更新する。
   * _values をここで再構築することで、DOMとデータの整合を毎回保証する。
   */
  private _update(): void {
    this._values = { mgend: [], clinvar: [] };
    for (const cb of this._checkboxes) {
      if (!cb.checked) continue;
      const source = (cb.dataset.source as SignificanceSource) || 'mgend';
      const label = cb.dataset.label ?? cb.value;
      this._values[source].push({ value: cb.value, label });
    }

    this._renderSource('mgend', this._values.mgend);
    this._renderSource('clinvar', this._values.clinvar);

    this.notifyValidity();
  }

  /**
   * 1ソース分のvalue-viewをまとめて再描画する。
   * 既存チップを消してから新規追加することで、順序のズレや残留要素を防ぐ。
   */
  private _renderSource(
    source: SignificanceSource,
    values: Array<EnumerationItem>
  ): void {
    if (values.length === 0) {
      this._removeConditionWrapper(source);
      return;
    }

    const wrapper = this._ensureWrapperExists(source);

    wrapper
      .querySelectorAll<ConditionItemValueView>('condition-item-value-view')
      .forEach((v) => v.remove());

    for (const v of values) {
      const chip = document.createElement(
        'condition-item-value-view'
      ) as ConditionItemValueView;
      chip.conditionType = this.conditionType;
      chip.label = v.label;
      chip.value = v.value;
      wrapper.append(chip);
    }
  }

  /**
   * ソース用ラッパーが未挿入なら生成してDOMへ追加し、内側のcondition-wrapperを返す。
   * 値が0件のときは呼ばれないため、返す要素は常に有効な前提で使える。
   */
  private _ensureWrapperExists(source: SignificanceSource): HTMLElement {
    const wrapperClass = `${source}-wrapper`;
    const conditionWrapperClass = `${source}-condition-wrapper`;

    const outer =
      this.valuesContainerEl.querySelector<HTMLElement>(`.${wrapperClass}`) ??
      createEl('div', { class: wrapperClass });

    if (!outer.isConnected) {
      this.valuesContainerEl.append(outer);
    }

    const conditionWrapper =
      outer.querySelector<HTMLElement>(`.${conditionWrapperClass}`) ??
      createEl('div', { class: conditionWrapperClass });

    // 新規作成時はラベルと一緒に追加する。
    if (!conditionWrapper.isConnected) {
      const label = createEl('span', {
        class: source,
        text: source === 'mgend' ? LABELS.mgend : LABELS.clinvar,
      });
      outer.append(label, conditionWrapper);
    }

    return conditionWrapper;
  }

  /**
   * チェックが全解除されたとき、ソース見出しが残らないようラッパーごと削除する。
   * 空の "ClinVar" ヘッダーが表示されたままにならないようにするため。
   */
  private _removeConditionWrapper(source: SignificanceSource): void {
    const outer = this.valuesContainerEl.querySelector<HTMLElement>(
      `.${source}-wrapper`
    );
    if (outer) outer.remove();
  }

  /** 1件以上チェックがあればOK可能とする。全解除のままOKを押せないようにするため。 */
  public get isValid(): boolean {
    return this._checkboxes.some((cb) => cb.checked);
  }
}
