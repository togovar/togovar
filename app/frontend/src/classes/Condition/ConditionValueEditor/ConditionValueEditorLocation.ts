import { storeManager } from '../../../store/StoreManager';
import { ConditionValueEditor } from './ConditionValueEditor';
import { createEl } from '../../../utils/dom/createEl';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import '../../../components/ConditionItemValueView';

// ============================================================================
// Constants
// ============================================================================

const CHROMOSOME_OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => String(index + 1)),
  'X',
  'Y',
  'MT',
];

const INPUT_MODE = {
  REGION: 'region',
  SINGLE_POSITION: 'single_position',
} as const;

const DEFAULT_START_POSITION = 1;

// ============================================================================
// Types
// ============================================================================

type InputMode = (typeof INPUT_MODE)[keyof typeof INPUT_MODE];

interface KaryotypeData {
  reference?: string;
  chromosomes?: Record<string, ChromosomeInfo>;
}

interface ChromosomeInfo {
  region?: Record<string, [number, number]>;
}

export class ConditionValueEditorLocation extends ConditionValueEditor {
  private _singlePositionCheckbox!: HTMLInputElement;
  private _chromosomeSelect!: HTMLSelectElement;
  private _startPositionInput!: HTMLInputElement;
  private _endPositionInput!: HTMLInputElement;
  private _positionInputContainer!: HTMLSpanElement;

  // State
  /** Reference genome karyotype data for chromosome length validation */
  private _karyotypeData: KaryotypeData | null = null;

  constructor(
    conditionValues: ConditionValues,
    conditionItemView: ConditionItemView
  ) {
    super(conditionValues, conditionItemView);

    this._buildUI();
    this._loadKaryotypeData();
    this._attachEventListeners();
    this._initializeFromExistingValue();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /** Preserve current state (no-op for this editor) */
  keepLastValues(): void {
    // No-op: state is rebuilt from value views when needed
    // TODO
  }

  /** Restore UI state from existing value views */
  restore(): void {
    this._loadFromValueViews();
    this._updateValueAndValidation();
  }

  /** Check if current input represents a valid genomic location */
  get isValid(): boolean {
    if (this._chromosomeSelect.value === '') return false;

    const mode = this._positionInputContainer.dataset.type as InputMode;

    if (mode === INPUT_MODE.REGION) {
      return this._isValidRegion();
    }

    if (mode === INPUT_MODE.SINGLE_POSITION) {
      return this._isValidSinglePosition();
    }

    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UI Construction
  // ──────────────────────────────────────────────────────────────────────────

  /** Build the complete editor UI structure */
  private _buildUI(): void {
    const modeToggleRow = this._createModeToggleRow();
    const positionInputRow = this._createPositionInputRow();

    this.createSectionEl('location-editor-view', [
      createEl('header', { text: `Set ${this.conditionType}` }),
      createEl('div', {
        class: 'body',
        children: [modeToggleRow, positionInputRow],
      }),
    ]);
  }

  /** Create the row with single position checkbox toggle */
  private _createModeToggleRow(): HTMLDivElement {
    return createEl('div', {
      class: 'row',
      children: [
        createEl('label', {
          children: [
            (this._singlePositionCheckbox = createEl('input', {
              attrs: {
                type: 'checkbox',
                name: 'range-or-position',
                value: INPUT_MODE.SINGLE_POSITION,
              },
            })),
            ' Single position',
          ],
        }),
      ],
    });
  }

  /** Create the row with chromosome and position inputs */
  private _createPositionInputRow(): HTMLDivElement {
    return createEl('div', {
      class: 'row',
      children: [
        createEl('label', {
          class: 'chromosome',
          children: [
            createEl('span', { class: 'label', text: 'Chr.' }),
            createEl('span', {
              class: 'form',
              children: [
                (this._chromosomeSelect = createEl('select', {
                  children: CHROMOSOME_OPTIONS.map((value) =>
                    createEl('option', { attrs: { value }, text: value })
                  ),
                })),
              ],
            }),
          ],
        }),
        createEl('span', { class: 'label', text: ':' }),
        createEl('label', {
          class: 'position',
          children: [this._createPositionInputContainer()],
        }),
      ],
    });
  }

  /** Create container with start/end position inputs */
  private _createPositionInputContainer(): HTMLSpanElement {
    this._positionInputContainer = createEl('span', {
      class: ['form', 'range-inputs-view'],
      dataset: { type: INPUT_MODE.REGION },
      children: [
        (this._startPositionInput = createEl('input', {
          class: 'start',
          attrs: { type: 'number', min: String(DEFAULT_START_POSITION) },
        })),
        createEl('span', { class: 'line' }),
        (this._endPositionInput = createEl('input', {
          class: 'end',
          attrs: { type: 'number', min: String(DEFAULT_START_POSITION) },
        })),
      ],
    });

    return this._positionInputContainer;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Event Handling
  // ──────────────────────────────────────────────────────────────────────────

  /** Attach all event listeners to UI elements */
  private _attachEventListeners(): void {
    // Handle toggle between region and single position modes
    this._singlePositionCheckbox.addEventListener('change', () => {
      const mode = this._singlePositionCheckbox.checked
        ? INPUT_MODE.SINGLE_POSITION
        : INPUT_MODE.REGION;

      this._positionInputContainer.dataset.type = mode;
      this._updateValueAndValidation();
    });

    // Handle chromosome selection change and update position constraints
    this._chromosomeSelect.addEventListener('change', () => {
      const maxPosition = this._getChromosomeMaxPosition();

      if (maxPosition) {
        this._updatePositionConstraints(maxPosition);
        this._enforcePositionLimits(maxPosition);
      }

      this._updateValueAndValidation();
    });

    this._startPositionInput.addEventListener('change', () => {
      this._updateValueAndValidation();
    });

    this._endPositionInput.addEventListener('change', () => {
      this._updateValueAndValidation();
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Data Loading
  // ──────────────────────────────────────────────────────────────────────────

  /** Load karyotype reference data from store */
  private _loadKaryotypeData(): void {
    const data = storeManager.getData('karyotype');
    this._karyotypeData = data as KaryotypeData | null;
  }

  /** Initialize UI from existing condition value if present */
  private _initializeFromExistingValue(): void {
    this._loadFromValueViews();
    this._updateValueAndValidation();
  }

  /**
   * Parse existing value view and populate UI controls.
   * Expected format: "chr:start-end" or "chr:start"
   * Examples: "7:123-456", "X:999"
   */
  private _loadFromValueViews(): void {
    const valueView = this.conditionItemValueViews?.[0];
    const rawValue = valueView?.value || valueView?.label;

    if (!rawValue || typeof rawValue !== 'string') return;

    const parsed = this._parseLocationString(rawValue.trim());
    if (!parsed) return;

    this._applyParsedLocation(parsed);
  }

  /**
   * Parse location string into components.
   * @param locationStr - String like "7:123-456" or "X:999"
   * @returns Parsed components or null if invalid format
   */
  private _parseLocationString(locationStr: string): {
    chromosome: string;
    start: string;
    end?: string;
  } | null {
    const match = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(locationStr);
    if (!match) return null;

    const [, chromosome, start, end] = match;
    return { chromosome, start, end };
  }

  /** Apply parsed location data to UI controls */
  private _applyParsedLocation(parsed: {
    chromosome: string;
    start: string;
    end?: string;
  }): void {
    if (CHROMOSOME_OPTIONS.includes(parsed.chromosome)) {
      this._chromosomeSelect.value = parsed.chromosome;
    }

    this._startPositionInput.value = parsed.start;

    if (parsed.end) {
      this._positionInputContainer.dataset.type = INPUT_MODE.REGION;
      this._endPositionInput.value = parsed.end;
      this._singlePositionCheckbox.checked = false;
    } else {
      this._positionInputContainer.dataset.type = INPUT_MODE.SINGLE_POSITION;
      this._endPositionInput.value = '';
      this._singlePositionCheckbox.checked = true;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────────────────────────────────

  /** Check if current region input is valid */
  private _isValidRegion(): boolean {
    const hasStartValue = this._startPositionInput.value !== '';
    const hasEndValue = this._endPositionInput.value !== '';
    const startLessThanEnd =
      +this._startPositionInput.value < +this._endPositionInput.value;

    return hasStartValue && hasEndValue && startLessThanEnd;
  }

  /** Check if current single position input is valid */
  private _isValidSinglePosition(): boolean {
    return this._startPositionInput.value !== '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Karyotype Utilities
  // ──────────────────────────────────────────────────────────────────────────

  /** Get maximum valid position for currently selected chromosome */
  private _getChromosomeMaxPosition(): number | null {
    if (!this._karyotypeData?.reference) return null;

    const chromosome = this._chromosomeSelect.value;
    const chromosomeInfo = this._karyotypeData.chromosomes?.[chromosome];

    if (!chromosomeInfo?.region) return null;

    const region = chromosomeInfo.region[this._karyotypeData.reference];
    return region?.[1] ?? null;
  }

  /** Update position input constraints based on chromosome length */
  private _updatePositionConstraints(maxPosition: number): void {
    this._startPositionInput.max = String(maxPosition);
    this._endPositionInput.max = String(maxPosition);
  }

  /** Enforce position values within valid chromosome boundaries */
  private _enforcePositionLimits(maxPosition: number): void {
    // Initialize start position if empty
    if (this._startPositionInput.value === '') {
      this._startPositionInput.value = String(DEFAULT_START_POSITION);
    } else if (+this._startPositionInput.value > maxPosition) {
      this._startPositionInput.value = String(maxPosition);
    }

    // Initialize or cap end position
    if (this._endPositionInput.value === '') {
      this._endPositionInput.value = String(maxPosition);
    } else if (+this._endPositionInput.value > maxPosition) {
      this._endPositionInput.value = String(maxPosition);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Value Updates
  // ──────────────────────────────────────────────────────────────────────────

  /** Update value view based on current UI state and trigger validation */
  private _updateValueAndValidation(): void {
    const existingValueView = this.conditionItemValueViews[0];

    if (this.isValid) {
      const locationString = this._buildLocationString();
      this._updateOrCreateValueView(existingValueView, locationString);
    } else {
      this.removeValueView('');
    }

    this.conditionValues.update(this.isValid);
  }

  /** Build location string from current UI state */
  private _buildLocationString(): string {
    const chromosome = this._chromosomeSelect.value;
    const start = this._startPositionInput.value;
    const isRegionMode =
      this._positionInputContainer.dataset.type === INPUT_MODE.REGION;

    if (isRegionMode) {
      const end = this._endPositionInput.value;
      return `${chromosome}:${start}-${end}`;
    }

    return `${chromosome}:${start}`;
  }

  /** Update existing value view or create new one */
  private _updateOrCreateValueView(
    existingView: ConditionItemValueView | undefined,
    locationString: string
  ): void {
    if (existingView) {
      existingView.label = locationString;
      existingView.value = locationString;
    } else {
      this.addValueView(locationString, locationString, true);
    }
  }

  /**
   * Apply options from karyotype selection (or other sources).
   * Expected format: { chr: string|number, start: number|string, end: number|string }
   */
  applyOptions(options: unknown): void {
    if (!options || typeof options !== 'object') return;

    const opts = options as Record<string, unknown>;
    const chr = opts.chr;
    const start = opts.start;
    const end = opts.end;

    // Convert chromosome to string
    const chrStr = String(chr);
    if (!chrStr) return;

    // Convert start/end to numbers (handle both number and string)
    const startNum =
      typeof start === 'number'
        ? start
        : start
        ? parseInt(String(start), 10)
        : null;
    const endNum =
      typeof end === 'number' ? end : end ? parseInt(String(end), 10) : null;

    // Set chromosome
    this._chromosomeSelect.value = chrStr;

    // Set start position
    if (startNum !== null && !isNaN(startNum)) {
      this._startPositionInput.value = String(startNum);
    }

    // Set end position (if provided and different from start)
    if (endNum !== null && !isNaN(endNum) && endNum !== startNum) {
      this._singlePositionCheckbox.checked = false;
      this._positionInputContainer.dataset.type = INPUT_MODE.REGION;
      this._endPositionInput.value = String(endNum);
    } else if (startNum !== null && !isNaN(startNum)) {
      // Single position mode
      this._singlePositionCheckbox.checked = true;
      this._positionInputContainer.dataset.type = INPUT_MODE.SINGLE_POSITION;
    }

    // Trigger validation and value update
    this._updateValueAndValidation();
  }
}
