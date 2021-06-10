import SelectionArea from '@simonwep/selection-js';

export default class AdvancedSearchSelection {

  constructor(area) {
    console.log( SelectionArea )
    this._selectionArea = new SelectionArea({
      class: 'selection-area',
      boundaries: ['#AdvancedSearchBuilderView > .inner > .advanced-search-group-view.-root > .container'],
      selectables: ['.advanced-search-group-view', '.advanced-search-condition-view']
    });
    console.log( this._selectionArea )

    this._selectionArea
      .on('beforestart', e => {
        console.log(e)
      })
      .on('start', e => {
        console.log(e)
      })
      .on('move', e => {
        console.log(e)
      })
      .on('stop', ({store, event}) => {
        console.log(store)
      });
  }

}