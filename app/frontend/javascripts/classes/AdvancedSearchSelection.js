import SelectionArea from '@simonwep/selection-js';

export default class AdvancedSearchSelection {

  constructor(area) {
    console.log( area )
    console.log( SelectionArea )
    this._selectionArea = new SelectionArea({
      class: 'selection-area',
      boundaries: ['#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container'],
      selectables: ['#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container .advanced-search-group-view', '#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container .advanced-search-condition-view'],
      startareas: ['html'],
      overlap: 'invert',
      singleTap: {
        allow: false
      }
    });
    console.log( this._selectionArea )

    this._selectionArea
      // .on('beforestart', ({store, event}) => {
      //   console.log(store)
      // })
      .on('start', ({store, event}) => {
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
        this._selectionArea.keepSelection();
      });
  }
  
  _selectiong(store) {
    store.changed.added.forEach(el => {
      console.log(el.classList.contains('-editing'))
      if (!el.classList.contains('-editing')) {
        el.classList.add('-selected');
      }
    });
    store.changed.removed.forEach(el => el.classList.remove('-selected'));
  }


}