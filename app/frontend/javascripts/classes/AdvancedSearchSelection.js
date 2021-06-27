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
          for (const el of store.stored) {
              el.classList.remove('-selected');
          }
          // Clear previous selection
          this._selectionArea.clearSelection();
        }
      })
      .on('move', ({store: {changed: {added, removed}}}) => {
        // Add a custom class to the elements that where selected.
        for (const el of added) {
          el.classList.add('-selected');
        }
        // Remove the class from elements that where removed
        // since the last selection
        for (const el of removed) {
          el.classList.remove('-selected');
        }
      })
      .on('stop', (e) => {
        console.log(e)
        document.body.dataset.dragging = false;
        this._selectionArea.keepSelection();
        this._builder.selectConditionViews(e.store.selected.map(el => el.delegate));
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


  // private methods


}