import type { HierarchyNode } from 'd3-hierarchy';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import { storeManager } from '../../../store/StoreManager';
import { fetchLoginStatus } from '../../../auth/authService';

import { DatasetTreeDataProcessor } from './dataset-columns/DatasetTreeDataProcessor';
import { DatasetColumnRenderer } from './dataset-columns/DatasetColumnRenderer';
import { DatasetColumnEventHandler } from './dataset-columns/DatasetColumnEventHandler';
import { DatasetCheckStateManager } from './dataset-columns/DatasetCheckStateManager';
import { DatasetValueViewManager } from './dataset-columns/DatasetValueViewManager';
import type { UiNode } from './dataset-columns/types';
import { createEl } from '../../../utils/dom/createEl';
import { selectRequired } from '../../../utils/dom/select';
import type { ConditionItemValueView } from '../ConditionItemValueView';

/**
 * dataset/genotype 条件をカラムビューで選択するエディタ。
 * 階層ツリーを macOS Finder 形式で表示し、認証が必要なデータセットの制御も行う。
 * 各責務を専用モジュールに委譲することで、このクラスはUI統合のみを担う。
 */
export class ConditionValueEditorDatasetColumns extends ConditionValueEditor {
  /** Cancel時に戻す基準として保存するvalue-viewのスナップショット。 */
  private _lastValueViews: ConditionItemValueView[] = [];

  /** 全データセットの階層ツリー。checked状態もここで管理する。 */
  private _data: HierarchyNode<UiNode>;

  /** カラムDOMを格納するコンテナ。_initializeUI で確定させる。 */
  private _columns: HTMLElement | null = null;

  /** value-view に表示する選択ノードのリスト。_processNodesToShowInValueView で更新する。 */
  private _nodesToShowInValueView: Array<HierarchyNode<UiNode>>;

  /**
   * URL復元直後は値表示だけが先に復元され、ツリーの checked 状態はまだ空になる。
   * ユーザーが操作する前に空選択で同期削除しないよう、ユーザー操作後だけ true にする。
   */
  private _hasUserChangedSelection = false;

  // ─────────────────────────────────────────────────────────────────────────
  // 専用モジュール — それぞれ独立した責務を担う
  // ─────────────────────────────────────────────────────────────────────────

  /** データ生成を委譲することで、このクラスがUI統合だけに集中できる。 */
  private _dataProcessor = new DatasetTreeDataProcessor();

  /**
   * DOM生成を委譲することで、HTMLの詳細をこのクラスから隠蔽する。
   * 乱数サフィックスで複数インスタンスが存在するときもID衝突を防ぐ。
   */
  private _renderer = new DatasetColumnRenderer(
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  /** イベント処理を委譲することで、チェック・ナビゲーションのロジックを分離する。 */
  private _eventHandler = new DatasetColumnEventHandler();

  /** 親子間の checked 伝播を委譲することで、ツリー状態管理を一箇所に集約する。 */
  private _checkStateManager = new DatasetCheckStateManager();

  /** 表示するvalue-viewの選定ロジックを委譲することで、最適化ルールを分離する。 */
  private _valueViewManager = new DatasetValueViewManager();

  /**
   * 階層データの準備・UI生成・ログイン状態待ちの初期描画を順に行う。
   * ログイン状態は非同期で確定するため、初期描画を _initializeWithLoginStatus に分離する。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._dataProcessor.prepareHierarchicalData(
      this.conditionType
    );
    this._nodesToShowInValueView = [];

    this._initializeUI();
    this._initializeWithLoginStatus();
  }

  /**
   * ログイン状態の取得を待ってから初期カラムを描画する。
   * 認証が必要なデータセットの表示制御がログイン状態に依存するため非同期で待つ。
   */
  private async _initializeWithLoginStatus(): Promise<void> {
    await fetchLoginStatus();
    this._renderInitialColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cancel時に戻す基準として現在のvalue-view一覧を保存する。
   * DOMノードごと保持することで、restore時に同じ要素を再挿入できる。
   */
  keepLastValues(): void {
    this._lastValueViews = this.conditionItemValueViews;
  }

  /**
   * 保存済みスナップショットにツリーの checked 状態を巻き戻してUIを更新する。
   * 子孫・祖先の状態も同時に再計算することで、部分選択（indeterminate）を正しく復元する。
   */
  restore(): void {
    this._dataProcessor.resetAllCheckStates(this._data);
    this._dataProcessor.restoreCheckedStates(
      this._data,
      this._lastValueViews,
      (node, checked) =>
        this._checkStateManager.updateChildrenCheckState(node, checked),
      (node, checked) =>
        this._checkStateManager.updateParentCheckState(node, checked)
    );
    this._updateUI();
  }

  /** value-viewが1件以上あればOK可能とする。全解除のままOKを押せないようにするため。 */
  get isValid(): boolean {
    return this.conditionItemValueViews.length > 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI Initialization
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * セクションDOMを生成して _columns 参照を確定させる。
   * selectRequired を使うことで、テンプレート崩れを即座に検出できる。
   */
  private _initializeUI(): void {
    this.createSectionEl('columns-editor-view', () => [
      createEl('header', { text: `Select ${this.conditionType}` }),
      createEl('div', {
        class: 'body',
        children: [createEl('div', { class: 'columns' })],
      }),
    ]);

    this._columns = selectRequired<HTMLDivElement>(
      this.bodyEl,
      ':scope > .columns',
      'ConditionValueEditorDatasetColumns._initializeUI'
    );
  }

  /**
   * ルートカテゴリをカラムとして描画する。
   * ログイン状態が確定した後に呼ぶことで、認証必要なデータセットの初期表示を正しく行う。
   */
  private _renderInitialColumn(): void {
    this._drawColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Column Rendering
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 指定した親ノードの子アイテムで新しいカラムを生成して追加する。
   * parentId が未指定のときはルートカテゴリを表示する（初回描画用）。
   * ログイン状態は引数で受け取ることで、非同期取得との二重実行を防ぐ。
   */
  private async _drawColumn(
    parentId?: string,
    userIsLoggedIn?: boolean
  ): Promise<void> {
    const loginStatus: boolean =
      userIsLoggedIn ?? storeManager.getData('isLogin');

    const childItems = await this._getChildItems(parentId);

    const newColumnElement = this._createColumnElement();
    if (!this._columns) throw new Error('Columns container not found');
    this._columns.append(newColumnElement);

    newColumnElement.append(this._generateColumnList(childItems, loginStatus));

    this._attachColumnEventListeners(newColumnElement, loginStatus);
    this._updateUI();
    this._scrollToRevealNewColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Generation (DatasetColumnRenderer へ委譲)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * カラム内のリスト要素を生成する。
   * conditionType を渡すことで、renderer がデータセット種別ごとの表示を制御できる。
   */
  private _generateColumnList(
    hierarchyItems: HierarchyNode<UiNode>[],
    userIsLoggedIn: boolean
  ): HTMLUListElement {
    return this._renderer.generateColumnList(
      hierarchyItems,
      userIsLoggedIn,
      this.conditionType
    );
  }

  /**
   * depth 属性付きのカラムDIV要素を生成する。
   * depth は削除対象の判定に使うため renderer 側で採番して付与する。
   */
  private _createColumnElement(): HTMLDivElement {
    if (!this._columns) throw new Error('Columns container not found');
    return this._renderer.createColumnElement(this._columns);
  }

  /**
   * JGAD など認証が必要なデータセットでログインを促すカラムを追加する。
   * 未ログイン時に矢印クリックされたタイミングで呼ぶことで、適切なタイミングで表示する。
   */
  private async _addLoginPromptColumn(): Promise<void> {
    if (!this._columns) throw new Error('columns not mounted');
    await this._renderer.addLoginPromptColumn(this._columns);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event Handling (DatasetColumnEventHandler へ委譲)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * カラム要素にチェックボックスと矢印のイベントリスナーを登録する。
   * コールバックを介して checked 更新と UI 更新を委譲することで、
   * イベントハンドラが内部状態に直接触れないよう境界を保つ。
   */
  private _attachColumnEventListeners(
    column: HTMLElement,
    userIsLoggedIn: boolean
  ): void {
    this._eventHandler.attachCheckboxEventListeners(
      column,
      this._data,
      (node, checked) =>
        this._checkStateManager.updateChildrenCheckState(node, checked),
      (node, checked) =>
        this._checkStateManager.updateParentCheckState(node, checked),
      () => {
        this._hasUserChangedSelection = true;
        this._updateUI();
      }
    );
    this._eventHandler.attachArrowClickEventListeners(
      column,
      userIsLoggedIn,
      (listItem, target, userIsLoggedIn) =>
        this._handleArrowClick(listItem, target, userIsLoggedIn)
    );
  }

  /**
   * 矢印クリックで選択中フラグを更新し、子カラムを描画する。
   * jga_wgs かつ未ログインの場合はログイン促進カラムを追加することで、
   * 認証制御とナビゲーション処理をここで一元化する。
   */
  private _handleArrowClick(
    listItem: Element,
    target: HTMLElement,
    userIsLoggedIn: boolean
  ): void {
    this._eventHandler.clearSelectionAndSubColumns(listItem);
    listItem.classList.add('-selected');
    this._drawColumn(target.dataset.id, userIsLoggedIn);

    if (target.dataset.value === 'jga_wgs' && !userIsLoggedIn) {
      this._addLoginPromptColumn();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // State & Rendering
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * チェックボックスのDOM状態・value-view・OKボタンをまとめて更新する。
   * チェック変更のたびに呼ぶことで、DOM・データ・バリデーションを常に同期させる。
   */
  private _updateUI(): void {
    if (this._columns) {
      this._checkStateManager.updateCheckboxStatesInDOM(
        this._columns,
        this._data
      );
    }
    this._syncValueViewsWithSelection();
    this.notifyValidity();
  }

  /**
   * 表示するvalue-viewのノードリストを再計算して _nodesToShowInValueView に保持する。
   * 選定ロジックを _valueViewManager に委譲することで、最適化ルールの変更を局所化する。
   */
  private _processNodesToShowInValueView(): void {
    this._nodesToShowInValueView = this._valueViewManager.getOptimalNodesToShow(
      this._data
    );
  }

  /**
   * 新カラム追加後に水平スクロールして最新カラムを見えるようにする。
   * ユーザーが手動スクロールしなくても新しいカラムに気づけるようにするため。
   */
  private _scrollToRevealNewColumn(): void {
    if (!this.bodyEl) return;
    const left = this.bodyEl.scrollWidth - this.bodyEl.clientWidth;
    if (left > 0) {
      this.bodyEl.scrollTo({
        top: 0,
        left: left,
        behavior: 'smooth',
      });
    }
  }

  /**
   * 指定した親ノードの子アイテムを返す。
   * parentId が未指定のときはルートの children を返すことで、初回描画と再描画を統一する。
   */
  private _getChildItems(parentId?: string): Promise<HierarchyNode<UiNode>[]> {
    return new Promise((resolve) => {
      if (!parentId) {
        resolve(this._data.children || []);
        return;
      }

      const parentNode = this._data.find((datum) => datum.data.id === parentId);
      resolve(parentNode?.children || []);
    });
  }

  /**
   * 現在の選択状態からvalue-viewを再同期する。
   * URL復元直後にユーザー操作なしで選択が空になるケースでは同期を跳ばすことで、
   * 復元済みのvalue-viewが誤って消えないようにする（_hasUserChangedSelection で制御）。
   */
  private _syncValueViewsWithSelection(): void {
    this._processNodesToShowInValueView();

    if (
      this._nodesToShowInValueView.length === 0 &&
      this.conditionItemValueViews.length > 0 &&
      !this._hasUserChangedSelection
    ) {
      return;
    }

    // 既存のvalue-viewをすべて削除してから最新の選択状態を反映する。
    this.conditionItemValueViews.forEach((view) => view.remove());

    for (const selectedNode of this._nodesToShowInValueView) {
      this.addValueView(
        selectedNode.data.value || '',
        this._valueViewManager.getLabelWithPath(selectedNode, this._data)
      );
    }
  }
}
