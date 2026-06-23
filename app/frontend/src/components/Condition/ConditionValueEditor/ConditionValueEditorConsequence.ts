import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import { ADVANCED_CONDITION_TYPE } from '../../../advancedCondition';
import { createEl } from '../../../utils/dom/createEl';
import { selectRequired, selectOrNull } from '../../../utils/dom/select';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type {
  ConditionDefinition,
  ConsequenceNodeBase,
  TreeCondition,
} from '../../../types/conditionDefinition';

// _data の各要素は ConsequenceNodeBase にチェック状態フラグを付与した形。
type ColumnDatum = ConsequenceNodeBase & { checked: boolean };

/**
 * consequence など tree 型の条件種別を対象にしたカラムUIエディタ。
 *
 * 階層ツリーを macOS Finder のカラムビュー形式で表示し、
 * 親チェックで子孫を一括選択できる（consequence は連動あり）。
 *
 * NOTE: dataset は ConditionValueEditorDatasetColumns へ移管済みのため、
 *       このエディタは consequence 専用として扱う。
 */
export default class ConditionValueEditorConsequence extends ConditionValueEditor {
  private _data: ColumnDatum[] = [];
  private _lastValues: string[] = [];
  /** 親の選択変更を子孫に伝播させるかどうか。consequence だけ true。 */
  private readonly _selectionDependedOnParent: boolean;
  private _columns!: HTMLElement;

  /** データ準備と初期カラム描画までを生成直後に完了させ、エディタ生成直後から操作可能にするため。 */
  constructor(
    conditionValues: ConditionValues,
    conditionView: ConditionItemView
  ) {
    super(conditionValues, conditionView);

    this._data = this._prepareData();
    // consequence 以外に親連動が必要な条件種別は現状存在しないため、直接比較する。
    this._selectionDependedOnParent =
      this.conditionType === ADVANCED_CONDITION_TYPE.consequence;

    this.createSectionEl('columns-editor-view', () => [
      createEl('header', { class: 'section-header', text: `Select ${this.conditionType}` }),
      createEl('div', {
        class: 'section-content',
        children: [
          createEl('div', { class: 'columns' }),
          // CSS レイアウト上の空き領域として確保する（説明テキスト表示用）。
          createEl('div', { class: 'description' }),
        ],
      }),
    ]);

    // createSectionEl 実行後に bodyEl が確定するため、DOM参照の取得はここで行う。
    this._columns = selectRequired<HTMLElement>(
      this.bodyEl,
      ':scope > .columns',
      'ConditionValueEditorConsequence'
    );

    this._drawColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Cancelで元に戻せるよう現在の選択値スナップショットを保存する。 */
  keepLastValues(): void {
    this._lastValues = this._data
      .filter((datum) => datum.value && datum.checked)
      .map((datum) => datum.value as string);
  }

  /** 保存済みスナップショットに選択状態を巻き戻してUIを更新する。 */
  restore(): void {
    this._data.forEach(
      (datum) => (datum.checked = this._lastValues.includes(datum.value ?? ''))
    );
    this._update();
  }

  /** 選択済みの condition-item-value-view が1件以上あれば有効。OKボタンの活性制御に使う。 */
  get isValid(): boolean {
    return this.conditionItemValueViews.length > 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM construction
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 指定した親IDの子アイテムでカラムDOMを生成して追加する。
   * parentId が undefined のときはルートレベルを表示する（初回描画用）。
   */
  private _drawColumn(parentId?: number): void {
    const items = this._getItems(parentId);

    // depth は既存カラム数から算出し、削除対象の判定に使う。
    const depth = this._columns.querySelectorAll(':scope > .column').length;
    const column = createEl('div', {
      class: 'column',
      dataset: { depth: String(depth) },
    });
    this._columns.append(column);
    column.append(
      createEl('ul', {
        children: items.map((item) => this._createColumnItem(item)),
      })
    );

    // チェックボックス操作でデータを更新してUI全体を再同期する。
    for (const input of column.querySelectorAll<HTMLInputElement>(
      ':scope > ul > li > label > input'
    )) {
      input.addEventListener('change', (e) => {
        const li = (e.target as Element).closest('li');
        if (!li) return;
        const datum = this._data.find((d) => d.id === Number(li.dataset.id));
        if (!datum) return;
        datum.checked = input.checked;
        // 親連動が有効な場合は子孫にも checked を伝播させる。
        if (datum.children) this._updateChildren(datum.id, input.checked);
        this._update();
      });
    }

    // 矢印クリックで現在のカラム以降を削除し、次の階層カラムを描画する。
    for (const arrow of column.querySelectorAll<HTMLElement>(
      ':scope > ul > li > .arrow'
    )) {
      arrow.addEventListener('click', (e) => {
        const li = (e.target as Element).closest('li');
        if (!li) return;
        li.parentElement
          ?.querySelector(':scope > .-selected')
          ?.classList.remove('-selected');
        const currentDepth = parseInt(
          li.closest('.column')?.getAttribute('data-depth') ?? '0',
          10
        );
        // クリックした階層より深いカラムをすべて削除してドリルダウン先を表示する。
        for (const col of this._columns.querySelectorAll<HTMLElement>(
          ':scope > .column'
        )) {
          if (parseInt(col.dataset.depth ?? '0', 10) > currentDepth)
            col.remove();
        }
        li.classList.add('-selected');
        this._drawColumn(Number(arrow.dataset.id));
      });
      // tabindex 付与後もキーボード（Enter/Space）で操作できるようにする。
      arrow.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          arrow.click();
        }
      });
    }

    this._update();

    // 新カラム追加後にスクロールして、ユーザーが新しいカラムを見えるようにする。
    const left = this.bodyEl.scrollWidth - this.bodyEl.clientWidth;
    if (left > 0) {
      this.bodyEl.scrollTo({ top: 0, left, behavior: 'smooth' });
    }
  }

  /**
   * リスト1行分の <li> を createEl で生成する。
   * innerHTML を使わず createEl で組むことで XSS を防ぐ。
   * dataset-icon は dataset 専用のため consequence では含まない。
   */
  private _createColumnItem(item: ColumnDatum): HTMLLIElement {
    const dataset: Record<string, string> = { id: String(item.id) };
    if (item.value) dataset.value = item.value;
    if (item.parent !== undefined) dataset.parent = String(item.parent);

    const input = createEl('input', { attrs: { type: 'checkbox' } });
    const label = createEl('label', { children: [input, ' ', item.label] });

    const li = createEl('li', { dataset });
    li.append(label);

    // 子を持つ項目にのみ矢印を追加してドリルダウンを示す。
    // role/tabindex/aria-label を付与してキーボード・スクリーンリーダーでも操作可能にする。
    if (item.children !== undefined) {
      li.append(
        createEl('div', {
          class: 'arrow',
          attrs: {
            role: 'button',
            tabindex: '0',
            'aria-label': `Open ${item.label ?? 'children'}`,
          },
          dataset: { id: String(item.id) },
        })
      );
    }

    return li as HTMLLIElement;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Data helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * グローバル定義から conditionType に対応するツリー値を取り出し、
   * checked フラグを付与して内部データを初期化する。
   * tree 型でない条件種別（disease など）は空配列を返す。
   */
  private _prepareData(): ColumnDatum[] {
    const def = ADVANCED_CONDITIONS[this.conditionType] as
      | ConditionDefinition
      | undefined;
    if (!def || def.type !== 'tree') return [];
    return (def as TreeCondition).values.map((value) => ({
      ...value,
      checked: false,
    }));
  }

  /**
   * 指定した親IDで _data をフィルタして子アイテムを返す。
   * parentId が undefined のときは parent が未定義のルートアイテムを返す。
   */
  private _getItems(parentId?: number): ColumnDatum[] {
    return this._data.filter((datum) => datum.parent === parentId);
  }

  /**
   * 親連動選択が有効なとき、指定IDの子孫すべてに checked を伝播させる。
   * consequence カテゴリ選択で配下の variant を一括選択するために再帰する。
   */
  private _updateChildren(id: number, checked: boolean): void {
    if (!this._selectionDependedOnParent) return;
    const children = this._data.filter((datum) => datum.parent === id);
    children.forEach((child) => {
      child.checked = checked;
      this._updateChildren(child.id, checked);
    });
  }

  /**
   * 親チェックボックスの indeterminate 状態を再計算する。
   * 全子孫のチェック数を集計して、全選択/一部選択/未選択を判定する。
   * 戻り値は 0(未選択) / 1(中間) / 2(全選択) とし、多階層でも親が正しく集計できるようにする。
   */
  private _updateIndeterminate(): void {
    const checkLeaves = (datum: ColumnDatum): number => {
      if (!datum.children || datum.children.length === 0) return 0;

      let numberOfChecked = 0;
      datum.children.forEach((childId) => {
        const child = this._data.find((d) => d.id === childId);
        if (!child) return;
        // 非リーフは再帰集計(0/1/2)、リーフは unchecked=0 / checked=2 で加算する。
        // 1(中間) と 2(全選択) を区別することで、親が全選択かどうかを正しく判定できる。
        numberOfChecked += child.children
          ? checkLeaves(child)
          : child.checked
            ? 2
            : 0;
      });

      const maxChecked = datum.children.length * 2;
      let checked: boolean;
      let indeterminate: boolean;
      if (numberOfChecked === 0) {
        checked = false;
        indeterminate = false;
      } else if (numberOfChecked === maxChecked) {
        checked = true;
        indeterminate = false;
      } else {
        checked = false;
        indeterminate = true;
      }

      const checkbox = selectOrNull<HTMLInputElement>(
        this._columns,
        `li[data-id="${datum.id}"] > label > input`
      );
      if (checkbox) {
        checkbox.checked = checked;
        checkbox.indeterminate = indeterminate;
      }
      return checked ? 2 : indeterminate ? 1 : 0;
    };

    // ルートレベルのノードから下位へ再帰する。
    this._data
      .filter((datum) => datum.parent === undefined)
      .forEach((datum) => checkLeaves(datum));
  }

  /**
   * チェック状態を DOM と condition-item-value-view に同期し、バリデーションを更新する。
   * _data を正本として DOM はそこから派生させる（DOM を正本にすると非同期更新でズレが生じるため）。
   */
  private _update(): void {
    // _data の checked を DOM のチェックボックスへ反映する。
    this._data.forEach((datum) => {
      const checkbox = selectOrNull<HTMLInputElement>(
        this._columns,
        `li[data-id="${datum.id}"] > label > input`
      );
      if (checkbox) checkbox.checked = datum.checked;
    });

    this._updateIndeterminate();

    // value を持つ項目のみ condition-item-value-view に追加・削除する。
    this._data.forEach((datum) => {
      if (!datum.value) return;
      if (datum.checked) {
        this.addValueView(datum.value, datum.label);
      } else {
        this.removeValueView(datum.value);
      }
    });

    this.notifyValidity();
  }
}
