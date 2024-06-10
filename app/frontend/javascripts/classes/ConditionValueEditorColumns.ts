import { HierarchyNode, hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../definition.js';
import { ADVANCED_CONDITIONS, API_URL } from '../global.js';
import ConditionItemView from './ConditionItemView.js';
import ConditionValueEditor from './ConditionValueEditor.js';
import ConditionValues from './ConditionValues.js';

const SELECTION_DEPENDED_ON_PARENT = {
  consequence: true,
  disease: false,
  dataset: true,
};
const DISEASE_API = {
  PATH: `${API_URL}/sparqlist/api/advanced_search_disease_selector`,
  KEY: 'mesh_in',
};

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

export default class ConditionValueEditorColumns extends ConditionValueEditor {
  _lastValues: Array<any>;
  _data: HierarchyNode<DataNodeWithChecked>;
  _selectionDependedOnParent: any;
  _columns: HTMLElement;
  _description: HTMLElement;
  _nodesToShowInValueView: Array<HierarchyNode<DataNodeWithChecked>>;

  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._prepareData();
    this._selectionDependedOnParent =
      SELECTION_DEPENDED_ON_PARENT[this._conditionType];

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

  keepLastValues() {
    this._lastValues = this._data
      .descendants()
      .filter((datum) => datum.data.value && datum.data.checked)
      .map((datum) => datum.value);
  }

  restore() {
    this._data.each((datum) => {
      datum.data.checked = this._lastValues.indexOf(datum.data.value) !== -1;
    });
    // get checked leave nodes
    const checkedLeaves = this._data
      .leaves()
      .filter((leaf) => leaf.data.checked);
    const checkedLeavesParentIds: (string | number)[] = [];

    // update parents only for leaves that are not already updated
    for (const leaf of checkedLeaves) {
      if (checkedLeavesParentIds.includes(leaf.id)) continue;
      checkedLeavesParentIds.push(leaf.id);
      this._updateParents(leaf);
    }

    this._update();
  }

  get isValid() {
    return this._valueViews.length > 0;
  }

  // private methods

  _prepareData() {
    switch (this._conditionType) {
      case CONDITION_TYPE.consequence:
      case CONDITION_TYPE.dataset: {
        const data = ADVANCED_CONDITIONS[this._conditionType]
          .values as DataNodeWithChecked[];
        const hierarchyData = hierarchy<DataNodeWithChecked>({
          id: '-1',
          label: 'root',
          value: '',
          children: data,
          checked: false,
        });
        for (const child of hierarchyData.descendants()) {
          child.data.checked = false;
        }
        return hierarchyData;
      }

      // case CONDITION_TYPE.disease:
      //   return [] as HierarchyNode<DataNode>[];
    }
  }

  _drawColumn(parentId?: string) {
    console.log('parentId', parentId);
    this._getItems(parentId).then((items) => {
      // make HTML
      console.log('items', items);
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
                  this._conditionType === CONDITION_TYPE.dataset
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
      // TODO: alt allele, consequence と disease で、取り方が変わる
      switch (this._conditionType) {
        case CONDITION_TYPE.consequence:
        case CONDITION_TYPE.dataset: {
          console.log(this._data.children);
          if (!parentId) resolve(this._data.children);

          const found = this._data.find((datum) => datum.data.id === parentId);

          resolve(found?.children);
          break;
        }
        // case CONDITION_TYPE.disease:
        //   {
        //     let filtered = this._data.filter(
        //       (datum) => datum.parent === parentId
        //     );
        //     if (filtered.length) {
        //       resolve(filtered);
        //     } else {
        //       fetch(
        //         `${DISEASE_API.PATH}${
        //           parentId ? `?${DISEASE_API.KEY}=${parentId}` : ''
        //         }`
        //       )
        //         .then((response) => response.json())
        //         .then((data) => {
        //           const newData = data.map((datum) => {
        //             const label =
        //               datum.label.indexOf('|') === -1
        //                 ? datum.label
        //                 : datum.label.substr(0, datum.label.indexOf('|'));
        //             const newDatum = {
        //               id: datum.categoryId,
        //               label,
        //               value: label,
        //               checked: false,
        //             };
        //             // @ts-ignore
        //             if (parentId) newDatum.parent = parentId;
        //             // @ts-ignore
        //             if (datum.hasChild) newDatum.children = [];
        //             return newDatum;
        //           });
        //           this._data.push(...newData);
        //           // ad ids to parent datum
        //           if (parentId) {
        //             const parentDatum = this._data.find(
        //               (datum) => datum.id == parentId
        //             );
        //             parentDatum.children.push(
        //               ...newData.map((datum) => datum.id)
        //             );
        //           }
        //           resolve(newData);
        //         })
        //         .catch((error) => {
        //           console.error(error);
        //           reject(error);
        //         });
        //     }
        //   }
        //   break;
      }
    });
  }

  _updateChildren(node: HierarchyNode<DataNodeWithChecked>, checked: boolean) {
    // reflect

    if (!this._selectionDependedOnParent) return;

    node.descendants().forEach((descendant) => {
      descendant.data.checked = checked;
    });
  }

  _updateIndeterminate(id?: string) {
    if (!this._selectionDependedOnParent) return;

    const node = id
      ? this._data.find((datum) => datum.data.id === id)
      : this._data;

    if (node.parent) {
      const parent = node.parent;

      const children = parent.children;

      if (!children) return;
      const checked = children.every((child) => child.data.checked);

      const indeterminate = children.some(
        (child) => child.data.checked || child.data.indeterminate
      );

      parent.data.checked = checked;
      parent.data.indeterminate = !checked && !!indeterminate;

      const checkbox: HTMLInputElement = this._columns.querySelector(
        `li[data-id="${parent.data.id}"] > label > input`
      );
      checkbox.dataset.indeterminate = 'true';
      checkbox.indeterminate = parent.data.indeterminate;
    }

    this._data.eachAfter((node) => {
      const children = node.children;
      if (!children) return;
      const checked = children.every((child) => child.data.checked);

      const indeterminate = children.some(
        (child) => child.data.checked || child.data.indeterminate
      );

      node.data.checked = checked;
      node.data.indeterminate = !checked && !!indeterminate;

      const checkbox: HTMLInputElement = this._columns.querySelector(
        `li[data-id="${node.data.id}"] > label > input`
      );
      checkbox.dataset.indeterminate = 'true';
      checkbox.indeterminate = node.data.indeterminate;
    });

    // top level
    // const topLevelNodes = this._data.filter(
    //   (datum) => datum.parent === undefined
    // );
    // topLevelNodes.forEach((datum) => checkLeaves(datum));
  }

  /**
  Update the parent nodes of the given node
  */
  _updateParents(
    dataNode: HierarchyNode<DataNodeWithChecked>,
    checked?: boolean
  ) {
    if (!this._selectionDependedOnParent) return;

    if (typeof checked === 'boolean') {
      dataNode.data.checked = checked;
    }

    if (!dataNode.parent) return;

    const parent = dataNode.parent;

    // if this node get checked, then, maybe all psiblings are checked too, in that case, check the parent.
    if (checked) {
      parent.data.checked = parent.children.every(
        (child) => child.data.checked
      );

      parent.data.indeterminate = parent.children.some(
        (child) => !child.data.checked || child.data.indeterminate
      );

      // if this node get unchecked, then, uncheck the parent. If any of the siblings are checked or indeterminate, then, indeterminate.
    } else {
      parent.data.checked = false;

      parent.data.indeterminate = parent.children.some(
        (child) => child.data.checked || child.data.indeterminate
      );
    }

    this._updateParents(parent);
  }

  _update() {
    // reflect check status in DOM
    this._data.eachAfter((datum) => {
      const checkbox: HTMLInputElement = this._columns.querySelector(
        `li[data-id="${datum.data.id}"] > label > input`
      );
      if (checkbox) {
        checkbox.checked = !datum.data.indeterminate && datum.data.checked;
        checkbox.indeterminate = datum.data.indeterminate;
      }
    });
    // update selection status of upper hierarchy

    // update values

    this._processValuesToShowInValueView();
    this._clearValueViews();
    for (const valueViewToAdd of this._nodesToShowInValueView) {
      this._addValueView(valueViewToAdd.data.value, valueViewToAdd.data.label);
    }

    // validation
    this._valuesView.update(this._validate());
  }

  _processValuesToShowInValueView() {
    this._nodesToShowInValueView = concatNodesToParent(this._data);
  }

  _validate() {
    return this.isValid;
  }
}

function concatNodesToParent(node: HierarchyNode<DataNodeWithChecked>) {
  if (!node.children) return;
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
