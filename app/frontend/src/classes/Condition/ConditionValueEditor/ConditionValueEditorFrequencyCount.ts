import { createEl } from '../../../utils/dom/createEl';
import { selectOrNull } from '../../../utils/dom/select';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import '../../../components/RangeSliderView.js';
import {
  MODE,
  type FrequencyCountValueView,
} from '../../../components/FrequencyCountValueView';

export type RangeSliderData = {
  from?: number;
  to?: number;
  invert?: boolean;
};

type ModeType = (typeof MODE)[keyof typeof MODE];
type CountMode = Exclude<ModeType, 'frequency'>;

type ConditionState = {
  frequency: FrequencyCondition;
} & CountBuckets;
type CountBuckets = Record<CountMode, CountCondition>;

export interface FrequencyCondition {
  from: number;
  to: number;
  invert: boolean;
}

interface CountCondition {
  from: number | null;
  to: number | null;
}

interface RangeSliderElement extends HTMLElement {
  searchType: string;
  sliderStep: number;
  inputStep: number;
}

const SELECTORS = {
  SWITCHING: ':scope > .switching',
  FREQUENCY_COUNT_VIEW: 'frequency-count-value-view',
  RANGE_SELECTOR: '.range-selector-view',
  RADIO_INPUT: ':scope > label > input',
  FILTERED_CHECKBOX: ':scope > .filtered > label > input',
} as const;

/**
 * 頻度・カウントフィルタの条件エディタ。
 * dataset では frequency/count を、genotype では alt_alt/alt_ref/hemi_alt を切り替えて設定できる。
 */
export class ConditionValueEditorFrequencyCount extends ConditionValueEditor {
  _condition: ConditionState;
  _mode: ModeType;
  _rangeSelectorView: RangeSliderElement | null = null;
  _filtered: HTMLInputElement | null = null;
  _lastValue: FrequencyCondition | CountCondition | null = null;
  private _hasUserChangedCondition = false;
  private static _idCounter = 0;
  private static readonly DEFAULT_CONDITION: ConditionState = {
    frequency: { from: 0, to: 1, invert: false },
    count: { from: null, to: null },
    aac: { from: null, to: null },
    arc: { from: null, to: null },
    hac: { from: null, to: null },
  };
  // 複数インスタンスが存在するときもラジオグループ名が衝突しないよう連番で一意化する。
  private readonly _radioGroupName = `freqcount-${ConditionValueEditorFrequencyCount._idCounter++}`;

  /**
   * 初期条件・モード・DOM生成・イベント登録・初期表示テキスト設定を一括で行う。
   * 条件種別によってモードのデフォルトが変わるため、constructorで確定させる。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._condition = {
      frequency: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.frequency,
      },
      count: { ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.count },
      aac: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.aac,
      },
      arc: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.arc,
      },
      hac: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.hac,
      },
    };
    this._mode =
      this.conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;

    this._initializeComponent();
    this._setupEventListeners();
    this._observeValueChanges();
    this._updateErrorMessageVisibility();

    this.conditionItemView.updateClassificationText(
      this._getModeDisplayText(this._mode)
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cancel時に戻す基準として現在のモードの条件スナップショットを保存する。
   * モードが変わっても保存時点の値に戻せるよう、モード情報は別途 _mode で管理する。
   */
  keepLastValues(): void {
    const currentCondition = this._condition[this._mode];
    if (currentCondition) {
      this._lastValue = { ...currentCondition };
    }
  }

  /** 保存済み _lastValue を現在モードの条件へ戻してUIを更新する。 */
  restore(): void {
    if (this._lastValue && this._condition[this._mode]) {
      if (this._mode === MODE.frequency) {
        this._condition[this._mode] = this._lastValue as FrequencyCondition;
      } else {
        this._condition[this._mode] = this._lastValue as CountCondition;
      }
      this._update();
    }
  }

  /**
   * 値が1件以上存在し、countモードの場合は from <= to の制約を満たすか検証する。
   * frequency は range-slider が範囲を保証するため from/to の大小チェックは不要。
   */
  get isValid(): boolean {
    const currentCondition = this._condition[this._mode];
    if (!currentCondition) {
      return false;
    }

    const hasValue = Object.values(currentCondition).some(
      (value) => value !== null
    );
    if (!hasValue) {
      return false;
    }

    if (this._mode !== MODE.frequency) {
      const countCondition = currentCondition as CountCondition;
      if (
        countCondition.from !== null &&
        countCondition.to !== null &&
        countCondition.from > countCondition.to
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * value-view の DOMが変化したときにエディタのUIを同期する MutationObserver を設定する。
   * restore や hydrate 後の追加・削除を検知してエディタ状態を最新に保つため。
   */
  private _observeValueChanges(): void {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => this._update());
    });
    observer.observe(this.valuesContainerEl, {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Generation
  // ───────────────────────────────────────────────────────────────────────────

  /** セクションDOM・レンジスライダーを生成して初期化する。 */
  private _initializeComponent(): void {
    this.createSectionEl('frequency-count-editor-view', () => [
      createEl('header', { text: 'Specify range' }),
      createEl('div', {
        class: 'body',
        children: this._createBodyElements(this._radioGroupName),
      }),
    ]);

    this._setupRangeSlider();
  }

  /** 条件種別に応じて dataset/genotype 用のUI要素を選択して返す。 */
  private _createBodyElements(name: string): HTMLElement[] {
    if (this.conditionType === 'genotype') {
      return this._createGenotypeElements(name);
    }
    return this._createDatasetElements(name);
  }

  /** dataset 条件用の frequency/count/filtered の各セクション要素を生成する。 */
  private _createDatasetElements(name: string): HTMLElement[] {
    const frequencySection = this._createFrequencySection(name);
    const countSection = this._createCountSection(name, MODE.count, 'Count');
    const filteredSection = this._createFilteredSection();

    return [frequencySection, countSection, filteredSection];
  }

  /** genotype 条件用の alt_alt/alt_ref/hemi_alt の各countセクションを生成する。 */
  private _createGenotypeElements(name: string): HTMLElement[] {
    const genotypeOptions = [
      { mode: MODE.alt_alt, label: 'Alt/Alt: Number of homozygous genotypes' },
      {
        mode: MODE.alt_ref,
        label: 'Alt/Ref: Number of heterozygous genotypes',
      },
      {
        mode: MODE.hemi_alt,
        label: 'Hemi_Alt: Number of hemizygous genotypes',
      },
    ];

    const sections = genotypeOptions.map((option) =>
      this._createCountSection(name, option.mode, option.label)
    );

    const filteredSection = this._createFilteredSection();
    return [...sections, filteredSection];
  }

  /** レンジスライダーを格納する frequency セクション要素を生成する。 */
  private _createFrequencySection(name: string): HTMLElement {
    return createEl('section', {
      class: ['frequency', 'switching'],
      dataset: { mode: MODE.frequency },
      children: [
        createEl('label', {
          children: [
            createEl('input', {
              attrs: {
                type: 'radio',
                name,
                value: MODE.frequency,
              },
            }),
            createEl('span', { text: 'Frequency' }),
          ],
        }),
        createEl('div', { class: ['range-selector-view', 'input'] }),
      ],
    });
  }

  /**
   * カウント入力欄とエラーメッセージを持つ count セクション要素を生成する。
   * 初期レンダリング時に既に invalid 状態であればエラーを表示状態で生成する。
   */
  private _createCountSection(
    name: string,
    mode: string,
    label: string
  ): HTMLElement {
    const shouldShowError =
      mode === this._mode && this._isCurrentConditionInvalid();

    return createEl('section', {
      class: ['count', 'switching'],
      dataset: { mode },
      children: [
        createEl('label', {
          children: [
            createEl('input', {
              attrs: {
                type: 'radio',
                name,
                value: mode,
              },
            }),
            createEl('span', { text: label }),
          ],
        }),
        createEl('div', {
          class: 'input-container',
          children: [
            createEl('div', {
              class: 'input',
              children: [
                createEl('input', {
                  class: 'from',
                  attrs: {
                    min: '0',
                    step: '1',
                    type: 'number',
                  },
                }),
                ' ~ ',
                createEl('input', {
                  class: 'to',
                  attrs: {
                    min: '0',
                    step: '1',
                    type: 'number',
                  },
                }),
              ],
            }),
            createEl('div', {
              class: ['messages-view', ...(shouldShowError ? [] : ['-hidden'])],
              children: [
                createEl('div', {
                  class: ['message', '-error'],
                  text: 'The maximum and minimum values are invalid.',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  /**
   * 「フィルタ済みバリアントを除外する」チェックボックスセクションを生成する。
   * id 属性と for 属性を _radioGroupName ベースで一意にすることで、
   * 複数エディタが同一ページに存在してもラベルクリックが正しく動く。
   */
  private _createFilteredSection(): HTMLElement {
    const filteredCheckboxId = `${this._radioGroupName}-filtered`;

    return createEl('section', {
      class: 'filtered',
      children: [
        createEl('label', {
          attrs: {
            for: filteredCheckboxId,
          },
          children: [
            createEl('input', {
              attrs: {
                type: 'checkbox',
                checked: 'checked',
                id: filteredCheckboxId,
              },
            }),
            createEl('span', { text: 'Exclude filtered out variants' }),
          ],
        }),
      ],
    });
  }

  /**
   * range-slider 要素を生成して .range-selector-view 内に配置する。
   * 初回の range-changed イベントとユーザー操作を区別するため、
   * 初期同期を requestAnimationFrame で遅らせて shadow DOM の確定後に行う。
   */
  private _setupRangeSlider(): void {
    const rangeSlider = createEl('range-slider', {
      domProps: {
        searchType: 'advanced',
        sliderStep: 0.01,
        inputStep: 0.05,
      },
      attrs: {
        value1: this._condition.frequency.from.toString(),
        value2: this._condition.frequency.to.toString(),
        invert: this._condition.frequency.invert.toString(),
      },
    });

    rangeSlider.addEventListener(
      'range-changed',
      (e: CustomEvent<RangeSliderData>) => {
        e.stopPropagation();
        this.changeParameter(e.detail);
      }
    );

    const rangeContainer = selectOrNull<HTMLElement>(
      this.sectionEl,
      SELECTORS.RANGE_SELECTOR
    );
    rangeContainer?.appendChild(rangeSlider);
    this._rangeSelectorView = rangeSlider;

    requestAnimationFrame(() => {
      if (this._rangeSelectorView) {
        const shadowHost = this._rangeSelectorView as HTMLElement & {
          shadowRoot?: ShadowRoot;
        };
        if (shadowHost.shadowRoot) {
          const checkboxInShadow = selectOrNull<HTMLInputElement>(
            shadowHost.shadowRoot,
            '.invert'
          );
          if (checkboxInShadow) {
            checkboxInShadow.checked = this._condition.frequency.invert;
          }
        }
      }
    });
  }

  /**
   * モード切替・カウント入力・filtered チェックボックスのリスナーを一括登録する。
   * 初期化の手順を揃えるためイベント登録をここに集約する。
   */
  private _setupEventListeners(): void {
    this._setupModeToggleListeners();
    this._setupCountInputListeners();
    this._setupFilteredCheckboxListener();
  }

  /**
   * ラジオボタンのchangeでモードを切り替えるリスナーを各switchingセクションに登録する。
   * デフォルトモードのラジオを requestAnimationFrame で発火させて初期表示を確定させる。
   */
  private _setupModeToggleListeners(): void {
    const switchingElements = this.bodyEl.querySelectorAll(SELECTORS.SWITCHING);

    for (const el of switchingElements) {
      const input = selectOrNull<HTMLInputElement>(el, SELECTORS.RADIO_INPUT);
      if (!input) continue;

      input.addEventListener('change', (e) => {
        this._handleModeChange(e, switchingElements);
      });

      const defaultMode =
        this.conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;
      if (input.value === defaultMode) {
        requestAnimationFrame(() => {
          input.dispatchEvent(new Event('change'));
          input.checked = true;
        });
      }
    }
  }

  /**
   * モード変更をDOMと内部状態に反映してUIを更新する。
   * isTrusted で初回レンダリングのプログラムイベントとユーザー操作を区別する。
   */
  private _handleModeChange(
    e: Event,
    switchingElements: NodeListOf<Element>
  ): void {
    const target = e.target as HTMLInputElement;
    if (e.isTrusted) {
      this._hasUserChangedCondition = true;
    }

    for (const el of switchingElements) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.mode === target.value) {
        htmlEl.classList.add('-current');
      } else {
        htmlEl.classList.remove('-current');
      }
    }

    this._mode = target.value as ModeType;

    this.conditionItemView.updateClassificationText(
      this._getModeDisplayText(this._mode)
    );

    this._updateErrorMessageVisibility();
    this._update();
  }

  /**
   * count セクション内の from/to に change と input の両方を登録する。
   * 確定操作と入力中の両方でバリデーションを即時更新するため両方が必要。
   */
  private _setupCountInputListeners(): void {
    const switchingElements = this.bodyEl.querySelectorAll(SELECTORS.SWITCHING);

    switchingElements.forEach((element) => {
      const inputs = element.querySelectorAll(':scope .input > input');
      inputs.forEach((input) => {
        input.addEventListener('change', (e) => {
          this._handleCountInputChange(e);
        });
        input.addEventListener('input', (e) => {
          this._handleCountInputChange(e);
        });
      });
    });
  }

  /**
   * 入力値を数値化して countCondition へ反映する。
   * 負数は0へ、小数は切り捨てることでAPIの仕様（非負整数）に合わせる。
   */
  private _handleCountInputChange(e: Event): void {
    if (e.isTrusted) {
      this._hasUserChangedCondition = true;
    }
    const target = e.target as HTMLInputElement;
    const key = target.className as keyof CountCondition;
    const currentCondition = this._condition[this._mode] as CountCondition;
    if (currentCondition && key in currentCondition) {
      const value = target.value.trim();

      if (value === '') {
        currentCondition[key] = null;
      } else {
        let numValue = Number(value);

        if (this._mode !== MODE.frequency) {
          if (numValue < 0) {
            numValue = 0;
          }
          numValue = Math.floor(numValue);
          target.value = numValue.toString();
        }

        currentCondition[key] = numValue;
      }

      this._updateErrorMessageVisibility();
      this._update();
    }
  }

  /**
   * countモードで from > to のエラー表示専用の判定。
   * isValid とは別に持つことで、エラーメッセージ制御とOKボタン制御を分離する。
   */
  private _isCurrentConditionInvalid(): boolean {
    if (this._mode === MODE.frequency) {
      return false;
    }

    const currentCondition = this._condition[this._mode] as CountCondition;
    return (
      currentCondition.from !== null &&
      currentCondition.to !== null &&
      currentCondition.from > currentCondition.to
    );
  }

  /**
   * 現在のモードのセクションだけエラーメッセージ表示を更新する。
   * モード切替時にも呼ぶことで、他のセクションのエラーが残らないようにする。
   */
  private _updateErrorMessageVisibility(): void {
    const isInvalid = this._isCurrentConditionInvalid();

    const currentSection = this.bodyEl.querySelector(
      `[data-mode="${this._mode}"]`
    );
    if (currentSection) {
      const messagesView = currentSection.querySelector(
        '.messages-view'
      ) as HTMLElement;
      if (messagesView) {
        if (isInvalid) {
          messagesView.classList.remove('-hidden');
        } else {
          messagesView.classList.add('-hidden');
        }
      }
    }
  }

  /**
   * filtered チェックボックスの change をlistenして条件を更新する。
   * 初回 dispatchEvent で初期状態をUI上で確定させるため、登録後に発火する。
   */
  private _setupFilteredCheckboxListener(): void {
    this._filtered = selectOrNull<HTMLInputElement>(
      this.bodyEl,
      SELECTORS.FILTERED_CHECKBOX
    );
    if (this._filtered) {
      this._filtered.addEventListener('change', (e) => {
        if (e.isTrusted) {
          this._hasUserChangedCondition = true;
        }
        this._update();
      });
      this._filtered.dispatchEvent(new Event('change'));
    }
  }

  /**
   * レンジスライダーからの変更を _condition.frequency に反映してUIを更新する。
   * RangeSliderView は初期化時にも range-changed を発火するため、
   * 値が実際に変化したときだけ hasUserChangedCondition を true にする。
   */
  changeParameter(newCondition: RangeSliderData): void {
    if (!this._rangeSelectorView) return;

    const nextFrom =
      newCondition.from !== undefined
        ? newCondition.from
        : this._condition.frequency.from;
    const nextTo =
      newCondition.to !== undefined
        ? newCondition.to
        : this._condition.frequency.to;
    const nextInvert =
      newCondition.invert !== undefined
        ? typeof newCondition.invert === 'string'
          ? newCondition.invert === '1' || newCondition.invert === 'true'
          : Boolean(newCondition.invert)
        : this._condition.frequency.invert;

    const changed =
      nextFrom !== this._condition.frequency.from ||
      nextTo !== this._condition.frequency.to ||
      nextInvert !== this._condition.frequency.invert;

    if (changed) {
      this._hasUserChangedCondition = true;
    }

    this._condition.frequency.from = nextFrom;
    this._condition.frequency.to = nextTo;
    this._condition.frequency.invert = nextInvert;
    this._update();
  }

  /** 全value-viewへ条件を適用してOKボタンの活性を更新する。 */
  private _update(): void {
    this._applyConditionToAllViews();
    this.conditionValues.update(this.isValid);
  }

  /** valuesContainerEl 内の全value-viewに現在の条件を反映する。 */
  private _applyConditionToAllViews(): void {
    this.valuesContainerEl
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const freqCountView = this._getFrequencyCountView(view);
        if (!freqCountView) return;

        this._syncConditionFromRestoredView(freqCountView);
        this._updateFrequencyCountView(freqCountView);
      });
  }

  /**
   * ユーザーが未変更の場合のみ、既存のvalue-viewから条件を逆引きして復元する。
   * URLからの条件復元後にエディタの状態を合わせるために必要で、
   * ユーザーが操作済みの場合は上書きしないよう _hasUserChangedCondition で制御する。
   */
  private _syncConditionFromRestoredView(
    freqCountView: FrequencyCountValueView
  ): void {
    if (this._hasUserChangedCondition) return;

    const mode = freqCountView.mode as ModeType;
    this._mode = mode;
    this.conditionItemView.updateClassificationText(
      this._getModeDisplayText(mode)
    );

    if (mode === MODE.frequency) {
      this._condition.frequency = {
        from: freqCountView.from ?? 0,
        to: freqCountView.to ?? 1,
        invert: freqCountView.invert,
      };
    } else {
      const countMode = mode as CountMode;
      this._condition[countMode] = {
        from: freqCountView.from,
        to: freqCountView.to,
      };
    }

    if (this._filtered) {
      this._filtered.checked = freqCountView.filtered;
    }
  }

  /**
   * shadow DOM 内の frequency-count-value-view を取得する。
   * setValues が実装されていない要素は無効として弾くことで、型ミスを防ぐ。
   */
  private _getFrequencyCountView(
    view: Element
  ): FrequencyCountValueView | null {
    const viewWithShadow = view as Element & { shadowRoot?: ShadowRoot };
    const shadowRoot = viewWithShadow.shadowRoot;
    if (!shadowRoot) return null;

    const freqCountView = selectOrNull<FrequencyCountValueView>(
      shadowRoot,
      SELECTORS.FREQUENCY_COUNT_VIEW
    );
    return freqCountView && typeof freqCountView.setValues === 'function'
      ? freqCountView
      : null;
  }

  /** 現在の条件を frequency-count-value-view へ反映する。 */
  private _updateFrequencyCountView(
    freqCountView: FrequencyCountValueView
  ): void {
    const currentCondition = this._condition[this._mode];
    const invertValue =
      this._mode === MODE.frequency ? this._condition.frequency.invert : false;
    const isFiltered = this._filtered?.checked ?? false;

    const fromValue = currentCondition.from;
    const toValue = currentCondition.to;

    freqCountView.setValues(
      this.conditionType as 'dataset' | 'genotype',
      this._mode,
      fromValue,
      toValue,
      invertValue,
      isFiltered
    );

    freqCountView.mode = this._mode;
    freqCountView.from = fromValue;
  }

  /** 現在のモードに対応する分類テキストを返す。ConditionItemView の分類テキスト更新に使う。 */
  private _getModeDisplayText(mode: ModeType): string {
    const displayTextMap: Record<ModeType, string> = {
      [MODE.frequency]: 'Alternate allele frequency',
      [MODE.count]: 'Alternate allele count',
      [MODE.alt_alt]: 'Genotype count (Alt/Alt)',
      [MODE.alt_ref]: 'Genotype count (Alt/Ref)',
      [MODE.hemi_alt]: 'Genotype count (Hemi_Alt)',
    };

    return displayTextMap[mode];
  }
}
