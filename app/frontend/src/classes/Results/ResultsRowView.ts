import { COLUMNS } from '../../global.js';
import { storeManager } from '../../store/StoreManager';
import '../../components/LogarithmizedBlockGraphFrequencyView';
import {
  ResultData,
  Column,
  TdFrequencies,
  FrequencyElement,
} from '../../types';
import {
  COLUMN_TEMPLATES,
  createFrequencyColumnHTML,
} from './ResultsColumnTemplates';
import { ResultsColumnUpdater } from './ResultsColumnUpdater';

/**
 * Class for managing a single row in the search results table
 *
 * Responsible for creating DOM elements, data binding, and state management for each row
 * Receives data change notifications from storeManager and updates corresponding DOM elements
 */
export class ResultsRowView {
  index: number; // Row index number
  selected: boolean; // Row selection state
  tr: HTMLTableRowElement; // Table row element

  // Cache for DOM elements
  // TogoVar ID
  togovarIdAnchor: HTMLAnchorElement | null;
  // RefSNP ID
  refsnpCell: HTMLTableCellElement | null;
  refsnpAnchor: HTMLAnchorElement | null;
  // Position
  positionChromosome: HTMLDivElement | null;
  positionCoordinate: HTMLDivElement | null;
  // Ref/Alt
  refElement: HTMLSpanElement | null;
  altElement: HTMLSpanElement | null;
  // Type
  typeElement: HTMLDivElement | null;
  // Gene
  geneCell: HTMLTableCellElement | null;
  geneAnchor: HTMLAnchorElement | null;
  // Alt frequency
  frequencyElements: TdFrequencies;
  // Consequence
  consequenceCell: HTMLTableCellElement | null;
  consequenceItem: HTMLDivElement | null;
  // Clinical significance
  clinicalSignificance: HTMLDivElement | null;
  clinicalAnchor: HTMLAnchorElement | null;
  clinicalIcon: HTMLSpanElement | null;
  // AlphaMissense
  alphaMissenseFunction: HTMLDivElement | null;
  // SIFT
  siftFunction: HTMLDivElement | null;
  // PolyPhen
  polyphenFunction: HTMLDivElement | null;

  /**
   * Constructor for ResultsRowView
   *
   * @param index - Row index number in the table
   */
  constructor(index: number) {
    this.index = index;
    this.selected = false;
    this.tr = this._createTableRow();

    // Watch for changes to `selectedRow` and apply _handleSelectedRowChange() method
    storeManager.subscribe(
      'selectedRow',
      this._handleSelectedRowChange.bind(this)
    );
    // Watch for changes to `offset` and update the table row
    storeManager.subscribe('offset', this.updateTableRow.bind(this));
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * Update table row data
   *
   * Receives notifications from storeManager and updates the row display content
   * Sets appropriate display state based on data fetching status
   */
  updateTableRow() {
    if (
      storeManager.getData('isFetching') ||
      storeManager.getData('isStoreUpdating')
    ) {
      return this._setLoadingState();
    }

    // Rows beyond range are hidden using style (-out-of-range)
    const rowCount = storeManager.getData('rowCount');
    if (rowCount <= this.index) {
      return this._setOutOfRangeState();
    }

    const result = storeManager.getRecordByIndex(this.index);
    if (!result || result === 'loading' || result === 'out of range') {
      return this._setLoadingState();
    }

    this._prepareTableData();

    // Update data for each column
    COLUMNS.forEach((column) => this._updateColumnContent(column, result));

    this.tr.classList.remove('-loading', '-out-of-range');
  }

  // ========================================
  // Public Methods
  // ========================================

  // Event Handlers --------------------------------

  /**
   * Handler for when a row is clicked
   *
   * Toggles selection state and fires a custom event
   */
  private _handleRowClick() {
    storeManager.setData('selectedRow', this.selected ? undefined : this.index);

    // Dispatch custom event to notify tap completion
    const tapCompletedEvent = new CustomEvent('tapCompleted', {
      bubbles: true,
      detail: { rowIndex: this.index },
    });
    this.tr.dispatchEvent(tapCompletedEvent);
  }

  /**
   * Handle selected row changes
   *
   * @param selectedIndex - Index of the selected row
   */
  private _handleSelectedRowChange(selectedIndex: number) {
    this.selected = selectedIndex === this.index;
    this.tr.classList.toggle('-selected', this.selected);
  }

  // DOM Creation and State Management --------------------------------

  /**
   * Create table row element
   *
   * @returns Created table row element
   */
  private _createTableRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.classList.add('-loading');
    tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
    tr.addEventListener('click', this._handleRowClick.bind(this));
    return tr;
  }

  /**
   * Set row to loading state
   */
  private _setLoadingState() {
    this.tr.classList.add('-loading');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  /**
   * Set row to out-of-range state
   */
  private _setOutOfRangeState() {
    this.tr.classList.add('-out-of-range');
    this.tr.innerHTML = `<td colspan="${COLUMNS.length}"></td>`;
  }

  // Data Preparation and HTML Generation --------------------------------

  /**
   * Prepare table data
   *
   * Generate HTML and cache DOM elements
   */
  private _prepareTableData() {
    this.tr.innerHTML = this._createTableCellHTML();
    this._cacheTableCells();
  }

  /**
   * Dynamically generate table cell HTML
   *
   * @returns Generated HTML string
   */
  private _createTableCellHTML(): string {
    return COLUMNS.map((column) => {
      if (column.id === 'alt_frequency') {
        return createFrequencyColumnHTML();
      }
      return COLUMN_TEMPLATES[column.id] || '';
    }).join('');
  }

  // DOM Element Caching --------------------------------
  /**
   * Cache table cell elements
   *
   * Pre-cache frequently accessed DOM elements for performance improvement
   */
  private _cacheTableCells() {
    this._cacheBasicElements();
    this._cacheFrequencyElements();
    this._cacheFunctionElements();
  }

  /**
   * Cache basic table cell elements
   */
  private _cacheBasicElements() {
    // TogoVar ID
    this.togovarIdAnchor = this.tr.querySelector('td.togovar_id > a');

    // RefSNP ID
    this.refsnpCell = this.tr.querySelector('td.refsnp_id');
    this.refsnpAnchor = this.refsnpCell?.querySelector('a') || null;

    // Position
    const tdPosition = this.tr.querySelector(
      'td.position > .chromosome-position'
    );
    this.positionChromosome = tdPosition?.querySelector('.chromosome') || null;
    this.positionCoordinate = tdPosition?.querySelector('.coordinate') || null;

    // Ref/Alt
    const tdRefAlt = this.tr.querySelector('td.ref_alt > .ref-alt');
    this.refElement = tdRefAlt?.querySelector('span.ref') || null;
    this.altElement = tdRefAlt?.querySelector('span.alt') || null;

    // Type
    this.typeElement = this.tr.querySelector('td.type > .variant-type');

    // Gene
    this.geneCell = this.tr.querySelector('td.gene');
    this.geneAnchor = this.geneCell?.querySelector('a') || null;

    // Consequence
    this.consequenceCell = this.tr.querySelector('td.consequence');
    this.consequenceItem =
      this.consequenceCell?.querySelector('.consequence-item') || null;

    // Clinical significance
    const tdClinical = this.tr.querySelector('td.clinical_significance');
    this.clinicalSignificance =
      tdClinical?.querySelector('.clinical-significance') || null;
    this.clinicalAnchor = tdClinical?.querySelector('a') || null;
    this.clinicalIcon = tdClinical?.querySelector('span.icon') || null;
  }

  /**
   * Cache frequency-related table cell elements
   */
  private _cacheFrequencyElements() {
    this.frequencyElements = {};
    this.tr
      .querySelectorAll(
        'td.alt_frequency > logarithmized-block-graph-frequency-view'
      )
      .forEach((elm) => {
        const element = elm as FrequencyElement;
        const datasetId = element.dataset.dataset;
        if (datasetId) {
          this.frequencyElements[datasetId] = element;
        }
      });
  }

  /**
   * Cache function prediction-related table cell elements
   */
  private _cacheFunctionElements() {
    // AlphaMissense
    const tdAlphaMissense = this.tr.querySelector('td.alphamissense');
    this.alphaMissenseFunction =
      tdAlphaMissense?.querySelector('.variant-function') || null;

    // SIFT
    const tdSift = this.tr.querySelector('td.sift');
    this.siftFunction = tdSift?.querySelector('.variant-function') || null;

    // PolyPhen
    const tdPolyphen = this.tr.querySelector('td.polyphen');
    this.polyphenFunction =
      tdPolyphen?.querySelector('.variant-function') || null;
  }

  // Column Content Updates --------------------------------

  /**
   * Update content for the specified column
   *
   * @param column - Column definition to update
   * @param result - Display data
   */
  private _updateColumnContent(column: Column, result: ResultData) {
    const columnHandlers = {
      togovar_id: () =>
        ResultsColumnUpdater.updateTogovarId(
          this.togovarIdAnchor,
          result.id,
          `/variant/${result.id}`
        ),
      refsnp_id: () =>
        ResultsColumnUpdater.updateRefSNP(
          this.refsnpCell,
          this.refsnpAnchor,
          result.existing_variations
        ),
      position: () =>
        ResultsColumnUpdater.updatePosition(
          this.positionChromosome,
          this.positionCoordinate,
          result.chromosome,
          result.position
        ),
      ref_alt: () =>
        ResultsColumnUpdater.updateRefAlt(
          this.refElement,
          this.altElement,
          result.reference,
          result.alternate
        ),
      type: () =>
        ResultsColumnUpdater.updateVariantType(this.typeElement, result.type),
      gene: () =>
        ResultsColumnUpdater.updateGene(
          this.geneCell,
          this.geneAnchor,
          result.symbols
        ),
      alt_frequency: () =>
        ResultsColumnUpdater.updateAltFrequency(
          this.frequencyElements,
          result.frequencies
        ),
      consequence: () =>
        ResultsColumnUpdater.updateConsequence(
          this.consequenceCell,
          this.consequenceItem,
          result.most_severe_consequence,
          result.transcripts
        ),
      clinical_significance: () =>
        ResultsColumnUpdater.updateClinicalSignificance(
          this.clinicalSignificance,
          this.clinicalAnchor,
          this.clinicalIcon,
          result.significance
        ),
      alphamissense: () =>
        ResultsColumnUpdater.updateAlphaMissense(
          this.alphaMissenseFunction,
          result.alphamissense
        ),
      sift: () =>
        ResultsColumnUpdater.updateSift(this.siftFunction, result.sift),
      polyphen: () =>
        ResultsColumnUpdater.updatePolyphen(
          this.polyphenFunction,
          result.polyphen
        ),
    };
    columnHandlers[column.id]?.();
  }
}
