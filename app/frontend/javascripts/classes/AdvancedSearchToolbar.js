export default class AdvancedSearchToolbar {

  constructor(toolbar, delegate) {

    this._delegate = delegate;

    toolbar.classList.add('advanced-search-toolbar');

    // make HTML
    const CONDITIONS = [
      {
        condition: 'type',
        label: 'Variant type'
      },
      {
        condition: 'frequency',
        label: 'Alternative allele frequency'
      },
      {
        condition: 'count',
        label: 'Alternative allele count'
      },
      {
        condition: 'consequence',
        label: 'Consequence'
      },
      {
        condition: 'gene_symbol',
        label: 'Gene symbol'
      },
      {
        condition: 'significance',
        label: 'Clinical significance'
      },
      {
        condition: 'disease',
        label: 'Disease'
      }
    ];
    const COMMANDS = [
      {
        command: 'group',
        label: 'Group',
        shortcut: [71]
      },
      {
        command: 'ungroup',
        label: 'Ungroup',
        shortcut: [16, 71]
      },
      {
        command: 'copy',
        label: 'Copy',
        shortcut: [67]
      },
      {
        command: 'edit',
        label: 'Edit',
        shortcut: [69]
      },
      {
        command: 'delete',
        label: 'Delete',
        shortcut: [46]
      }
    ];
    toolbar.innerHTML = `
    <ul>
      <li class="-haschild">
        <p>Add condition</p>
        <ul>
          ${CONDITIONS.map((condition, index) => `
          <li class="command" data-command="add-condition" data-condition="${condition.condition}" data-shortcut="${index + 1}">
            <p>${condition.label}</p>
            <small class="shortcut"><span class="char -command"></span>${index + 1}</small>
          </li>
          `).join('')}
        </ul>
      </li>
      ${COMMANDS.map(command => `
      <li class="command" data-command="${command.command}">
        <p>${command.label}<small class="shortcut"><span class="char -command"></span>${String.fromCharCode(...command.shortcut)}</small></p>
      </li>
      `).join('')}
    </ul>
    `;

    toolbar.querySelectorAll('.command').forEach(command => {
      command.addEventListener('click', () => {
        switch (command.dataset.command) {
          case 'add-condition': this._delegate._addCondition(command.dataset.condition); break;
          case 'group': this._delegate._group(); break;
          case 'ungroup': this._delegate._ungroup(); break;
          case 'copy': this._delegate._copy(); break;
          case 'edit': this._delegate._edit(); break;
          case 'delete': this._delegate._delete(); break;
        }
      });
    });
  }

}