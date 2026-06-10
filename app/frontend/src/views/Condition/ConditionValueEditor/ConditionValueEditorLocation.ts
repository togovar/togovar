import { storeManager } from '../../../store/StoreManager';
import { ConditionValueEditor } from './ConditionValueEditor';
import { createEl } from '../../../utils/dom/createEl';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import '../ConditionItemValueView';

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

/** ゲノム座標（染色体・範囲 or 単一位置）を入力するエディタ。 */
export class ConditionValueEditorLocation extends ConditionValueEditor {
  private _singlePositionCheckbox!: HTMLInputElement;
  private _chromosomeSelect!: HTMLSelectElement;
  private _startPositionInput!: HTMLInputElement;
  private _endPositionInput!: HTMLInputElement;
  private _positionInputContainer!: HTMLSpanElement;

  /** 染色体長バリデーションに使うカリオタイプデータ。Storeから読み込む。 */
  private _karyotypeData: KaryotypeData | null = null;

  /** Cancel時に戻す基準として保存するUI状態のスナップショット。 */
  private _savedState: {
    chromosome: string;
    startPosition: string;
    endPosition: string;
    isSinglePosition: boolean;
  } | null = null;

  /**
   * UI生成・カリオタイプデータ読み込み・イベント登録・既存値からの復元を順に行う。
   * UI確定後にイベントを登録し、既存値があれば最後に反映することで初期表示が正しくなる。
   */
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

  /** Cancel時に戻す基準として現在のUI状態をスナップショットとして保存する。 */
  keepLastValues(): void {
    this._savedState = {
      chromosome: this._chromosomeSelect.value,
      startPosition: this._startPositionInput.value,
      endPosition: this._endPositionInput.value,
      isSinglePosition: this._singlePositionCheckbox.checked,
    };
  }

  /** 保存済み状態からUIを復元し、制約とバリデーションを再計算する。 */
  restore(): void {
    if (!this._savedState) {
      // 保存済み状態がない場合は既存のvalue-viewから復元してフォールバックする。
      this._loadFromValueViews();
      this._updateValueAndValidation();
      return;
    }

    this._chromosomeSelect.value = this._savedState.chromosome;
    this._startPositionInput.value = this._savedState.startPosition;
    this._endPositionInput.value = this._savedState.endPosition;
    this._singlePositionCheckbox.checked = this._savedState.isSinglePosition;

    this._positionInputContainer.dataset.type = this._savedState
      .isSinglePosition
      ? INPUT_MODE.SINGLE_POSITION
      : INPUT_MODE.REGION;

    const maxPosition = this._getChromosomeMaxPosition();
    if (maxPosition) {
      this._updatePositionConstraints(maxPosition);
    }

    this._updateValueAndValidation();
  }

  /** 染色体が選択され、モードに応じた入力が有効であれば true を返す。 */
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

  /** エディタの全体DOM構造を生成してsectionElとして確定させる。 */
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

  /**
   * single position トグルチェックボックスの行を生成し、参照を _singlePositionCheckbox に保持する。
   * 生成と同時に参照を確定させることで、attachEventListeners での参照待ちをなくすため。
   */
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

  /**
   * 染色体セレクトと位置入力の行を生成し、各DOM参照を保持する。
   * 生成と同時に参照を確定させることで、イベント登録時に別途querySelectorsを使わなくて済む。
   */
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

  /**
   * 開始/終了位置の入力欄を持つコンテナを生成し、初期モードを region に設定する。
   * 初期状態を region にすることで、染色体選択後すぐに範囲入力モードで使えるようにする。
   */
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

  /** トグル・染色体選択・位置入力のchangeをそれぞれ登録する。染色体変更時は位置制約も更新する。 */
  private _attachEventListeners(): void {
    this._singlePositionCheckbox.addEventListener('change', () => {
      const mode = this._singlePositionCheckbox.checked
        ? INPUT_MODE.SINGLE_POSITION
        : INPUT_MODE.REGION;

      this._positionInputContainer.dataset.type = mode;
      this._updateValueAndValidation();
    });

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

  /**
   * Storeからカリオタイプデータを取得する。
   * 染色体ごとの最大座標を取得して位置入力の上限チェックに使う。
   */
  private _loadKaryotypeData(): void {
    const data = storeManager.getData('karyotype');
    this._karyotypeData = data as KaryotypeData | null;
  }

  /**
   * 既存のvalue-viewからUI状態を復元してバリデーションを確定させる。
   * URL復元やhydrate時に既存値が存在する場合に初期表示を正しくするため。
   */
  private _initializeFromExistingValue(): void {
    this._loadFromValueViews();
    this._updateValueAndValidation();
  }

  /**
   * value-viewの値文字列をパースして各UIフィールドへ反映する。
   * "chr:start-end" または "chr:start" 形式を想定する。
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
   * "chr:start-end" または "chr:start" 形式の文字列を分解して返す。
   * 不正フォーマットは null で示すことで、呼び出し元が安全に早期リターンできる。
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

  /** パース結果を chromosome/start/end の各UIフィールドに適用する。 */
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

  /** start・end 両方が入力済みで start < end であれば有効とする。 */
  private _isValidRegion(): boolean {
    const hasStartValue = this._startPositionInput.value !== '';
    const hasEndValue = this._endPositionInput.value !== '';
    const startLessThanEnd =
      +this._startPositionInput.value < +this._endPositionInput.value;

    return hasStartValue && hasEndValue && startLessThanEnd;
  }

  /** start が入力済みであれば単一位置として有効とする。 */
  private _isValidSinglePosition(): boolean {
    return this._startPositionInput.value !== '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Karyotype Utilities
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * カリオタイプデータから現在の染色体の最大座標を取得する。
   * 入力値の上限チェックに使うため、取得できない場合は null を返して制約なしとする。
   */
  private _getChromosomeMaxPosition(): number | null {
    if (!this._karyotypeData?.reference) return null;

    const chromosome = this._chromosomeSelect.value;
    const chromosomeInfo = this._karyotypeData.chromosomes?.[chromosome];

    if (!chromosomeInfo?.region) return null;

    const region = chromosomeInfo.region[this._karyotypeData.reference];
    return region?.[1] ?? null;
  }

  /**
   * 染色体が変わるたびに位置入力欄の max 属性を更新して、入力可能範囲を制限する。
   * ブラウザのネイティブバリデーションを活用するため max 属性を使う。
   */
  private _updatePositionConstraints(maxPosition: number): void {
    this._startPositionInput.max = String(maxPosition);
    this._endPositionInput.max = String(maxPosition);
  }

  /**
   * 染色体変更で超過した値を上限に切り詰め、空欄の場合はデフォルト値を補完する。
   * 染色体選択後に不正な値が残り続けないようにするため。
   */
  private _enforcePositionLimits(maxPosition: number): void {
    if (this._startPositionInput.value === '') {
      this._startPositionInput.value = String(DEFAULT_START_POSITION);
    } else if (+this._startPositionInput.value > maxPosition) {
      this._startPositionInput.value = String(maxPosition);
    }

    if (this._endPositionInput.value === '') {
      this._endPositionInput.value = String(maxPosition);
    } else if (+this._endPositionInput.value > maxPosition) {
      this._endPositionInput.value = String(maxPosition);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Value Updates
  // ──────────────────────────────────────────────────────────────────────────

  /** 現在のUI状態からvalue-viewを更新してOKボタンの活性を反映する。 */
  private _updateValueAndValidation(): void {
    const existingValueView = this.conditionItemValueViews[0];

    if (this.isValid) {
      const locationString = this._buildLocationString();
      this._updateOrCreateValueView(existingValueView, locationString);
    } else {
      this.removeValueView('');
    }

    this.notifyValidity();
  }

  /**
   * 現在のUI状態から "chr:start-end" または "chr:start" 形式の文字列を生成する。
   * APIへそのまま渡す文字列のため、モードに応じてフォーマットを切り替える。
   */
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

  /**
   * 既存のvalue-viewがあれば上書き、なければ新規作成する。
   * 座標は1条件行につき1件のみなので上書き方式で管理する。
   */
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
   * カリオタイプ選択など外部ソースからオプションを受け取って位置入力に適用する。
   * 想定フォーマット: { chr: string|number, start: number|string, end: number|string }
   */
  applyOptions(options: unknown): void {
    if (!options || typeof options !== 'object') return;

    const opts = options as Record<string, unknown>;
    const chr = opts.chr;
    const start = opts.start;
    const end = opts.end;

    const chrStr = String(chr);
    if (!chrStr) return;

    const startNum =
      typeof start === 'number'
        ? start
        : start
        ? parseInt(String(start), 10)
        : null;
    const endNum =
      typeof end === 'number' ? end : end ? parseInt(String(end), 10) : null;

    this._chromosomeSelect.value = chrStr;

    if (startNum !== null && !isNaN(startNum)) {
      this._startPositionInput.value = String(startNum);
    }

    if (endNum !== null && !isNaN(endNum) && endNum !== startNum) {
      this._singlePositionCheckbox.checked = false;
      this._positionInputContainer.dataset.type = INPUT_MODE.REGION;
      this._endPositionInput.value = String(endNum);
    } else if (startNum !== null && !isNaN(startNum)) {
      this._singlePositionCheckbox.checked = true;
      this._positionInputContainer.dataset.type = INPUT_MODE.SINGLE_POSITION;
    }

    this._updateValueAndValidation();
  }
}
