import { HoverDropdown } from '../HoverDropdown';
import {
  getColumnLabel,
  isLockedColumnId,
  normalizeColumnConfigs,
} from '../../columns';
import { fitResultsPanelHeight } from './fitResultsPanelHeight';
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
const AUTO_SCROLL_EDGE_PX = 32;
const AUTO_SCROLL_SPEED_PX_PER_SECOND = 360;

/**
 * 検索結果テーブルの列表示/非表示・ドラッグ並び替え機能を提供するドロップダウン
 *
 * 機能：
 * - チェックボックスで列の表示/非表示を制御
 * - ドラッグ&ドロップで列の順序を並び替え
 * - Report / TogoVar ID 列は常に先頭側に固定（ドラッグ禁止、チェック常時有効）
 * - UI 操作が store.columns に自動反映
 */
export class ResultsColumnsDropdown {
  private readonly root: HTMLElement;
  private readonly dropdown: HoverDropdown;
  private readonly menu: HTMLElement;
  private readonly list: HTMLElement;
  private draggingElement: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private draggingCursorStyleEl: HTMLStyleElement | null = null;
  private clearPendingLongPress: (() => void) | null = null;
  private cleanupDragListeners: (() => void) | null = null;
  private suppressNextListClick = false;
  private readonly eventAbortController = new AbortController();
  private readonly onColumns = (v: StoreState['columns']) => this.columns(v);

  /** 列設定の変更とメニュー操作を同じインスタンスで管理するため、初期表示時に購読する。 */
  constructor(root: HTMLElement) {
    this.root = root;
    this.menu = root.querySelector(SELECTORS.MENU) as HTMLElement;
    this.list = root.querySelector(SELECTORS.LIST) as HTMLElement;
    this.dropdown = new HoverDropdown({
      container: root,
      triggerSelector: SELECTORS.BUTTON,
      panel: this.menu,
      canClose: () => !this.draggingElement,
      onOpen: () => {
        root.classList.add('-open');
        fitResultsPanelHeight(this.menu);
      },
      onClose: () => {
        this.clearPendingLongPress?.();
        this.cleanupDragListeners?.();
        if (this.draggingElement) {
          this.commitCurrentOrder();
          this.clearDragState();
        }
        root.classList.remove('-open');
      },
    });
    this.bindEvents();
    storeManager.subscribe('columns', this.onColumns);
    this.columns(storeManager.getData('columns'));
  }

  /**
   * 破棄後に列設定の更新やドラッグが残らないよう、購読とイベントを解放する。
   */
  destroy(): void {
    storeManager.unsubscribe('columns', this.onColumns);
    this.clearPendingLongPress?.();
    this.eventAbortController.abort();
    this.cleanupDragListeners?.();
    this.suppressNextListClick = false;
    this.clearDragState();
    this.dropdown.destroy();
  }

  /**
   * 列設定を受け取り、UI を再描画
   */
  columns(columns: ColumnConfig[]): void {
    this.render(normalizeColumnConfigs(columns));
  }

  /**
   * 開閉は共通クラスに任せ、列設定の変更とドラッグだけをこのリストで受け付ける。
   */
  private bindEvents(): void {
    const { signal } = this.eventAbortController;

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
        // 固定列はチェック状態の変更を無視
        if (isLockedColumnId(target.value)) {
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
        if (!item || isLockedColumnId(item.dataset.columnId)) {
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


  }

  /**
   * 列リストを HTML にレンダリング
   */
  private render(columns: ColumnConfig[]): void {
    this.list.innerHTML = columns
      .map((column) => {
        const isLocked = isLockedColumnId(column.id);
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
   * スクロール領域の外でも位置を追跡できるよう、ドラッグを document のマウスイベントで管理する。
   */
  private beginDrag(
    item: HTMLElement,
    startClientX: number,
    startClientY: number
  ): void {
    this.dropdown.cancelClose();
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

    let clientX = startClientX;
    let clientY = startClientY;
    let frameId: number | null = null;
    let previousTime: number | null = null;

    /** スクロールでポインター直下の項目が変わるため、イベントの target ではなく現在の座標から挿入先を探す。 */
    const reorderAtPointer = (): void => {
      if (!this.draggingElement) return;
      const menuRect = this.menu.getBoundingClientRect();
      if (clientX < menuRect.left || clientX >= menuRect.right) return;
      // 端の外側でもドラッグを続けられるよう、ヒットテストだけをメニュー内に収める。
      const menuStyle = getComputedStyle(this.menu);
      const hitTop = menuRect.top + parseFloat(menuStyle.paddingTop) + 1;
      const hitBottom = menuRect.bottom - parseFloat(menuStyle.paddingBottom) - 1;
      const hitY = Math.max(hitTop, Math.min(clientY, hitBottom));
      const target = document.elementFromPoint(clientX, hitY)?.closest<HTMLElement>(SELECTORS.ITEM);
      if (!target || !this.list.contains(target) || target === this.draggingElement) return;

      const isTargetLocked = isLockedColumnId(target.dataset.columnId);
      // 固定列同士の間へは挿入せず、固定列の後ろにある最初の可動位置を保つ。
      if (isTargetLocked && isLockedColumnId((target.nextElementSibling as HTMLElement | null)?.dataset.columnId)) return;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = isTargetLocked
        ? true
        : hitY > rect.top + rect.height / 2;
      // 同じ挿入位置で FLIP を繰り返すと、アニメーションとスクロールが干渉するため省く。
      if (shouldInsertAfter
        ? target.nextElementSibling === this.draggingElement
        : target.previousElementSibling === this.draggingElement) return;

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

    /** ポインターが静止していても端でスクロールし続けるよう、ドラッグ中はフレームごとに位置を更新する。 */
    const updateDrag = (time: number): void => {
      const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 32);
      previousTime = time;
      const rect = this.menu.getBoundingClientRect();
      if (clientX >= rect.left && clientX < rect.right) {
        const edge = Math.min(AUTO_SCROLL_EDGE_PX, rect.height / 2);
        const direction = clientY < rect.top + edge ? -1 : clientY > rect.bottom - edge ? 1 : 0;
        this.menu.scrollTop += direction * AUTO_SCROLL_SPEED_PX_PER_SECOND * elapsed / 1000;
      }
      reorderAtPointer();
      frameId = requestAnimationFrame(updateDrag);
    };

    /** ゴーストは viewport 座標に固定し、メニューのスクロールによるずれを防ぐ。 */
    const onMouseMove = (event: MouseEvent): void => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (this.ghostElement) {
        this.ghostElement.style.left = `${clientX - offsetX}px`;
        this.ghostElement.style.top = `${clientY - offsetY}px`;
      }
    };

    const dragAbortController = new AbortController();
    /** 閉じる・破棄・マウスを離す場合のすべてで、スクロールと document の監視を終了する。 */
    const cleanupDragListeners = (): void => {
      dragAbortController.abort();
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (this.cleanupDragListeners === cleanupDragListeners) {
        this.cleanupDragListeners = null;
      }
    };

    /** 並び替えを確定してから通常の hover 制御へ戻し、ドラッグ後の誤クリックを防ぐ。 */
    const onMouseUp = (): void => {
      cleanupDragListeners();
      this.commitCurrentOrder();
      this.clearDragState();
      if (!this.root.matches(':hover') && !this.root.contains(document.activeElement)) {
        this.dropdown.scheduleClose();
      }
      window.setTimeout(() => {
        this.suppressNextListClick = false;
      }, 0);
    };

    frameId = requestAnimationFrame(updateDrag);
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
}
