import {
  getColumnLabel,
  getDefaultColumnConfigs,
  normalizeColumnConfigs,
} from '../../global';
import { storeManager } from '../../store/StoreManager';
import type { ColumnConfig } from '../../types';

/** 列ドロップダウンの HTML セレクタマップ */
const SELECTORS = {
  BUTTON: '.columns-dropdown-button',
  MENU: '.columns-dropdown-menu',
  LIST: '.columns-dropdown-list',
  ITEM: '.columns-dropdown-item',
  INPUT: 'input[type="checkbox"]',
} as const;

/** 常に先頭に固定される列の ID（TogoVar ID） */
const LOCKED_COLUMN_ID = 'togovar_id';

/**
 * 検索結果テーブルの列表示/非表示・ドラッグ並び替え機能を提供するドロップダウン
 *
 * 機能：
 * - チェックボックスで列の表示/非表示を制御
 * - ドラッグ&ドロップで列の順序を並び替え
 * - TogoVar ID 列は常に先頭に固定（ドラッグ禁止、チェック常時有効）
 * - UI 操作が store.columns に自動反映
 */
export class ResultsColumnsDropdown {
  private readonly _root: HTMLElement;
  private readonly _button: HTMLButtonElement;
  private readonly _menu: HTMLElement;
  private readonly _list: HTMLElement;
  private _draggingColumnId: string | null = null;
  private _draggingElement: HTMLElement | null = null;
  private _dropCommitted = false;
  private readonly _boundDocumentClick: (_event: MouseEvent) => void;
  private readonly _boundDocumentKeydown: (_event: KeyboardEvent) => void;

  constructor(root: HTMLElement) {
    this._root = root;
    this._button = root.querySelector(SELECTORS.BUTTON) as HTMLButtonElement;
    this._menu = root.querySelector(SELECTORS.MENU) as HTMLElement;
    this._list = root.querySelector(SELECTORS.LIST) as HTMLElement;
    this._boundDocumentClick = this._handleDocumentClick.bind(this);
    this._boundDocumentKeydown = this._handleDocumentKeydown.bind(this);

    this._bindEvents();
    storeManager.bind('columns', this);
    this.columns(storeManager.getData('columns'));
  }

  /**
   * インスタンスを破棄（イベントリスナー削除、store バインド解除）
   */
  destroy(): void {
    storeManager.unbind('columns', this);
    document.removeEventListener('click', this._boundDocumentClick);
    document.removeEventListener('keydown', this._boundDocumentKeydown);
  }

  /**
   * 列設定を受け取り、UI を再描画
   * - store.columns から呼ばれる（監視コールバック）
   * - 固定列制約を適用（TogoVar ID は常に先頭）
   * @param columns 列設定配列
   */
  columns(columns: ColumnConfig[]): void {
    const normalizedColumns = normalizeColumnConfigs(columns);
    const constrainedColumns = this._applyLockedColumnConstraints(
      normalizedColumns.length > 0 ? normalizedColumns : getDefaultColumnConfigs()
    );
    this._render(constrainedColumns);
  }

  /**
   * 全イベントリスナーをセットアップ
   * - ボタンクリック：ドロップダウン開閉
   * - チェックボックス change：列表示/非表示制御
   * - ドラッグ系イベント：列の並び替え（FLIP アニメーション付き）
   * - ドキュメントクリック/キー：ドロップダウン自動クローズ
   */
  private _bindEvents(): void {
    // ボタンクリック：ドロップダウンメニューの開閉
    this._button.addEventListener('click', () => {
      this._toggle();
    });

    // チェックボックス変更：列の表示/非表示を更新
    this._list.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target?.matches(SELECTORS.INPUT)) {
        return;
      }
      // 固定列（TogoVar ID）はチェック状態の変更を無視
      if (target.value === LOCKED_COLUMN_ID) {
        return;
      }

      const nextColumns = this._applyLockedColumnConstraints(
        normalizeColumnConfigs(storeManager.getData('columns'))
      );
      const targetColumn = nextColumns.find((column) => column.id === target.value);

      if (!targetColumn) {
        return;
      }

      targetColumn.isUsed = target.checked;
      storeManager.setData(
        'columns',
        this._applyLockedColumnConstraints(nextColumns)
      );
    });

    // dragstart：ドラッグ開始
    // 固定列（TogoVar ID）の場合はドラッグを禁止
    this._list.addEventListener('dragstart', (event) => {
      const target = (event.target as HTMLElement | null)?.closest(
        SELECTORS.ITEM
      ) as HTMLElement | null;

      if (!target) {
        return;
      }

      this._draggingColumnId = target.dataset.columnId || null;
      if (!this._draggingColumnId || this._draggingColumnId === LOCKED_COLUMN_ID) {
        event.preventDefault();
        return;
      }

      this._draggingElement = target;
      this._dropCommitted = false;
      this._list.classList.add('-is-dragging');
      target.classList.add('-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    });

    // dragover：ドラッグ中に他要素上へのマウス移動を処理
    // FLIP（First, Last, Invert, Play）パターンで移動アニメーション
    this._list.addEventListener('dragover', (event) => {
      const target = (event.target as HTMLElement | null)?.closest(
        SELECTORS.ITEM
      ) as HTMLElement | null;

      if (!target || !this._draggingColumnId || !this._draggingElement) {
        return;
      }

      event.preventDefault();

      if (target === this._draggingElement) {
        return;
      }

      // ドラッグ前の各要素の垂直位置を記録（First）
      const previousTops = this._captureItemTops();

      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
      const isTargetLocked =
        (target as HTMLElement).dataset.columnId === LOCKED_COLUMN_ID;

      // 固定列より前には挿入しない
      const referenceNode = isTargetLocked
        ? target.nextElementSibling
        : shouldInsertAfter
        ? target.nextElementSibling
        : target;

      // DOM 順序を変更（Last の前に記録）
      if (referenceNode !== this._draggingElement) {
        this._list.insertBefore(
          this._draggingElement,
          referenceNode as ChildNode | null
        );
        // 変更後の位置から差分を計算してアニメーション実行
        this._animateReorder(previousTops);
      }
    });

    // drop：ドラッグ終了、ドロップ位置で確定
    this._list.addEventListener('drop', (event) => {
      if (!this._draggingColumnId) {
        return;
      }

      event.preventDefault();

      // 新しい順序を store に保存
      this._commitCurrentOrder();
      this._dropCommitted = true;
      this._clearDragState();
    });

    // dragend：ドラッグ中止時は UI をリセット
    this._list.addEventListener('dragend', () => {
      if (!this._dropCommitted) {
        // drop されなかった場合は元の順序に戻す
        this.columns(storeManager.getData('columns'));
      }
      this._clearDragState();
    });

    // ドキュメントクリック：範囲外クリックでドロップダウンを閉じる
    document.addEventListener('click', this._boundDocumentClick);
    // Escape キー：ドロップダウンを閉じる
    document.addEventListener('keydown', this._boundDocumentKeydown);
  }

  /**
   * 列リストを HTML にレンダリング
   * - 固定列（TogoVar ID）は draggable="false"・チェック常時有効・鍵アイコン表示
   * - その他の列はドラッグハンドル表示（FontAwesome グリップアイコン）
   * @param columns レンダリング対象の列設定配列
   */
  private _render(columns: ColumnConfig[]): void {
    this._list.innerHTML = columns
      .map((column) => {
        const isLocked = column.id === LOCKED_COLUMN_ID;
        return `
          <li class="columns-dropdown-item${isLocked ? ' -locked' : ''}" data-column-id="${column.id}" draggable="${isLocked ? 'false' : 'true'}">
            <span class="drag-handle" aria-hidden="true"></span>
            <label>
              <input type="checkbox" value="${column.id}"${column.isUsed ? ' checked' : ''}${isLocked ? ' disabled' : ''}>
              <span>${getColumnLabel(column.id)}</span>
            </label>
            ${isLocked ? '<span class="lock" aria-hidden="true"></span>' : ''}
          </li>
        `;
      })
      .join('');
  }

  /**
   * 現在の DOM 上の列順を読み込み、store に保存
   * - ドロップ終了時に呼ばれる
   * - 表示/非表示状態は保持
   * - 固定列制約を再度適用（安全性確保）
   */
  private _commitCurrentOrder(): void {
    const currentColumns = normalizeColumnConfigs(storeManager.getData('columns'));
    const currentById = new Map(
      currentColumns.map((column) => [column.id, column])
    );

    // DOM 上の列順を読み込む
    const orderedIds = Array.from(
      this._list.querySelectorAll(SELECTORS.ITEM)
    )
      .map((element) => (element as HTMLElement).dataset.columnId || '')
      .filter((id) => id !== '');

    if (orderedIds.length === 0) {
      return;
    }

    // 新しい順序で列設定を再構成
    const nextColumns: ColumnConfig[] = orderedIds
      .map((id) => currentById.get(id))
      .filter((column): column is ColumnConfig => column !== undefined)
      .map((column) => ({ ...column }));

    // 欠落している列を追加
    currentColumns.forEach((column) => {
      if (!nextColumns.find((item) => item.id === column.id)) {
        nextColumns.push({ ...column });
      }
    });

    storeManager.setData(
      'columns',
      this._applyLockedColumnConstraints(nextColumns)
    );
  }

  /**
   * 固定列制約を適用（TogoVar ID は常に先頭・表示状態確定）
   * - TogoVar ID が存在しない場合は先頭に追加
   * - TogoVar ID が存在する場合は先頭に移動
   * - TogoVar ID の isUsed は常に true に強制
   * @param columns 制約適用対象の列設定配列
   * @returns 制約適用済みの列設定配列
   */
  private _applyLockedColumnConstraints(columns: ColumnConfig[]): ColumnConfig[] {
    const normalized = normalizeColumnConfigs(columns).map((column) => ({
      ...column,
      // 固定列は常に表示状態
      isUsed: column.id === LOCKED_COLUMN_ID ? true : column.isUsed,
    }));

    const lockedIndex = normalized.findIndex(
      (column) => column.id === LOCKED_COLUMN_ID
    );

    if (lockedIndex === -1) {
      // 固定列が存在しない場合は先頭に追加
      normalized.unshift({ id: LOCKED_COLUMN_ID, isUsed: true });
      return normalized;
    }

    // 固定列が先頭以外にある場合は先頭に移動
    const [locked] = normalized.splice(lockedIndex, 1);
    normalized.unshift({ ...locked, isUsed: true });
    return normalized;
  }

  /**
   * 各列要素の現在の垂直位置を記録（FLIP アニメーション用）
   * @returns 列 ID → 垂直位置の Map
   */
  private _captureItemTops(): Map<string, number> {
    const tops = new Map<string, number>();

    Array.from(this._list.querySelectorAll(SELECTORS.ITEM)).forEach((item) => {
      const element = item as HTMLElement;
      const id = element.dataset.columnId;
      if (!id) {
        return;
      }

      tops.set(id, element.getBoundingClientRect().top);
    });

    return tops;
  }

  /**
   * FLIP パターンで列の移動アニメーションを実行
   * - First: ドラッグ前の位置を記録（previousTops から）
   * - Last: 現在の位置を取得
   * - Invert: 差分を計算して translate で初期位置に戻す
   * - Play: transform を 0 に戻すアニメーションで滑らかに移動
   * @param previousTops ドラッグ前の各要素の垂直位置 Map
   */
  private _animateReorder(previousTops: Map<string, number>): void {
    const items = Array.from(this._list.querySelectorAll(SELECTORS.ITEM)) as HTMLElement[];

    // Invert：各要素の移動差分を計算
    items.forEach((item) => {
      if (item === this._draggingElement) {
        return;
      }

      const id = item.dataset.columnId;
      if (!id) {
        return;
      }

      const previousTop = previousTops.get(id);
      if (previousTop === undefined) {
        return;
      }

      // 変更前後の位置の差分でドラッグ前の位置に戻す
      const deltaY = previousTop - item.getBoundingClientRect().top;
      if (Math.abs(deltaY) < 1) {
        return;
      }

      item.style.transition = 'none';
      item.style.transform = `translateY(${deltaY}px)`;
    });

    // Play：アニメーションで元の位置（transform: none）に戻す
    requestAnimationFrame(() => {
      items.forEach((item) => {
        if (item === this._draggingElement || item.style.transform === '') {
          return;
        }

        item.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
        item.style.transform = '';

        const cleanup = () => {
          item.style.transition = '';
          item.removeEventListener('transitionend', cleanup);
        };

        item.addEventListener('transitionend', cleanup);
      });
    });
  }

  /**
   * ドロップダウンメニューの開閉を切り替え
   * - aria-expanded を自動更新（アクセシビリティ対応）
   * @param forceOpen 強制的に開く場合は true、クローズは false、省略時は toggle
   */
  private _toggle(forceOpen?: boolean): void {
    const shouldOpen = forceOpen ?? !this._root.classList.contains('-open');
    this._root.classList.toggle('-open', shouldOpen);
    this._button.setAttribute('aria-expanded', String(shouldOpen));
  }

  /**
   * ドキュメント上のクリック処理
   * - ドロップダウン範囲外がクリックされた場合、メニューを自動クローズ
   */
  private _handleDocumentClick(event: MouseEvent): void {
    if (this._root.contains(event.target as Node)) {
      return;
    }

    this._toggle(false);
  }

  /**
   * キーボード入力処理
   * - Escape キー：ドロップダウンメニューを閉じる
   */
  private _handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this._toggle(false);
    }
  }

  /**
   * ドラッグ状態をリセット
   * - ドラッグ中の CSS クラス(-dragging, -is-dragging)を全て削除
   * - 内部状態変数を初期化
   */
  private _clearDragState(): void {
    this._draggingColumnId = null;
    this._draggingElement = null;
    this._list.classList.remove('-is-dragging');
    this._list
      .querySelectorAll(`${SELECTORS.ITEM}.-dragging`)
      .forEach((element) => {
        element.classList.remove('-dragging');
      });
  }
}