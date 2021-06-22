import SelectionArea from '@simonwep/selection-js';

export default class AdvancedSearchSelection {

  constructor(area) {
    console.log( SelectionArea )
    this._selectionArea = new SelectionArea({
      class: 'selection-area',
      boundaries: ['#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container'],
      selectables: ['#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container .advanced-search-group-view', '#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container .advanced-search-condition-view']
    });
    console.log( this._selectionArea )

    this._selectionArea
      .on('beforestart', ({store, event}) => {
        console.log(store)
      })
      .on('start', ({store, event}) => {
        console.log('start', store)
        this._selectiong(store);
      })
      .on('move', ({store, event}) => {
        console.log('move', store)
        this._selectiong(store);
      })
      .on('stop', ({store, event}) => {
        console.log('stop', store)
        this._selectiong(store);
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