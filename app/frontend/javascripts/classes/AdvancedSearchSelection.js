import SelectionArea from '@simonwep/selection-js';
// import AdvancedSearchBuilderView from './AdvancedSearchBuilderView';

export default class AdvancedSearchSelection {

  /**
   * 
   * @param {*} area 
   * @param {AdvancedSearchBuilderView} builder 
   */
  constructor(area, builder) {
    console.log( area )
    console.log( SelectionArea )
    this._builder = builder;
    this._selectionArea = new SelectionArea({
      class: 'selection-area',
      boundaries: ['#AdvancedSearchBuilderView'],
      selectables: [
        '#AdvancedSearchBuilderView > .inner > .advanced-search-condition-group-view.-root > .container .advanced-search-condition-group-view',
        '#AdvancedSearchBuilderView > .inner > .advanced-search-condition-group-view.-root > .container .advanced-search-condition-item-view'
      ],
      startareas: ['html'],
      overlap: 'invert',
      singleTap: {allow: false}
    });
    console.log( this._selectionArea )

    this._selectionArea
      // .on('beforestart', ({store, event}) => {
      //   console.log(store)
      // })
      .on('start', ({store, event}) => {
        document.body.dataset.dragging = true;
        if (!event.ctrlKey && !event.metaKey) {
          // Unselect all elements
          this.deselectAllConditions();
        }
      })
      .on('move', ({store: {changed: {added, removed}}}) => {
        // Add a custom class to the elements that where selected.
        for (const el of added) {
          el.delegate.select();
        }
        // Remove the class from elements that where removed
        // since the last selection
        for (const el of removed) {
          el.delegate.deselect();
        }
      })
      .on('stop', (e) => {
        console.log(e)
        document.body.dataset.dragging = false;
        this._selectionArea.keepSelection();
        console.log(...this._selectionArea.getSelection())
        // filter only top-level items
        const minDepth = this._selectionArea.getSelection().reduce((minDepth, el) => {
          const depth = el.delegate.depth;
          return minDepth > depth ? depth : minDepth;
        }, 9999);
        ([...this._selectionArea.getSelection()]).forEach(el => {
          const depth = el.delegate.depth;
          if (depth > minDepth) this._selectionArea.deselect(el);
        });
        console.log(...this._selectionArea.getSelection())
        this._builder.selectedConditionViews(e.store.selected.map(el => el.delegate));
      });
  }


  // public methods

  getSelectingConditionViews() {
    return this._selectionArea.getSelection().map(el => el.delegate);
  }

  deselectAllConditions() {
    for (const el of this._selectionArea.getSelection()) {
      console.log(el)
      el.delegate.deselect();
    }
    this._selectionArea.clearSelection();
  }

  /**
   * @param {Array} conditionViews
   * @param {Boolean} deselectSelecting
   */
  selectConditionViews(conditionViews, deselectSelecting = true) {
    console.log(conditionViews, deselectSelecting)
    if (deselectSelecting) this.deselectAllConditions();
    // this._selectionArea
    for (const conditionView of conditionViews) {
      conditionView.select();
      this._selectionArea.select(conditionView.elm);
    }
    this._selectionArea.keepSelection();
    console.log(this._selectionArea.getSelection())
  }

  deselectConditionViews(conditionViews) {
    console.log(conditionViews)
    for (const conditionView of conditionViews) {
      this._selectionArea.deselect(conditionView.elm);
    }
    console.log(this._selectionArea.getSelection())
  }  


  // private methods


}