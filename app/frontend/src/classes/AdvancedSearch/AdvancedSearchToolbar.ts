import { ADVANCED_CONDITIONS } from '../../global';
import { createEl } from '../../utils/dom/createEl';
import type { AdvancedSearchBuilderView } from './AdvancedSearchBuilderView';
import type { ConditionTypeValue } from '../../definition';
import type { Command, CommandDef } from '../../types';

const COMMANDS: ReadonlyArray<CommandDef> = [
  { command: 'group', label: 'Group', shortcut: [71] }, // G
  { command: 'ungroup', label: 'Ungroup', shortcut: [16, 71] }, // Shift + G
  { command: 'delete', label: 'Delete', shortcut: [46] }, // Del
  // TODO: copy/edit は現在未使用。実装時に COMMANDS へ戻す。
  // { command: 'copy', label: 'Copy', shortcut: [67] },
  // { command: 'edit', label: 'Edit', shortcut: [69] },
];

type ToolbarCommand = Exclude<Command, 'add-condition'>;

/**
 * 表示用のショートカット文字列を keyCode から作る。
 * mapに登録されていないキーは文字コードで英字変換する（A-Z を想定）。
 */
function formatShortcut(codes: number[]): string {
  const map: Record<number, string> = { 16: 'Shift', 46: 'Del' };
  const parts = codes.map((c) => map[c] ?? String.fromCharCode(c));
  return parts.join('+');
}

/**
 * 高度検索ツールバーを管理する。
 *
 * DOM の構築、クリック/キーボード操作の受付、Builder へのコマンド委譲を担当する。
 */
export class AdvancedSearchToolbar {
  private _builder: AdvancedSearchBuilderView;
  private _toolbar: HTMLElement;
  // AbortController の signal オプションが使えない環境への fallback 判定用。
  private _usesSignal = false;
  private _disposed = false;
  private readonly _commandEnabled: Record<ToolbarCommand, boolean> = {
    group: false,
    ungroup: false,
    delete: false,
  };

  /** destroy 時にイベントリスナーをまとめて解除するための Controller。 */
  private readonly _events = new AbortController();

  constructor(builder: AdvancedSearchBuilderView, toolbar: HTMLElement) {
    this._builder = builder;
    this._toolbar = toolbar;

    this._initializeToolbar();
    this._attachEventDelegation();
  }

  /** ツールバーの DOM を一度だけ構築する。 */
  private _initializeToolbar(): void {
    const root = this._toolbar;
    root.classList.add('advanced-search-toolbar');

    const addConditionMenu = createEl('li', {
      class: '-haschild',
      children: [
        createEl('p', { text: 'Add condition' }),
        createEl('ul', { children: this._createAddConditionItems() }),
      ],
    });

    root.replaceChildren(
      createEl('ul', {
        children: [addConditionMenu, ...this._createCommandItems()],
      })
    );
  }

  /** 条件追加メニューの項目を作る。 */
  private _createAddConditionItems(): HTMLLIElement[] {
    return Object.keys(ADVANCED_CONDITIONS).map((conditionType, index) => {
      const condition =
        ADVANCED_CONDITIONS[
          conditionType as keyof typeof ADVANCED_CONDITIONS
        ];
      const label =
        condition && typeof condition === 'object' && 'label' in condition
          ? String(condition.label)
          : conditionType;
      const shortcut = String(index + 1);

      return createEl('li', {
        children: [
          createEl('button', {
            class: 'command',
            attrs: { type: 'button' },
            dataset: {
              command: 'add-condition',
              condition: conditionType,
              shortcut,
            },
            children: [
              createEl('span', { text: label }),
              createEl('small', {
                class: 'shortcut',
                children: [
                  createEl('span', { class: ['char', '-command'] }),
                  shortcut,
                ],
              }),
            ],
          }),
        ],
      });
    });
  }

  /** グループ化/解除/削除コマンドの項目を作る。 */
  private _createCommandItems(): HTMLLIElement[] {
    return COMMANDS.map((cmd) =>
      createEl('li', {
        children: [
          createEl('button', {
            class: 'command',
            attrs: {
              type: 'button',
              disabled: '',
              'aria-disabled': 'true',
            },
            dataset: { command: cmd.command },
            children: [
              createEl('span', { text: cmd.label }),
              createEl('small', {
                class: 'shortcut',
                children: [
                  createEl('span', { class: ['char', '-command'] }),
                  formatShortcut(cmd.shortcut),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  /** Builder から受け取った操作可否をボタン状態へ反映する。 */
  setCommandStates(states: Partial<Record<ToolbarCommand, boolean>>): void {
    for (const command of Object.keys(states) as ToolbarCommand[]) {
      const enabled = states[command] === true;
      this._commandEnabled[command] = enabled;

      const button = this._toolbar.querySelector<HTMLButtonElement>(
        `button.command[data-command="${command}"]`
      );
      if (!button) continue;

      button.disabled = !enabled;
      button.setAttribute('aria-disabled', String(!enabled));
    }
  }

  /** ツールバー全体で共有する click ハンドラ。 */
  private _onClick = (e: Event) => {
    if (e instanceof MouseEvent && e.button !== 0) return;

    const target = e.target;
    if (!(target instanceof Element)) return;
    const cmdEl = target.closest<HTMLElement>('.command');
    if (!cmdEl) return;

    e.stopPropagation();

    if (cmdEl instanceof HTMLButtonElement && cmdEl.disabled) return;

    const command = cmdEl.dataset.command as Command | undefined;
    const condition = cmdEl.dataset.condition as ConditionTypeValue | undefined;
    if (!command) return;

    this._handleCommand(command, condition, e);
  };

  /**
   * アクセシビリティ用。Enter/Space で click と同じ処理を実行する。
   * button要素はブラウザ標準で Enter/Space に対応しているため、button以外だけを対象にする。
   */
  private _onKeydown = (e: KeyboardEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target instanceof HTMLButtonElement) return;

    const cmdEl = target.closest<HTMLElement>('.command');
    if (!cmdEl) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();

      const command = cmdEl.dataset.command as Command | undefined;
      const condition = cmdEl.dataset.condition as
        | ConditionTypeValue
        | undefined;
      if (!command) return;

      this._handleCommand(command, condition);
    }
  };

  /**
   * click と keydown をツールバーへ一度だけ委譲登録する。
   * AbortController の signal が使える環境では signal でまとめて解除し、
   * そうでない環境では destroy 時に個別に removeEventListener する。
   */
  private _attachEventDelegation(): void {
    try {
      this._toolbar.addEventListener('click', this._onClick, {
        signal: this._events.signal,
      });
      this._toolbar.addEventListener('keydown', this._onKeydown, {
        signal: this._events.signal,
      });
      this._usesSignal = true;
    } catch {
      this._toolbar.addEventListener('click', this._onClick);
      this._toolbar.addEventListener('keydown', this._onKeydown);
      this._usesSignal = false;
    }
  }

  /**
   * ユーザー操作から得たコマンドを実行する。
   *
   * @param command 実行するコマンド
   * @param conditionType add-condition の場合に追加する条件種別
   * @param event 元イベント。CustomEvent の detail を初期値として渡すことがある
   */
  private _handleCommand(
    command: Command,
    conditionType: ConditionTypeValue | undefined,
    event?: Event
  ): void {
    switch (command) {
      case 'add-condition': {
        if (!conditionType) return;
        const options = event instanceof CustomEvent ? event.detail : undefined;
        this._builder.addCondition(conditionType, options);
        break;
      }
      case 'group':
        if (!this._isCommandEnabled(command)) return;
        this._builder.group();
        break;
      case 'ungroup':
        if (!this._isCommandEnabled(command)) return;
        this._builder.ungroup();
        break;
      case 'delete':
        if (!this._isCommandEnabled(command)) return;
        this._builder.deleteCondition(
          this._builder.selection.getSelectedConditionViews()
        );
        break;
      // TODO: copy/edit を復活させる場合はここに分岐を追加する。
    }
  }

  private _isCommandEnabled(command: Command): boolean {
    return command === 'add-condition' || this._commandEnabled[command] === true;
  }

  /**
   * ツールバーが不要になったときに、イベントリスナーと DOM を片付ける。
   */
  destroy(options?: { clearDom?: boolean }): void {
    if (this._disposed) return;

    if (this._usesSignal) {
      this._events.abort();
    } else {
      this._toolbar.removeEventListener('click', this._onClick);
      this._toolbar.removeEventListener('keydown', this._onKeydown);
    }

    if (options?.clearDom) {
      this._toolbar.replaceChildren();
    }

    // 再初期化は想定していないため、参照を落として GC しやすくする。
    this._builder = null!;
    this._toolbar = null!;
    this._disposed = true;
  }
}
