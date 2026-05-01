import {
  getColumnLabel,
  LOCKED_COLUMN_ID,
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

const LONG_PRESS_MS = 150;
const DRAG_START_MOVE_THRESHOLD_PX = 6;

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
  private _draggingElement: HTMLElement | null = null;
  private _ghostElement: HTMLElement | null = null;
  private _draggingCursorStyleEl: HTMLStyleElement | null = null;
  private _clearPendingLongPress: (() => void) | null = null;
  private _cleanupDragListeners: (() => void) | null = null;
  private readonly _eventAbortController = new AbortController();
  private readonly _boundDocumentClick: (_event: MouseEvent) => void;
  private readonly _boundDocumentKeydown: (_event: KeyboardEvent) => void;

  constructor(root: HTMLElement) {
    this._root = root;
    this._button = root.querySelector(SELECTORS.BUTTON) as HTMLButtonElement;
    this._menu = root.querySelector(SELECTORS.MENU) as HTMLElement;
    this._list = root.querySelector(SELECTORS.LIST) as HTMLElement;
    this._boundDocumentClick = this._handleDocumentClick.bind(this);
    this._boundDocumentKeydown = this._handleDocumentKeydown.bind(this);

    this._toggle(false);
    this._bindEvents();
    storeManager.bind('columns', this);
    this.columns(storeManager.getData('columns'));
  }

  /**
   * インスタンスを破棄（イベントリスナー削除、store バインド解除）
   */
  destroy(): void {
    storeManager.unbind('columns', this);
    this._clearPendingLongPress?.();
    this._eventAbortController.abort();
    this._cleanupDragListeners?.();
    this._clearDragState();
  }

  /**
   * 列設定を受け取り、UI を再描画
   * - store.columns から呼ばれる（監視コールバック）
   * - 固定列制約を適用（TogoVar ID は常に先頭）
   * @param columns 列設定配列
   */
  columns(columns: ColumnConfig[]): void {
    this._render(normalizeColumnConfigs(columns));
  }

  /**
   * 全イベントリスナーをセットアップ
   * - ボタンクリック：ドロップダウン開閉
   * - チェックボックス change：列表示/非表示制御
   * - mousedown on drag-handle：列の並び替え（mousemove/mouseup ベース）
   * - ドキュメントクリック/キー：ドロップダウン自動クローズ
   */
  private _bindEvents(): void {
    const { signal } = this._eventAbortController;

    // ボタンクリック：ドロップダウンメニューの開閉
    this._button.addEventListener('click', () => {
      this._toggle();
    }, { signal });

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

      const nextColumns = normalizeColumnConfigs(
        storeManager.getData('columns')
      );
      const targetColumn = nextColumns.find(
        (column) => column.id === target.value
      );

      if (!targetColumn) {
        return;
      }

      targetColumn.isUsed = target.checked;
      storeManager.setData('columns', nextColumns);
    }, { signal });

    // mousedown：checkbox 以外のエリアは長押しでドラッグ開始
    // checkbox は通常クリックで表示/非表示切り替えを維持する
    this._list.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      // checkbox 自体は既存のクリック挙動を優先
      if (target.closest(SELECTORS.INPUT)) {
        return;
      }

      const item = target.closest(SELECTORS.ITEM) as HTMLElement | null;
      if (!item || item.dataset.columnId === LOCKED_COLUMN_ID) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      let longPressTimer: number | null = null;
      this._clearPendingLongPress?.();
      const pendingAbortController = new AbortController();

      const clearLongPressWatchers = (): void => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        pendingAbortController.abort();
        if (this._clearPendingLongPress === clearLongPressWatchers) {
          this._clearPendingLongPress = null;
        }
      };

      // 長押し前に大きく動いたら通常クリック扱いに戻す
      function onPendingMove(e: MouseEvent): void {
        const movedX = e.clientX - startX;
        const movedY = e.clientY - startY;
        if (Math.hypot(movedX, movedY) > DRAG_START_MOVE_THRESHOLD_PX) {
          clearLongPressWatchers();
        }
      }

      // 長押し時間に達する前に離した場合はドラッグしない
      function onPendingMouseUp(): void {
        clearLongPressWatchers();
      }

      const startDrag = (): void => {
        clearLongPressWatchers();
        this._beginDrag(item, startX, startY);
      };

      this._clearPendingLongPress = clearLongPressWatchers;
      longPressTimer = window.setTimeout(startDrag, LONG_PRESS_MS);
      document.addEventListener('mousemove', onPendingMove, {
        signal: pendingAbortController.signal,
      });
      document.addEventListener('mouseup', onPendingMouseUp, {
        signal: pendingAbortController.signal,
      });
    }, { signal });

    // ドキュメントクリック：範囲外クリックでドロップダウンを閉じる
    document.addEventListener('click', this._boundDocumentClick, { signal });
    // Escape キー：ドロップダウンを閉じる
    document.addEventListener('keydown', this._boundDocumentKeydown, {
      signal,
    });
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
          <li class="columns-dropdown-item${isLocked ? ' -locked' : ''}" data-column-id="${column.id}">
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
   * - ドラッグ終了時に呼ばれる
   * - 表示/非表示状態は保持
   * - 固定列制約を再度適用（安全性確保）
   */
  private _commitCurrentOrder(): void {
    const currentColumns = normalizeColumnConfigs(
      storeManager.getData('columns')
    );
    const columnMap = new Map(
      currentColumns.map((column) => [column.id, column])
    );

    // DOM の現在の並び順から新しい列設定を作成
    const domItems = Array.from(
      this._list.querySelectorAll(SELECTORS.ITEM)
    ) as HTMLElement[];
    const nextColumns = domItems
      .map((item) => columnMap.get(item.dataset.columnId ?? ''))
      .filter((column): column is ColumnConfig => column !== undefined);

    storeManager.setData(
      'columns',
      normalizeColumnConfigs(nextColumns)
    );
  }

  /**
   * 実ドラッグ処理を開始
   * - カーソル固定
   * - ゴースト作成
   * - mousemove/mouseup 監視登録
   */
  private _beginDrag(
    item: HTMLElement,
    startClientX: number,
    startClientY: number
  ): void {
    this._draggingElement = item;
    this._list.classList.add('-is-dragging');
    this._enableGlobalDraggingCursor();
    item.classList.add('-dragging-hidden');

    // ゴースト要素を生成してカーソルに追従させる
    const ghost = item.cloneNode(true) as HTMLElement;
    const itemRect = item.getBoundingClientRect();
    ghost.classList.add('-drag-ghost');
    ghost.style.cssText = `
      position: fixed;
      top: ${itemRect.top}px;
      left: ${itemRect.left}px;
      width: ${itemRect.width}px;
      pointer-events: none;
      opacity: 1;
      z-index: 10500;
      margin: 0;
      list-style: none;
      padding-left: 0;
    `;
    document.body.appendChild(ghost);
    this._ghostElement = ghost;

    // マウス位置とアイテム左上の差分（ドラッグ中にオフセットを保つ）
    const offsetX = startClientX - itemRect.left;
    const offsetY = startClientY - itemRect.top;

    const onMouseMove = (e: MouseEvent): void => {
      if (!this._draggingElement) {
        return;
      }

      // ゴーストをカーソルに追従
      if (this._ghostElement) {
        this._ghostElement.style.left = `${e.clientX - offsetX}px`;
        this._ghostElement.style.top = `${e.clientY - offsetY}px`;
      }

      const target = (e.target as HTMLElement | null)?.closest(
        SELECTORS.ITEM
      ) as HTMLElement | null;

      if (!target || target === this._draggingElement) {
        return;
      }

      const isTargetLocked = target.dataset.columnId === LOCKED_COLUMN_ID;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = isTargetLocked
        ? true
        : e.clientY > rect.top + rect.height / 2;

      // FLIP：移動前の各アイテムの Y 座標を記録
      const items = Array.from(
        this._list.querySelectorAll(SELECTORS.ITEM)
      ) as HTMLElement[];
      const beforeTops = new Map(
        items.map((el) => [el, el.getBoundingClientRect().top])
      );

      // DOM を並び替え
      if (shouldInsertAfter) {
        target.after(this._draggingElement);
      } else {
        target.before(this._draggingElement);
      }

      // FLIP：移動後の差分を transform で補正し、transition でアニメーション
      items.forEach((el) => {
        if (el === this._draggingElement) return;
        const delta =
          (beforeTops.get(el) ?? 0) - el.getBoundingClientRect().top;
        if (delta === 0) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.15s ease';
          el.style.transform = '';
        });
      });
    };

    const dragAbortController = new AbortController();
    const cleanupDragListeners = (): void => {
      dragAbortController.abort();
      if (this._cleanupDragListeners === cleanupDragListeners) {
        this._cleanupDragListeners = null;
      }
    };

    const onMouseUp = (): void => {
      cleanupDragListeners();
      this._commitCurrentOrder();
      this._clearDragState();
    };

    this._cleanupDragListeners = cleanupDragListeners;
    document.addEventListener('mousemove', onMouseMove, {
      signal: dragAbortController.signal,
    });
    document.addEventListener('mouseup', onMouseUp, {
      signal: dragAbortController.signal,
    });
  }

  /**
   * ドラッグ状態をリセット
   * - ドラッグ中の CSS クラス（-dragging-hidden, -is-dragging）を全て削除
   * - 内部状態変数を初期化
   */
  private _clearDragState(): void {
    this._draggingElement = null;
    this._disableGlobalDraggingCursor();

    // ゴースト要素を削除
    if (this._ghostElement) {
      this._ghostElement.remove();
      this._ghostElement = null;
    }

    this._list.classList.remove('-is-dragging');
    this._list.querySelectorAll(SELECTORS.ITEM).forEach((element) => {
      const el = element as HTMLElement;
      el.classList.remove('-dragging-hidden');
      el.style.transform = '';
      el.style.transition = '';
    });
  }

  /** ドラッグ中のみ全体カーソルを grabbing に固定 */
  private _enableGlobalDraggingCursor(): void {
    if (this._draggingCursorStyleEl) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.textContent =
      'html, body, body * { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }';
    document.head.appendChild(styleEl);
    this._draggingCursorStyleEl = styleEl;
  }

  /** ドラッグ終了後に全体カーソル固定を解除 */
  private _disableGlobalDraggingCursor(): void {
    if (!this._draggingCursorStyleEl) {
      return;
    }

    this._draggingCursorStyleEl.remove();
    this._draggingCursorStyleEl = null;
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
    this._menu.hidden = !shouldOpen;
    this._menu.setAttribute('aria-hidden', String(!shouldOpen));

    if (shouldOpen) {
      this._menu.removeAttribute('inert');
    } else {
      this._menu.setAttribute('inert', '');
    }
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
}
