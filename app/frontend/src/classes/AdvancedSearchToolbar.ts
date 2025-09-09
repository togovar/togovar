import { ADVANCED_CONDITIONS } from '../global';
import AdvancedSearchBuilderView from './AdvancedSearchBuilderView.js';

export class AdvancedSearchToolbar {
  private _delegate: AdvancedSearchBuilderView;

  constructor(delegate: AdvancedSearchBuilderView, toolbar: HTMLElement) {
    this._delegate = delegate;

    toolbar.classList.add('advanced-search-toolbar');

    // make HTML
    const COMMANDS = [
      {
        command: 'group',
        label: 'Group',
        shortcut: [71],
      },
      {
        command: 'ungroup',
        label: 'Ungroup',
        shortcut: [16, 71],
      },
      {
        command: 'delete',
        label: 'Delete',
        shortcut: [46],
      },
    ];

    toolbar.innerHTML = `
    <ul>
      <li class="-haschild">
        <p>Add condition</p>
        <ul>
          ${Object.keys(ADVANCED_CONDITIONS)
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
            .join('')}
        </ul>
      </li>
      ${COMMANDS.map(
        (command) => `
      <li class="command" data-command="${command.command}">
        <p>${
          command.label
        }<small class="shortcut"><span class="char -command"></span>${String.fromCharCode(
          ...command.shortcut
        )}</small></p>
      </li>
      `
      ).join('')}
    </ul>
    `;

    // events
    toolbar.querySelectorAll('.command').forEach((command) => {
      const cmdElement = command as HTMLElement;
      cmdElement.addEventListener('click', (e: Event) => {
        e.stopImmediatePropagation();
        const dataset = cmdElement.dataset;
        switch (dataset.command) {
          case 'add-condition':
            this._delegate.addCondition(
              dataset.condition || '',
              (e as CustomEvent).detail
            );
            break;
          case 'group':
            this._delegate.group();
            break;
          case 'ungroup':
            this._delegate.ungroup();
            break;
          case 'delete':
            this._delegate.deleteCondition(
              this._delegate.selection.getSelectingConditionViews()
            );
            break;
        }
      });
    });
  }
}
