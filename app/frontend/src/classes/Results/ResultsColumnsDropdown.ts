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
  private _draggingElement: HTMLElement | null = null;
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
   * - ドラッグ系イベント：列の並び替え
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

      const columnId = target.dataset.columnId;
      if (!columnId || columnId === LOCKED_COLUMN_ID) {
        event.preventDefault();
        return;
      }

      this._draggingElement = target;
      this._list.classList.add('-is-dragging');

      // ドラッグ開始直後（ゴースト生成後）に元要素を非表示にする
      requestAnimationFrame(() => {
        if (this._draggingElement === target) {
          target.classList.add('-dragging-hidden');
        }
      });

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    });

    // dragover：ドラッグ中に DOM を実際に並び替える
    this._list.addEventListener('dragover', (event) => {
      if (!this._draggingElement) {
        return;
      }

      // ドラッグ中は常に preventDefault()（これを省くとスナップバックアニメーションが発生する）
      event.preventDefault();

      const target = (event.target as HTMLElement | null)?.closest(
        SELECTORS.ITEM
      ) as HTMLElement | null;

      if (!target || target === this._draggingElement) {
        return;
      }

      // 固定列（TogoVar ID）の後ろにしか挿入できない
      const isTargetLocked = target.dataset.columnId === LOCKED_COLUMN_ID;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = isTargetLocked
        ? true
        : event.clientY > rect.top + rect.height / 2;

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
        const delta = (beforeTops.get(el) ?? 0) - el.getBoundingClientRect().top;
        if (delta === 0) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.15s ease';
          el.style.transform = '';
        });
      });
    });

    // dragend：ドラッグ終了後に DOM の順序を store に保存
    this._list.addEventListener('dragend', () => {
      this._commitCurrentOrder();
      this._clearDragState();
    });

    // drop：ブラウザの「ゴーストが元位置に戻るアニメーション」を抑止するために必要
    this._list.addEventListener('drop', (event) => {
      event.preventDefault();
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
   * - ドラッグ終了時に呼ばれる
   * - 表示/非表示状態は保持
   * - 固定列制約を再度適用（安全性確保）
   */
  private _commitCurrentOrder(): void {
    const currentColumns = normalizeColumnConfigs(storeManager.getData('columns'));
    const columnMap = new Map(currentColumns.map((column) => [column.id, column]));

    // DOM の現在の並び順から新しい列設定を作成
    const domItems = Array.from(
      this._list.querySelectorAll(SELECTORS.ITEM)
    ) as HTMLElement[];
    const nextColumns = domItems
      .map((item) => columnMap.get(item.dataset.columnId ?? ''))
      .filter((column): column is ColumnConfig => column !== undefined);

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
   * ドラッグ状態をリセット
   * - ドラッグ中の CSS クラス（-dragging-hidden, -is-dragging）を全て削除
   * - 内部状態変数を初期化
   */
  private _clearDragState(): void {
    this._draggingElement = null;
    this._list.classList.remove('-is-dragging');
    this._list
      .querySelectorAll(SELECTORS.ITEM)
      .forEach((element) => {
        const el = element as HTMLElement;
        el.classList.remove('-dragging-hidden');
        el.style.transform = '';
        el.style.transition = '';
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
}