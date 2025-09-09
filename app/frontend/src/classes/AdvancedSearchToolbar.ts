import { ADVANCED_CONDITIONS } from '../global';
import AdvancedSearchBuilderView from './AdvancedSearchBuilderView.js';

const COMMANDS = [
  { command: 'group', label: 'Group', shortcut: [71] },
  { command: 'ungroup', label: 'Ungroup', shortcut: [16, 71] },
  { command: 'delete', label: 'Delete', shortcut: [46] },
];

/**
 * Represents the toolbar for advanced search functionality.
 *
 * This class is responsible for initializing the toolbar, handling user interactions,
 * and delegating commands to the AdvancedSearchBuilderView.
 *
 * @param _advancedSearchBuilderView - The instance of AdvancedSearchBuilderView to delegate commands to.
 * @param _toolbar - The HTML element representing the toolbar.
 */
export class AdvancedSearchToolbar {
  private _advancedSearchBuilderView: AdvancedSearchBuilderView;

  constructor(
    _advancedSearchBuilderView: AdvancedSearchBuilderView,
    _toolbar: HTMLElement
  ) {
    this._advancedSearchBuilderView = _advancedSearchBuilderView;

    this._initializeToolbar(_toolbar);
    this._attachEventListeners(_toolbar);
  }

  // ========================================
  // DOM Creation
  // ========================================

  /**
   * Initializes the toolbar by adding necessary classes and generating its HTML structure.
   *
   * @param toolbar - The HTML element representing the toolbar.
   */
  private _initializeToolbar(toolbar: HTMLElement): void {
    toolbar.classList.add('advanced-search-toolbar');

    toolbar.innerHTML = `
      <ul>
        <li class="-haschild">
          <p>Add condition</p>
          <ul>
            ${this._generateConditionItems()}
          </ul>
        </li>
        ${this._generateCommandItems(COMMANDS)}
      </ul>
    `;
  }

  /**
   * Generates the HTML string for condition items in the toolbar.
   *
   * @returns The HTML string representing condition items.
   */
  private _generateConditionItems(): string {
    return Object.keys(ADVANCED_CONDITIONS)
      .map(
        (key, index) => `
          <li class="command" data-command="add-condition" data-condition="${key}" data-shortcut="${
          index + 1
        }">
            <p>${ADVANCED_CONDITIONS[key].label}</p>
            <small class="shortcut"><span class="char -command"></span>${
              index + 1
            }</small>
          </li>
        `
      )
      .join('');
  }

  /**
   * Generates the HTML string for command items in the toolbar.
   *
   * @param commands - An array of command objects containing command details.
   * @returns The HTML string representing command items.
   */
  private _generateCommandItems(
    commands: { command: string; label: string; shortcut: number[] }[]
  ): string {
    return commands
      .map(
        (command) => `
          <li class="command" data-command="${command.command}">
            <p>${
              command.label
            }<small class="shortcut"><span class="char -command"></span>${String.fromCharCode(
          ...command.shortcut
        )}</small></p>
          </li>
        `
      )
      .join('');
  }

  // ========================================
  // Event Handler
  // ========================================

  /**
   * Attaches event listeners to the toolbar commands.
   *
   * @param toolbar - The HTML element representing the toolbar.
   */
  private _attachEventListeners(toolbar: HTMLElement): void {
    toolbar.querySelectorAll('.command').forEach((command) => {
      const cmdElement = command as HTMLElement;
      cmdElement.addEventListener('click', (e: Event) => {
        e.stopImmediatePropagation();
        this._handleCommand(
          cmdElement.dataset.command,
          cmdElement.dataset.condition,
          e
        );
      });
    });
  }

  /**
   * Handles the execution of a command based on user interaction.
   *
   * @param command - The command to execute.
   * @param condition - The condition associated with the command, if any.
   * @param event - The event object associated with the user interaction.
   */
  private _handleCommand(
    command: string | undefined,
    condition: string | undefined,
    event: Event
  ): void {
    switch (command) {
      case 'add-condition':
        this._advancedSearchBuilderView.addCondition(
          condition || '',
          (event as CustomEvent).detail
        );
        break;
      case 'group':
        this._advancedSearchBuilderView.group();
        break;
      case 'ungroup':
        this._advancedSearchBuilderView.ungroup();
        break;
      case 'delete':
        this._advancedSearchBuilderView.deleteCondition(
          this._advancedSearchBuilderView.selection.getSelectingConditionViews()
        );
        break;
    }
  }
}
