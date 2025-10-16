import { PanelView } from './PanelView';
import { storeManager } from '../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
  getSimpleSearchConditionMaster,
} from '../../store/searchManager';
import type {
  SimpleSearchCurrentConditions,
  FrequencyMasterCondition,
} from '../../types/search';
import '../../components/RangeSliderView';

/**
 * Panel view component for filtering variants by alternative allele frequency.
 *
 * This component manages a range slider that allows users to filter genetic variants
 * based on their alternative allele frequency values. It supports:
 * - Setting minimum and maximum frequency thresholds (0.0 - 1.0)
 * - Inverting the range selection
 * - Matching conditions across datasets (any/all)
 */
export class PanelViewFilterAlternativeAlleleFrequency extends PanelView {
  private _rangeSelectorView: HTMLElementTagNameMap['range-slider'];

  // TODO: change elm to "panelViewEl"
  constructor(elm: Element) {
    super(elm, 'frequency');

    const condition = this._getOrCreateCondition();
    this._rangeSelectorView = this._createRangeSlider(condition);
    this._mountRangeSlider();
    storeManager.bind('simpleSearchConditions', this);
  }

  /**
   * Store observer callback - invoked when simpleSearchConditions change.
   * This method is called by the store when URL parameters change or
   * when search conditions are reset.
   *
   * Currently a no-op because the range-slider component already reacts to
   * user interactions and updates the store, creating a unidirectional data flow.
   * If we need to sync slider UI with external store changes (e.g., from URL),
   * we can update it here:
   *
   * @example
   * this._rangeSelectorView.value1 = condition.from;
   * this._rangeSelectorView.value2 = condition.to;
   *
   * @param conditions - Updated search conditions from store
   */
  simpleSearchConditions(conditions: SimpleSearchCurrentConditions): void {
    const condition = conditions.frequency;
    if (condition === undefined) return;

    // Currently no-op: slider updates via user interaction → store → search
    // Future: Could add store → slider sync here if needed for URL/external changes
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Current condition values from store (or create with defaults)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Retrieves frequency condition from store, or creates one with defaults if not found.
   * Ensures all required fields exist, filling any missing ones with default values.
   *
   * @returns Complete frequency condition object with all required fields
   */
  private _getOrCreateCondition(): NonNullable<
    SimpleSearchCurrentConditions['frequency']
  > {
    const condition = getSimpleSearchCondition('frequency');
    const conditionMaster: FrequencyMasterCondition =
      getSimpleSearchConditionMaster('frequency')!;
    const items = conditionMaster.items;

    // Use existing values when available, fall back to defaults when missing
    return {
      from: condition?.from ?? items[0].default,
      to: condition?.to ?? items[1].default,
      invert: condition?.invert ?? items[2].default,
      match: condition?.match ?? items[3].default,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Range slider setup and event handling
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Creates and configures a range slider element with initial values.
   *
   * @param condition - Initial frequency condition values (from, to, invert, match)
   * @returns Configured range-slider element
   */
  private _createRangeSlider(
    condition: NonNullable<SimpleSearchCurrentConditions['frequency']>
  ): HTMLElementTagNameMap['range-slider'] {
    const rangeSlider = document.createElement('range-slider');

    // Set slider range values
    rangeSlider.value1 = condition.from;
    rangeSlider.value2 = condition.to;

    // Configure slider precision
    rangeSlider.sliderStep = 0.01; // Fine control for dragging
    rangeSlider.inputStep = 0.05; // Coarser control for input fields

    // Set search type for context-specific behavior
    rangeSlider.searchType = 'simple';

    // Listen for user changes and update store
    rangeSlider.addEventListener('range-changed', (e) => {
      e.stopPropagation();

      // Although the range-slider component currently emits all 4 properties,
      // the type definition allows them to be optional. We defensively merge
      // with current store values to handle potential undefined values.
      const currentCondition = this._getOrCreateCondition();
      const { from, to, invert, match } = e.detail;

      const updatedCondition = {
        ...currentCondition,
        ...(from !== undefined && { from }),
        ...(to !== undefined && { to }),
        ...(invert !== undefined && { invert }),
        ...(match !== undefined && { match }),
      };

      // Persist to store (triggers search execution)
      setSimpleSearchCondition('frequency', updatedCondition);
    });

    return rangeSlider;
  }

  /**
   * Mounts the range slider element to the panel's container.
   */
  private _mountRangeSlider(): void {
    const rangeSelectorContainer = this.elm.querySelector(
      '.range-selector-view'
    );
    if (rangeSelectorContainer) {
      rangeSelectorContainer.appendChild(this._rangeSelectorView);
    }
  }
}
