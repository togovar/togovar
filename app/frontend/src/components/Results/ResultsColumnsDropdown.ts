import {
  getColumnLabel,
  LOCKED_COLUMN_ID,
  normalizeColumnConfigs,
} from '../../columns';
import { storeManager } from '../../store/StoreManager';
import type { ColumnConfig } from '../../types';
import type { StoreState } from '../../types/storeState';

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
const DRAG_REORDER_ANIMATION_MS = 80;
const HOVER_CLOSE_DELAY_MS = 120;

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
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly list: HTMLElement;
  private draggingElement: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private draggingCursorStyleEl: HTMLStyleElement | null = null;
  private clearPendingLongPress: (() => void) | null = null;
  private cleanupDragListeners: (() => void) | null = null;
  private suppressNextListClick = false;
  private hoverCloseTimer: number | null = null;
  private readonly eventAbortController = new AbortController();
  private readonly boundDocumentClick: (_event: MouseEvent) => void;
  private readonly boundDocumentKeydown: (_event: KeyboardEvent) => void;
  private readonly onColumns = (v: StoreState['columns']) => this.columns(v);

  constructor(root: HTMLElement) {
    this.root = root;
    this.button = root.querySelector(SELECTORS.BUTTON) as HTMLButtonElement;
    this.menu = root.querySelector(SELECTORS.MENU) as HTMLElement;
    this.list = root.querySelector(SELECTORS.LIST) as HTMLElement;
    this.boundDocumentClick = this.handleDocumentClick.bind(this);
    this.boundDocumentKeydown = this.handleDocumentKeydown.bind(this);

    this.toggle(false);
    this.bindEvents();
    storeManager.subscribe('columns', this.onColumns);
    this.columns(storeManager.getData('columns'));
  }

  /**
   * インスタンスを破棄（イベントリスナー削除、store バインド解除）
   */
  destroy(): void {
    storeManager.unsubscribe('columns', this.onColumns);
    this.clearPendingLongPress?.();
    this.cancelHoverClose();
    this.eventAbortController.abort();
    this.cleanupDragListeners?.();
    this.suppressNextListClick = false;
    this.clearDragState();
  }

  /**
   * 列設定を受け取り、UI を再描画
   */
  columns(columns: ColumnConfig[]): void {
    this.render(normalizeColumnConfigs(columns));
  }

  /**
   * 全イベントリスナーをセットアップ
   */
  private bindEvents(): void {
    const { signal } = this.eventAbortController;

    // hover：ドロップダウンメニューを開く
    this.root.addEventListener(
      'mouseenter',
      () => {
        this.cancelHoverClose();
        this.toggle(true);
      },
      { signal }
    );

    // hover 解除：メニューとの隙間をまたぐため少し遅らせて閉じる
    this.root.addEventListener(
      'mouseleave',
      () => {
        this.scheduleHoverClose();
      },
      { signal }
    );

    // キーボード操作では focus で開き、フォーカスが外れたら閉じる
    this.root.addEventListener(
      'focusin',
      () => {
        this.cancelHoverClose();
        this.toggle(true);
      },
      { signal }
    );

    this.root.addEventListener(
      'focusout',
      () => {
        window.setTimeout(() => {
          const activeElement = document.activeElement;
          if (
            this.root.matches(':hover') ||
            (activeElement instanceof Node && this.root.contains(activeElement))
          ) {
            return;
          }

          this.toggle(false);
        }, 0);
      },
      { signal }
    );

    // ドラッグ終了後に発火する click で checkbox が誤って切り替わるのを防ぐ
    this.list.addEventListener(
      'click',
      (event) => {
        if (!this.suppressNextListClick) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.suppressNextListClick = false;
      },
      { capture: true, signal }
    );

    // チェックボックス変更：列の表示/非表示を更新
    this.list.addEventListener(
      'change',
      (event) => {
        if (
          !(event.target instanceof HTMLInputElement) ||
          !event.target.matches(SELECTORS.INPUT)
        ) {
          return;
        }

        const target = event.target;
        // 固定列（TogoVar ID）はチェック状態の変更を無視
        if (target.value === LOCKED_COLUMN_ID) {
          return;
        }

        const nextColumns = normalizeColumnConfigs(storeManager.getData('columns'));
        const targetColumn = nextColumns.find((column) => column.id === target.value);

        if (!targetColumn) {
          return;
        }

        targetColumn.isUsed = target.checked;
        storeManager.setData('columns', nextColumns);
      },
      { signal }
    );

    // mousedown：checkbox 以外のエリアは長押しでドラッグ開始
    this.list.addEventListener(
      'mousedown',
      (event) => {
        if (event.button !== 0) {
          return;
        }

        if (!(event.target instanceof Element)) {
          return;
        }

        const target = event.target;

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
        this.clearPendingLongPress?.();
        const pendingAbortController = new AbortController();

        const clearLongPressWatchers = (): void => {
          if (longPressTimer !== null) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          pendingAbortController.abort();
          if (this.clearPendingLongPress === clearLongPressWatchers) {
            this.clearPendingLongPress = null;
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
          this.beginDrag(item, startX, startY);
        };

        this.clearPendingLongPress = clearLongPressWatchers;
        longPressTimer = window.setTimeout(startDrag, LONG_PRESS_MS);
        document.addEventListener('mousemove', onPendingMove, {
          signal: pendingAbortController.signal,
        });
        document.addEventListener('mouseup', onPendingMouseUp, {
          signal: pendingAbortController.signal,
        });
      },
      { signal }
    );

    // ドキュメントクリック：範囲外クリックでドロップダウンを閉じる
    document.addEventListener('click', this.boundDocumentClick, { signal });
    // Escape キー：ドロップダウンを閉じる
    document.addEventListener('keydown', this.boundDocumentKeydown, { signal });
  }

  /**
   * 列リストを HTML にレンダリング
   */
  private render(columns: ColumnConfig[]): void {
    this.list.innerHTML = columns
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
   */
  private commitCurrentOrder(): void {
    const currentColumns = normalizeColumnConfigs(storeManager.getData('columns'));
    const columnMap = new Map(currentColumns.map((column) => [column.id, column]));

    const domItems = Array.from(
      this.list.querySelectorAll(SELECTORS.ITEM)
    ) as HTMLElement[];
    const nextColumns = domItems
      .map((item) => columnMap.get(item.dataset.columnId ?? ''))
      .filter((column): column is ColumnConfig => column !== undefined);

    storeManager.setData('columns', normalizeColumnConfigs(nextColumns));
  }

  /**
   * 実ドラッグ処理を開始
   */
  private beginDrag(
    item: HTMLElement,
    startClientX: number,
    startClientY: number
  ): void {
    this.draggingElement = item;
    this.suppressNextListClick = true;
    this.list.classList.add('-is-dragging');
    this.enableGlobalDraggingCursor();
    item.classList.add('-dragging-hidden');

    // ゴースト要素を生成してカーソルに追従させる
    const ghost = item.cloneNode(true) as HTMLElement;
    const itemRect = item.getBoundingClientRect();
    ghost.classList.remove('-dragging-hidden');
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
    this.ghostElement = ghost;

    // マウス位置とアイテム左上の差分（ドラッグ中にオフセットを保つ）
    const offsetX = startClientX - itemRect.left;
    const offsetY = startClientY - itemRect.top;

    const onMouseMove = (e: MouseEvent): void => {
      if (!this.draggingElement) {
        return;
      }

      // ゴーストをカーソルに追従
      if (this.ghostElement) {
        this.ghostElement.style.left = `${e.clientX - offsetX}px`;
        this.ghostElement.style.top = `${e.clientY - offsetY}px`;
      }

      const target =
        e.target instanceof Element
          ? (e.target.closest(SELECTORS.ITEM) as HTMLElement | null)
          : null;

      if (!target || target === this.draggingElement) {
        return;
      }

      const isTargetLocked = target.dataset.columnId === LOCKED_COLUMN_ID;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = isTargetLocked
        ? true
        : e.clientY > rect.top + rect.height / 2;

      // FLIP：移動前の各アイテムの Y 座標を記録
      const items = Array.from(
        this.list.querySelectorAll(SELECTORS.ITEM)
      ) as HTMLElement[];
      const beforeTops = new Map(
        items.map((el) => [el, el.getBoundingClientRect().top])
      );

      // DOM を並び替え
      if (shouldInsertAfter) {
        target.after(this.draggingElement);
      } else {
        target.before(this.draggingElement);
      }

      // FLIP：移動後の差分を transform で補正し、短い transition でアニメーション
      items.forEach((el) => {
        if (el === this.draggingElement) return;
        const delta = (beforeTops.get(el) ?? 0) - el.getBoundingClientRect().top;
        if (delta === 0) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = `transform ${DRAG_REORDER_ANIMATION_MS}ms ease-out`;
          el.style.transform = '';
        });
      });
    };

    const dragAbortController = new AbortController();
    const cleanupDragListeners = (): void => {
      dragAbortController.abort();
      if (this.cleanupDragListeners === cleanupDragListeners) {
        this.cleanupDragListeners = null;
      }
    };

    const onMouseUp = (): void => {
      cleanupDragListeners();
      this.commitCurrentOrder();
      this.clearDragState();
      window.setTimeout(() => {
        this.suppressNextListClick = false;
      }, 0);
    };

    this.cleanupDragListeners = cleanupDragListeners;
    document.addEventListener('mousemove', onMouseMove, {
      signal: dragAbortController.signal,
    });
    document.addEventListener('mouseup', onMouseUp, {
      signal: dragAbortController.signal,
    });
  }

  /**
   * ドラッグ状態をリセット
   */
  private clearDragState(): void {
    this.draggingElement = null;
    this.disableGlobalDraggingCursor();

    // ゴースト要素を削除
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    this.list.classList.remove('-is-dragging');
    this.list.querySelectorAll(SELECTORS.ITEM).forEach((element) => {
      const el = element as HTMLElement;
      el.classList.remove('-dragging-hidden');
      el.style.transform = '';
      el.style.transition = '';
    });
  }

  /** ドラッグ中のみ全体カーソルを grabbing に固定 */
  private enableGlobalDraggingCursor(): void {
    if (this.draggingCursorStyleEl) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.textContent =
      'html, body, body * { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }';
    document.head.appendChild(styleEl);
    this.draggingCursorStyleEl = styleEl;
  }

  /** ドラッグ終了後に全体カーソル固定を解除 */
  private disableGlobalDraggingCursor(): void {
    if (!this.draggingCursorStyleEl) {
      return;
    }

    this.draggingCursorStyleEl.remove();
    this.draggingCursorStyleEl = null;
  }

  /** hover 解除後、少し遅らせてドロップダウンを閉じる */
  private scheduleHoverClose(): void {
    this.cancelHoverClose();
    this.hoverCloseTimer = window.setTimeout(() => {
      this.hoverCloseTimer = null;
      this.toggle(false);
    }, HOVER_CLOSE_DELAY_MS);
  }

  /** hover クローズ予約をキャンセル */
  private cancelHoverClose(): void {
    if (this.hoverCloseTimer === null) {
      return;
    }

    window.clearTimeout(this.hoverCloseTimer);
    this.hoverCloseTimer = null;
  }

  /**
   * ドロップダウンメニューの開閉を切り替え
   */
  private toggle(forceOpen?: boolean): void {
    const shouldOpen = forceOpen ?? !this.root.classList.contains('-open');
    this.root.classList.toggle('-open', shouldOpen);
    this.button.setAttribute('aria-expanded', String(shouldOpen));
    this.menu.setAttribute('aria-hidden', String(!shouldOpen));

    if (shouldOpen) {
      // opacity アニメーション開始前に hidden を解除してメニューを DOM に戻す。
      this.menu.hidden = false;
      this.menu.removeAttribute('inert');
      // inert 非対応ブラウザ向け: フォーカス制御を復元する。
      this.menu
        .querySelectorAll<HTMLInputElement>(SELECTORS.INPUT)
        .forEach((input) => input.removeAttribute('tabindex'));
    } else {
      this.menu.setAttribute('inert', '');
      // inert 非対応ブラウザ向け: フェードアウト中も Tab フォーカスがチェックボックスに入らないよう即座に遮断する。
      this.menu
        .querySelectorAll<HTMLInputElement>(SELECTORS.INPUT)
        .forEach((input) => input.setAttribute('tabindex', '-1'));
      // 既に hidden（display:none）なら transitionend は発火しないため即座に終了する。
      if (this.menu.hidden) {
        return;
      }
      // CSS transition 完了後に hidden を設定する。
      this.menu.addEventListener(
        'transitionend',
        () => {
          if (!this.root.classList.contains('-open')) {
            this.menu.hidden = true;
          }
        },
        { once: true }
      );
    }
  }

  /** ドロップダウン範囲外がクリックされた場合、メニューを自動クローズ */
  private handleDocumentClick(event: MouseEvent): void {
    if (event.target instanceof Node && this.root.contains(event.target)) {
      return;
    }

    this.toggle(false);
  }

  /** Escape キー：ドロップダウンメニューを閉じる */
  private handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.toggle(false);
    }
  }
}
