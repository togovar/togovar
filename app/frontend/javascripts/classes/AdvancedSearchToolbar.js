import { ADVANCED_CONDITIONS } from '../global.js';

export default class AdvancedSearchToolbar {
  constructor(delegate, toolbar) {
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
      // {
      //   command: 'copy',
      //   label: 'Copy',
      //   shortcut: [67]
      // },
      // {
      //   command: 'edit',
      //   label: 'Edit',
      //   shortcut: [69]
      // },
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

    // references
    // this._searchButton = toolbar.querySelector(':scope > ul > .buttoncontainer > .button-view');

    // events
    toolbar.querySelectorAll('.command').forEach((command) => {
      command.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        switch (command.dataset.command) {
          case 'add-condition':
            this._delegate.addCondition(command.dataset.condition);
            break;
          case 'group':
            this._delegate.group();
            break;
          case 'ungroup':
            this._delegate.ungroup();
            break;
          case 'copy':
            this._delegate.copy();
            break;
          case 'edit':
            this._delegate.edit();
            break;
          case 'delete':
            this._delegate.delete();
            break;
        }
      });
    });
    // this._searchButton.addEventListener('click', () => {
    //   this._delegate.search();
    // });
  }

  // public methods

  canSearch(can) {
    console.trace('canSearch');
    console.log('canSearch', can);
    if (can) this._searchButton.classList.remove('-disabled');
    else this._searchButton.classList.add('-disabled');
  }
}
