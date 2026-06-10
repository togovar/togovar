import { createEl } from '../../../utils/dom/createEl';
import { selectRequired, selectOrNull } from '../../../utils/dom/select';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import type { ConditionTypeValue } from '../../../definition';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { EditorSectionClassName } from '../../../types';

type SectionChildren = ReadonlyArray<Node | string>;
type SectionContent =
  | string
  | DocumentFragment
  | SectionChildren
  | (() => SectionChildren);

export abstract class ConditionValueEditor {
  private _sectionEl: HTMLElement | null = null;

  constructor(
    private readonly _conditionValues: ConditionValues,
    private readonly _conditionItemView: ConditionItemView
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Creation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * エディタのDOM構造を sections 要素へ挿入し、_sectionEl にキャッシュする。
   * constructor で必ず1度呼ぶことで、getter が「確定済み」を前提に使える保証とするため。
   */
  protected createSectionEl(
    className: EditorSectionClassName,
    content: SectionContent
  ): HTMLElement {
    const sectionEl = createEl('section', {
      class: className,
      dataset: { conditionType: String(this.conditionType) },
    });

    if (typeof content === 'string') {
      sectionEl.innerHTML = content;
    } else {
      const list =
        typeof content === 'function'
          ? content()
          : content instanceof DocumentFragment
          ? [content]
          : content;

      const frag = document.createDocumentFragment();
      for (const n of list) {
        frag.append(n instanceof Node ? n : document.createTextNode(String(n)));
      }
      sectionEl.append(frag);
    }

    this._conditionValues.sections.append(sectionEl);
    this._sectionEl = sectionEl;
    return sectionEl;
  }

  /**
   * 重複追加を防ぐため既存のvalue-viewがあればラベルと値を上書きし、なければ新規生成する。
   * isOnly が true のときはセレクタなしで既存を上書きする（単一値条件向け）。
   */
  protected addValueView(
    value: string,
    label: string,
    isOnly = false,
    showDeleteButton = false
  ): ConditionItemValueView {
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = selectOrNull<ConditionItemValueView>(
      this.valuesContainerEl,
      `condition-item-value-view${selector}`
    );

    if (!valueView) {
      // HTMLElementTagNameMap の拡張が効いていれば、型は自動的に ConditionItemValueView
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this.conditionType;
      this.valuesContainerEl.append(valueView);
    }

    // 新規・既存どちらでも同じ引数で deleteButton を同期する。
    valueView.deleteButton = showDeleteButton;
    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /**
   * 値が空文字のときはセレクタなしで全件削除し、値がある場合は該当するものだけ削除する。
   * 呼び出し元が値の有無を気にせずに使えるよう2パターンをここで吸収するため。
   */
  protected removeValueView(value: string): void {
    if (value) {
      const view = selectOrNull<ConditionItemValueView>(
        this.valuesContainerEl,
        `condition-item-value-view[data-value="${value}"]`
      );
      if (view) view.remove();
    } else {
      this.valuesContainerEl
        .querySelectorAll<ConditionItemValueView>('condition-item-value-view')
        .forEach((view) => view.remove());
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** createSectionEl 実行前のアクセスはテンプレート崩れを示すため、即座にエラーとして検知する。 */
  protected get sectionEl(): HTMLElement {
    if (!this._sectionEl) throw new Error('not mounted yet');
    return this._sectionEl;
  }

  /**
   * エディタのメインコンテンツ領域。
   * createEl で .body クラスを持つ要素として必ず生成するため、selectRequired で確実に取得できる。
   */
  protected get bodyEl(): HTMLElement {
    return selectRequired<HTMLElement>(
      this.sectionEl,
      ':scope > .body',
      'ConditionValueEditor.bodyEl'
    );
  }

  /** サブクラスが親行（条件の種別・値コンテナ）へアクセスするための参照。コンストラクタ引数をそのまま返す。 */
  protected get conditionItemView(): ConditionItemView {
    return this._conditionItemView;
  }

  /** サブクラスがOKボタンの活性更新を依頼するための参照。コンストラクタ引数をそのまま返す。 */
  protected get conditionValues(): ConditionValues {
    return this._conditionValues;
  }

  /**
   * 親行の conditionType を委譲取得する。
   * エディタが独自にキャッシュすると親との不整合が起きるため、都度取得する。
   */
  protected get conditionType(): ConditionTypeValue {
    return this._conditionItemView.conditionType;
  }

  /**
   * 親行が持つ値コンテナを委譲取得する。
   * エディタが独自に参照を持つと挿入先がずれるリスクがあるため委譲する。
   */
  protected get valuesContainerEl(): HTMLDivElement {
    return this._conditionItemView.valuesContainerEl;
  }

  /**
   * 現在のDOMから生きている condition-item-value-view を一覧で返す。
   * isValid や keepLastValues で使用する。
   */
  protected get conditionItemValueViews(): ConditionItemValueView[] {
    return Array.from(
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
  }

  /** サブクラスごとの入力完了判定。OKボタンの活性制御に使う。 */
  abstract get isValid(): boolean;

  /**
   * OKボタンの活性状態を現在の isValid から更新する。
   * 全サブクラスの _update 末尾で呼ぶことで、同じ1行の重複をなくすため。
   */
  protected notifyValidity(): void {
    this.conditionValues.update(this.isValid);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Options handling (for karyotype selection, etc.)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * カリオタイプ選択など外部からの初期値注入を受け付けるフック。
   * デフォルトは何もしない。必要なサブクラスだけオーバーライドする。
   */
  applyOptions(_options: unknown): void {
    // Base implementation does nothing; subclasses can override
  }
}
