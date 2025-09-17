import { ADVANCED_CONDITIONS } from '../global';
import { createEl } from '../utils/dom/createEl';
import type AdvancedSearchBuilderView from './AdvancedSearchBuilderView';
import type { ConditionTypeValue } from '../definition';
import type { Command, CommandDef } from '../types';

const COMMANDS: ReadonlyArray<CommandDef> = [
  { command: 'group', label: 'Group', shortcut: [71] }, // G
  { command: 'ungroup', label: 'Ungroup', shortcut: [16, 71] }, // Shift + G
  { command: 'delete', label: 'Delete', shortcut: [46] }, // Del
  // TODO: These are currently unused, but may be implemented in the future.
  // { command: 'copy', label: 'Copy', shortcut: [67] },
  // { command: 'edit', label: 'Edit', shortcut: [69] },
];

/** Formats a shortcut label from key codes. */
function formatShortcut(codes: number[]): string {
  // Minimal mapping; extend as needed.
  const map: Record<number, string> = { 16: 'Shift', 46: 'Del' };
  const parts = codes.map((c) => map[c] ?? String.fromCharCode(c));
  return parts.join('+');
}

/**
 * Represents the toolbar for advanced search functionality.
 * This class initializes the toolbar UI, handles user interactions,
 * and delegates commands to the AdvancedSearchBuilderView.
 */
export class AdvancedSearchToolbar {
  private _builder: AdvancedSearchBuilderView;
  private _toolbar: HTMLElement;
  private _usesSignal = false; // set true only if addEventListener with {signal} succeeded
  private _disposed = false; // guard against multiple destroy() calls

  /** One controller to remove all listeners on destroy. */
  private readonly _events = new AbortController();

  constructor(builder: AdvancedSearchBuilderView, toolbar: HTMLElement) {
    this._builder = builder;
    this._toolbar = toolbar;

    this._initializeToolbar();
    this._attachEventDelegation();
  }

  // =========================================================
  // DOM Creation
  // =========================================================

  /** Build the toolbar DOM once. */
  private _initializeToolbar(): void {
    const root = this._toolbar;
    root.classList.add('advanced-search-toolbar');

    // Build "Add condition" items
    const addItems = Object.keys(ADVANCED_CONDITIONS).map((key, index) => {
      const label =
        ADVANCED_CONDITIONS[key as keyof typeof ADVANCED_CONDITIONS]?.label ??
        key;

      return createEl('li', {
        class: 'command',
        attrs: { tabindex: '0', role: 'button' },
        dataset: {
          command: 'add-condition',
          condition: key,
          shortcut: String(index + 1),
        },
        children: [
          createEl('p', { text: label }),
          createEl('small', {
            class: 'shortcut',
            children: [
              createEl('span', { class: ['char', '-command'] }),
              String(index + 1),
            ],
          }),
        ],
      });
    });

    // Wrap the add-condition submenu
    const liAdd = createEl('li', {
      class: '-haschild',
      children: [
        createEl('p', { text: 'Add condition' }),
        createEl('ul', { children: addItems }),
      ],
    });

    // Build command items (group / ungroup / delete)
    const commandLis = COMMANDS.map((cmd) =>
      createEl('li', {
        class: 'command',
        attrs: { tabindex: '0', role: 'button' },
        dataset: { command: cmd.command },
        children: [
          createEl('p', {
            children: [
              cmd.label, // text node
              createEl('small', {
                class: 'shortcut',
                children: [
                  createEl('span', { class: ['char', '-command'] }),
                  String(formatShortcut(cmd.shortcut)),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Root <ul> with both sections
    const ul = createEl('ul', { children: [liAdd, ...commandLis] });

    // Hydrate toolbar
    root.replaceChildren(ul);
  }

  // =========================================================
  // Event Handling
  // =========================================================

  /** One delegated click handler for the whole toolbar. */
  private _onClick = (e: MouseEvent) => {
    // Ignore non-primary buttons (e.g., right/middle click).
    if (e.button !== 0) return;

    const target = e.target;
    if (!(target instanceof Element)) return;
    const cmdEl = target.closest<HTMLElement>('.command');
    if (!cmdEl) return;

    // Stop bubbling beyond the toolbar (but keep other toolbar listeners alive).
    e.stopPropagation();

    // Optional: ignore disabled items.
    if (cmdEl.getAttribute('aria-disabled') === 'true') return;

    const command = cmdEl.dataset.command as Command | undefined;
    const condition = cmdEl.dataset.condition as ConditionTypeValue | undefined;
    if (!command) return;

    this._handleCommand(command, condition, e);
  };

  /** Keyboard activation for accessibility: Enter/Space triggers the same action. */
  private _onKeydown = (e: KeyboardEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Only handle focused .command items.
    const cmdEl = target.closest<HTMLElement>('.command');
    if (!cmdEl) return;

    // Activate on Enter or Space (Space also prevents page scroll).
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();

      const command = cmdEl.dataset.command as Command | undefined;
      const condition = cmdEl.dataset.condition as
        | ConditionTypeValue
        | undefined;
      if (!command) return;

      this._handleCommand(command, condition, e);
    }
  };

  /** Event delegation: set up click + keyboard once on the toolbar. */
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
      // Older envs without AbortController on addEventListener.
      this._toolbar.addEventListener('click', this._onClick);
      this._toolbar.addEventListener('keydown', this._onKeydown);
      this._usesSignal = false;
    }
  }

  /**
   * Execute a command based on user interaction.
   * @param command - Command identifier (click target).
   * @param condition - Condition type (only for 'add-condition').
   * @param event - Original event (may carry CustomEvent detail).
   */
  private _handleCommand(
    command: Command,
    condition: ConditionTypeValue | undefined,
    event: Event
  ): void {
    switch (command) {
      case 'add-condition':
        if (!condition) return;
        this._builder.addCondition(condition, (event as CustomEvent).detail);
        break;
      case 'group':
        this._builder.group();
        break;
      case 'ungroup':
        this._builder.ungroup();
        break;
      case 'delete':
        this._builder.deleteCondition(
          this._builder.selection.getSelectedConditionViews()
        );
        break;
      // TODO: Future commands (copy/edit) may be added here.
    }
  }

  // =========================================================
  // Lifecycle
  // =========================================================

  // TODO: This feature is not currently implemented, but we intend to implement it in the future, so we will leave it uncommented.
  /**
   * Clean up all resources and prevent memory leaks.
   * Call this method when the toolbar component is no longer needed.
   */
  destroy(options?: { clearDom?: boolean }): void {
    if (this._disposed) return;

    // Remove listeners
    if (this._usesSignal) {
      this._events.abort();
    } else {
      this._toolbar.removeEventListener('click', this._onClick);
      this._toolbar.removeEventListener('keydown', this._onKeydown);
    }

    // Optional: clear toolbar contents if this instance owns the DOM
    if (options?.clearDom) {
      this._toolbar.replaceChildren();
    }

    // Drop references to help GC (no re-init assumed)
    this._builder = null!;
    this._toolbar = null!;
    this._disposed = true;
  }
}
