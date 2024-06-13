import { HierarchyNode, hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../definition.js';
import { ADVANCED_CONDITIONS } from '../global.js';
import ConditionItemView from './ConditionItemView.js';
import ConditionValueEditor from './ConditionValueEditor.js';
import ConditionValues from './ConditionValues.js';

type DataNode = {
  id: string;
  label: string;
  value: string;
  children?: Array<DataNode>;
};

type DataNodeWithChecked = DataNode & {
  checked: boolean;
  indeterminate?: boolean;
};

export default class ConditionValueEditorColumnsDataset extends ConditionValueEditor {
  _lastValueViews: Array<HTMLDivElement>;
  _data: HierarchyNode<DataNodeWithChecked>;
  _columns: HTMLElement;
  _description: HTMLElement;
  _nodesToShowInValueView: Array<HierarchyNode<DataNodeWithChecked>>;

  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._prepareData();

    this._nodesToShowInValueView = [];
    // HTML
    this._createElement(
      'columns-editor-view',
      `
    <header>Select ${this._conditionType}</header>
    <div class="body">
      <div class="columns"></div>
      <div class="description"></div>
    </div>`
    );
    this._columns = this._body.querySelector(':scope > .columns');
    this._description = this._body.querySelector(':scope > .description');
    this._drawColumn();
  }

  // public methods

  /** on click pencil icon in value view, save last values */
  keepLastValues() {
    this._lastValueViews = this._valueViews;
  }

  /** Restore last values (on press Cancel button) */
  restore() {
    //reset all checked
    this._data.each((datum) => {
      datum.data.checked = false;
    });

    for (const lastValue of this._lastValueViews) {
      const node = this._data.find(
        (d) => d.data.value === lastValue.dataset['value']
      );
      if (!node) continue;
      node.data.checked = true;
      this._updateChildren(node, true);
      this._updateParents(node, true);
    }
    this._update();
    this._updateValueViews(this._lastValueViews);
  }

  get isValid() {
    return this._valueViews.length > 0;
  }

  // private methods

  _prepareData() {
    switch (this._conditionType) {
      case CONDITION_TYPE.dataset: {
        const data = ADVANCED_CONDITIONS[this._conditionType]
          .values as DataNodeWithChecked[];
        const hierarchyData = hierarchy<DataNodeWithChecked>({
          id: '-1',
          label: 'root',
          value: '',
          children: data,
          checked: false,
          indeterminate: false,
        });
        for (const child of hierarchyData.descendants()) {
          child.data.checked = false;
          child.data.indeterminate = false;
        }
        return hierarchyData;
      }
      default:
        throw new Error(
          'ConditionValueEditorColumnsDataset - Invalid condition type'
        );
    }
  }

  _drawColumn(parentId?: string) {
    this._getItems(parentId).then((items) => {
      // make HTML
      const column = document.createElement('div');
      column.classList.add('column');
      column.dataset.depth = this._columns
        .querySelectorAll(':scope > .column')
        .length.toString();
      this._columns.append(column);
      column.innerHTML = `
        <ul>
          ${items
            .map((item) => {
              return `<li
              ${item.data.id ? `data-id="${item.data.id}"` : ''}
              ${item.data.value ? `data-value="${item.data.value}"` : ''}
              ${item.parent ? `data-parent="${item.parent.data.id}"` : ''}
            >
              <label>
                <input type="checkbox" value=${item.data.id}>
                ${
                  this._conditionType === CONDITION_TYPE.dataset &&
                  item.depth === 1
                    ? `<span class="dataset-icon" data-dataset="${item.data.value}"></span>`
                    : ''
                }
                <span>${item.data.label}</span>
              </label>
              ${
                item.children === undefined
                  ? ''
                  : `<div class="arrow" data-id="${item.data.id}"></div>`
              }
            </li>`;
            })
            .join('')}
        </ul>`;

      // attach events
      // add/remove condition
      column.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const checked = target.checked;
        const nodeId = target.closest('li').dataset.id;
        const changedNode = this._data.find((datum) => datum.data.id == nodeId);

        if (changedNode.children) this._updateChildren(changedNode, checked);
        if (changedNode.parent) this._updateParents(changedNode, checked);

        this._update();
      });

      // drill down
      for (const item of column.querySelectorAll(':scope > ul > li > .arrow')) {
        item.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const item = target.closest('li');
          const closestColumn: HTMLElement = item.closest('.column');
          const closestColumns: HTMLElement = item.closest('.columns');
          // release selecting item, and remove subdirectory
          item.parentNode
            .querySelector(':scope > .-selected')
            ?.classList.remove('-selected');
          const depth = parseInt(closestColumn.dataset.depth);
          for (const column of closestColumns.querySelectorAll(
            ':scope > .column'
          )) {
            //@ts-ignore
            if (parseInt(column.dataset.depth) > depth)
              column.parentNode.removeChild(column);
          }
          // select, and drill down
          item.classList.add('-selected');

          this._drawColumn(target.dataset.id);
        });
      }
      this._update();

      // scroll
      const left = this._body.scrollWidth - this._body.clientWidth;
      if (left > 0) {
        this._body.scrollTo({
          top: 0,
          left: left,
          behavior: 'smooth',
        });
      }
    });
  }

  _getItems(parentId?: string): Promise<HierarchyNode<DataNodeWithChecked>[]> {
    return new Promise((resolve, reject) => {
      if (!parentId) resolve(this._data.children);
      const found = this._data.find((datum) => datum.data.id === parentId);
      resolve(found?.children);
    });
  }

  _updateChildren(node: HierarchyNode<DataNodeWithChecked>, checked: boolean) {
    // reflect
    if (!node.children || node.children.length === 0) return;

    node.descendants().forEach((d) => {
      d.data.checked = checked;
    });
  }

  /** Update the parent nodes of the given node */
  _updateParents(
    dataNode: HierarchyNode<DataNodeWithChecked> | undefined,
    checked?: boolean
  ) {
    if (!dataNode) return;

    if (typeof checked === 'boolean') {
      // clicked this node
      dataNode.data.checked = checked;
      dataNode.data.indeterminate = false;
    } else {
      // clicked some descendant node
      const numberOfChecked = dataNode.children.filter(
        (child) => child.data.checked
      ).length;

      const everyChecked = numberOfChecked === dataNode.children.length;
      const someButNotEveryChecked =
        numberOfChecked > 0 && numberOfChecked < dataNode.children.length;
      const someIndeterminate = dataNode.children.some(
        (child) => child.data.indeterminate
      );

      dataNode.data.checked = everyChecked;
      dataNode.data.indeterminate = someIndeterminate || someButNotEveryChecked;
    }

    this._updateParents(dataNode.parent);
  }

  _update() {
    // reflect check status in DOM
    this._data.eachAfter((datum) => {
      const checkbox: HTMLInputElement = this._columns.querySelector(
        `li[data-id="${datum.data.id}"] > label > input`
      );
      if (checkbox) {
        checkbox.checked = !datum.data.indeterminate && datum.data.checked;
        checkbox.indeterminate =
          !datum.data.checked && datum.data.indeterminate;
      }
    });

    // update values in the value view (ellipsises at the top)

    this._processValuesToShowInValueView();
    this._clearValueViews();

    for (const valueViewToAdd of this._nodesToShowInValueView) {
      this._addValueView(
        valueViewToAdd.data.value,
        this._getLabelForValueToShow(valueViewToAdd)
      );
    }

    // validation
    this._valuesView.update(this._validate());
  }

  _processValuesToShowInValueView() {
    this._nodesToShowInValueView = concatNodesToParent(this._data);
  }

  /** Get the label with path to show in the value view */
  _getLabelForValueToShow(node: HierarchyNode<DataNodeWithChecked>) {
    const [, ...path] = node.path(this._data).reverse();
    return path.map((d) => d.data.label).join(' > ');
  }

  _validate() {
    return this.isValid;
  }
}

function concatNodesToParent(node: HierarchyNode<DataNodeWithChecked>) {
  if (!node.children) {
    if (node.data.checked) {
      return node;
    } else {
      return undefined;
    }
  }
  const children = node.children;
  const everyChildChecked = children.every((child) => child.data.checked);

  if (everyChildChecked && node.data.value) {
    return node;
  } else {
    return children
      .flatMap((child) => concatNodesToParent(child))
      .filter(Boolean);
  }
}
