import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import Styles from '../../../stylesheets/web-components/range-slider.scss';
import {
  DEFAULT_INPUT_STEP,
  DEFAULT_RANGE_SLIDER_STATE,
  DEFAULT_SLIDER_STEP,
  EVENT_DETAIL_KEYS,
  METER_VERTICAL_CLASS,
  RANGE_CHANGED_EVENT,
} from './RangeSliderConstants';
import { createRulerScales, type RulerScale } from './RangeSliderRuler';
import {
  formatInputValue,
  parseNumber,
  setRangeValue,
  toInvertValue,
} from './RangeSliderValue';
import type {
  RangeSliderAttribute,
  RangeSliderData,
  RangeSliderState,
} from './RangeSliderTypes';

const DEFAULT_ORIENTATION = 'horizontal';

/** 頻度条件UIから使うため、属性・数値入力・2本のrange inputを1つのWeb Componentにまとめる。 */
@customElement('range-slider')
export class RangeSlider extends LitElement {
  static styles = [Styles];

  static properties = {
    min: { type: String, noAccessor: true },
    max: { type: String, noAccessor: true },
    inputStep: { type: String, attribute: 'input-step', noAccessor: true },
    sliderStep: { type: String, attribute: 'slider-step', noAccessor: true },
    value1: { type: String, noAccessor: true },
    value2: { type: String, noAccessor: true },
    orientation: { type: String, noAccessor: true },
    invert: { type: String, noAccessor: true },
    match: { type: String, noAccessor: true },
    rulerNumberOfSteps: {
      type: String,
      attribute: 'ruler-number-of-steps',
      noAccessor: true,
    },
  };

  private _state: RangeSliderState;
  private _searchType: string | null = null;
  private _rulerScales: RulerScale[] = [];

  /**
   * render() 完了前は @query でのDOM参照が null になるため、
   * firstUpdated() 後にセットして DOM アクセスを保護する。
   */
  private _domReady = false;

  @query('#slider-1') private slider1!: HTMLInputElement;
  @query('#slider-2') private slider2!: HTMLInputElement;
  @query('#slider-track') private sliderTrack!: HTMLElement;
  @query('.from') private from!: HTMLInputElement;
  @query('.to') private to!: HTMLInputElement;
  @query('.invert') private invertChk!: HTMLInputElement;
  @query('.meter') private _meter!: HTMLElement;

  constructor() {
    super();
    this._state = { ...DEFAULT_RANGE_SLIDER_STATE };
  }

  render(): TemplateResult {
    return html`
      <div class="wrapper" part="wrapper">
        <div class="input" part="div-input">
          <span class="limit-inputs" part="limit-inputs">
            <input
              class="from"
              name="lower-limit"
              part="num-input limit-input"
              type="number"
              title="Lower limit"
              .min=${String(this._state.min)}
              .max=${String(this._state.max)}
              .step=${this._inputStep}
              .value=${formatInputValue(this._state.from)}
              @input=${this._fromInput}
            />
            ~
            <input
              class="to"
              name="upper-limit"
              part="num-input limit-input"
              type="number"
              title="Upper limit"
              .min=${String(this._state.min)}
              .max=${String(this._state.max)}
              .step=${this._inputStep}
              .value=${formatInputValue(this._state.to)}
              @input=${this._toInput}
            />
          </span>
          <label class="checkbox-label" part="checkbox-label label">
            <input
              class="invert"
              name="invert-range"
              type="checkbox"
              part="checkbox"
              .checked=${this._state.invert}
              @change=${this._invertChange}
            />Invert range
          </label>
        </div>
        <div class="meter" part="meter">
          <div class="meter-container" part="meter-container">
            <div class="slider-track" id="slider-track" part="slider-track">
              <div class="ruler" part="ruler">
                ${this._rulerScales.map((scale) => this._renderRulerScale(scale))}
              </div>
            </div>
            <input
              part="slider"
              type="range"
              name="slider-1"
              id="slider-1"
              aria-label="Lower range limit"
              .min=${String(this._state.min)}
              .max=${String(this._state.max)}
              .step=${this._sliderStep}
              .value=${String(Math.min(this._state.from, this._state.to))}
              @input=${this.lazy ? this._slider1VisualUpdate : this._slider1Input}
              @change=${this.lazy ? this._sliderLazyCommit : undefined}
            />
            <input
              part="slider"
              type="range"
              name="slider-2"
              id="slider-2"
              aria-label="Upper range limit"
              .min=${String(this._state.min)}
              .max=${String(this._state.max)}
              .step=${this._sliderStep}
              .value=${String(Math.max(this._state.from, this._state.to))}
              @input=${this.lazy ? this._slider2VisualUpdate : this._slider2Input}
              @change=${this.lazy ? this._sliderLazyCommit : undefined}
            />
          </div>
        </div>
        ${this._renderMatchSelector()}
      </div>
    `;
  }

  /** 目盛りは状態から毎回同じ構造で描画し、DOMの手動生成を避ける。 */
  private _renderRulerScale(scale: RulerScale): TemplateResult {
    const classes = {
      scale: true,
      'scale-vertical': scale.vertical,
    };

    return html`
      <div
        class=${classMap(classes)}
        part=${scale.vertical ? 'scale scale-vertical' : 'scale'}
        style=${styleMap({ left: scale.left })}
      >
        ${scale.label}
      </div>
    `;
  }

  /** match切替は simple search だけで必要なため、Lit の条件付き描画に閉じ込める。 */
  private _renderMatchSelector(): TemplateResult | null {
    if (this._searchType !== 'simple') return null;

    return html`
      <div class="match" part="match" @click=${this._matchClick}>
        <label part="match label">
          <input
            class="all"
            name="match"
            type="radio"
            value="all"
            .checked=${this._state.match === 'all'}
          />
          for all datasets
        </label>
        <label part="label">
          <input
            class="any"
            name="match"
            type="radio"
            value="any"
            .checked=${this._state.match !== 'all'}
          />
          for any dataset
        </label>
      </div>
    `;
  }

  /** slider用stepは属性名が独自なので、未指定時の既定値をここで補完する。 */
  private get _sliderStep(): string {
    return this.getAttribute('slider-step') ?? String(DEFAULT_SLIDER_STEP);
  }

  /** number input用stepも独自属性から読むため、render側で使える文字列へ正規化する。 */
  private get _inputStep(): string {
    return this.getAttribute('input-step') ?? String(DEFAULT_INPUT_STEP);
  }

  /** 属性変更をフォーム部品と内部状態へ反映し、外部からの値更新でも表示を同期する。 */
  attributeChangedCallback(
    name: RangeSliderAttribute,
    oldValue: string | null,
    newValue: string | null
  ): void {
    // LitのReactive Propertyは使わず手動で属性同期するため、
    // super呼び出しによる内部property変換を避ける。
    if (oldValue === newValue || newValue === null) return;

    switch (name) {
      case 'min':
        this._state.min = parseNumber(newValue, this._state.min);
        this._clampCurrentRange();
        break;
      case 'max':
        this._state.max = parseNumber(newValue, this._state.max);
        this._clampCurrentRange();
        break;
      case 'slider-step':
        this.requestUpdate();
        break;
      case 'input-step':
        this.requestUpdate();
        break;
      case 'value1':
      case 'value2': {
        if (this._domReady) {
          this._syncStateFromAttributeValues();
          if (this.isConnected) {
            this._commitStateChange({ fireEvent: true });
            return;
          }
        }
        break;
      }
      case 'invert': {
        const invert = toInvertValue(newValue);
        if (this._domReady) {
          this.invertChk.checked = invert;
          if (this.isConnected) {
            this._updateInvert(invert);
            return;
          }
        }
        this._state.invert = invert;
        break;
      }
      case 'ruler-number-of-steps':
        this._state.rulerNumberOfSteps = parseNumber(
          newValue,
          this._state.rulerNumberOfSteps
        );
        if (this._domReady) this._reRenderRuler();
        break;
      case 'match':
        this._state.match = newValue;
        break;
      case 'orientation':
        if (this._domReady) {
          this._toggleOrientation(newValue);
          this._reRenderRuler();
        }
        break;
    }

    if (this._domReady) this._commitStateChange();
  }

  /** 2本のrange inputは順序が入れ替わるため、状態へ入れる前に必ずmin/maxで正規化する。 */
  private _syncStateFromSliderValues(): void {
    const rawFrom = Math.min(+this.slider1.value, +this.slider2.value);
    const rawTo = Math.max(+this.slider1.value, +this.slider2.value);
    this._state.from = this._clampRangeValue(rawFrom);
    this._state.to = this._clampRangeValue(rawTo);
  }

  /** min/maxが変わったとき、既存の選択範囲が新しい範囲外へ残らないよう補正する。 */
  private _clampCurrentRange(): void {
    this._state.from = this._clampRangeValue(this._state.from);
    this._state.to = this._clampRangeValue(this._state.to);
  }

  /** min/max変更時にも同じ補正を使えるよう、範囲内への丸めを小さく分離する。 */
  private _clampRangeValue(value: number): number {
    return Math.min(Math.max(value, this._state.min), this._state.max);
  }

  /** 縦向き表示はCSSクラスだけで切り替え、値計算のロジックを増やさない。 */
  private _toggleOrientation(orientation: string): void {
    if (orientation === 'vertical') {
      this._meter.classList.add(METER_VERTICAL_CLASS);
      return;
    }

    this._meter.classList.remove(METER_VERTICAL_CLASS);
  }

  /** 目盛りはmin/max/分割数から毎回作り直し、属性変更後も表示と状態を一致させる。 */
  private _reRenderRuler(): void {
    this._rulerScales = createRulerScales(
      this._state.min,
      this._state.max,
      this._state.rulerNumberOfSteps,
      this.orientation
    );
    this.requestUpdate();
  }

  /** 選択範囲はCSSカスタムプロパティへ流し、実際の描画はSCSSに任せる。 */
  private _fillSlider(): void {
    const val1 = Math.min(this._state.from, this._state.to);
    const val2 = Math.max(this._state.from, this._state.to);
    const range = this._state.max - this._state.min || 1;
    const percentFrom = ((val1 - this._state.min) * 100) / range;
    const percentTo = ((val2 - this._state.min) * 100) / range;
    this.sliderTrack.style.setProperty('--range-slider-from', `${percentFrom}%`);
    this.sliderTrack.style.setProperty('--range-slider-to', `${percentTo}%`);
    this.sliderTrack.toggleAttribute('data-inverted', this._state.invert);

    this._drawThumbs();
  }

  /**
   * 2つのつまみが重なっても境界が見えるよう、左右どちら側に線を出すかを値の大小で決める。
   * data-thumb 属性を介して SCSS の :host([data-thumb]) セレクタでスタイルを切り替える。
   */
  private _drawThumbs(): void {
    this.dataset.thumb =
      this._state.from < this._state.to ? '1-lower' : '2-lower';
  }

  /** 外部コードが属性と同じ名前で最小値を読めるよう、既存APIを保つ。 */
  get min(): string | null {
    return this.getAttribute('min');
  }

  /** 外部コードが属性と同じ名前で最大値を読めるよう、既存APIを保つ。 */
  get max(): string | null {
    return this.getAttribute('max');
  }

  /** 旧API互換のため、未使用でもstep属性のgetterを残す。 */
  get step(): string | null {
    return this.getAttribute('step');
  }

  /** 下限側初期値を属性経由で参照する既存コードに合わせる。 */
  get value1(): string | null {
    return this.getAttribute('value1');
  }

  /** 上限側初期値を属性経由で参照する既存コードに合わせる。 */
  get value2(): string | null {
    return this.getAttribute('value2');
  }

  /** 表示方向はCSSクラス切替にも使うため、属性を正として返す。 */
  get orientation(): string | null {
    return this.getAttribute('orientation');
  }

  /** checkboxと属性の両方からinvert状態を扱うため、属性値をbooleanへ変換する。 */
  get invert(): boolean {
    return toInvertValue(this.getAttribute('invert'));
  }

  /** 外部から目盛り数を属性で調整できるよう、既存APIを保つ。 */
  get rulerNumberOfSteps(): string | null {
    return this.getAttribute('ruler-number-of-steps');
  }

  /** 属性変更コールバックに集約するため、setterでは属性だけを更新する。 */
  set min(value: string | number | null) {
    this._setNullableAttribute('min', value);
  }

  /** 属性変更コールバックに集約するため、setterでは属性だけを更新する。 */
  set max(value: string | number | null) {
    this._setNullableAttribute('max', value);
  }

  /** range input と number input の刻みを別管理するため、slider側だけ属性化する。 */
  set sliderStep(value: string | number) {
    this.setAttribute('slider-step', String(value));
  }

  /** 手入力欄の刻みだけを外部から調整できるよう、input側だけ属性化する。 */
  set inputStep(value: string | number) {
    this.setAttribute('input-step', String(value));
  }

  /** 下限側の外部初期値を属性変更フローへ流すため、setterでは属性だけを更新する。 */
  set value1(value: string | number | null) {
    this._setNullableAttribute('value1', value);
  }

  /** 上限側の外部初期値を属性変更フローへ流すため、setterでは属性だけを更新する。 */
  set value2(value: string | number | null) {
    this._setNullableAttribute('value2', value);
  }

  /** 表示方向の変更を属性変更フローへ流すため、setterでは属性だけを更新する。 */
  set orientation(value: string | null) {
    this._setNullableAttribute('orientation', value);
  }

  /** 目盛り数の変更を属性変更フローへ流すため、setterでは属性だけを更新する。 */
  set rulerNumberOfSteps(value: string | number | null) {
    this._setNullableAttribute('ruler-number-of-steps', value);
  }

  /** null時は属性を消せるようにし、既存setterからの属性同期処理を共通化する。 */
  private _setNullableAttribute(
    name: RangeSliderAttribute,
    value: string | number | null
  ): void {
    if (value === null) {
      this.removeAttribute(name);
      return;
    }

    this.setAttribute(name, String(value));
  }

  /** simple searchだけmatch UIを追加するため、通常利用では内部UIを露出しない。 */
  set searchType(value: string) {
    this._searchType = value;
    this.dataset.searchType = value;
    this.requestUpdate();
  }

  /** invert変更も属性変更コールバックに集約し、checkboxと描画を同じ経路で同期する。 */
  set invert(value: boolean | string) {
    this.setAttribute('invert', String(value));
  }

  /** 外部の条件エディタが必要な値だけを受け取れるよう、内部状態から公開detailを切り出す。 */
  private _fireEvent(): void {
    const eventData = Object.fromEntries(
      Object.entries(this._state).filter(([key]) =>
        EVENT_DETAIL_KEYS.includes(key as (typeof EVENT_DETAIL_KEYS)[number])
      )
    ) as RangeSliderData;

    const event = new CustomEvent<RangeSliderData>(RANGE_CHANGED_EVENT, {
      bubbles: true,
      detail: eventData,
    });

    this.dispatchEvent(event);
  }

  /** DOM構築完了後に属性から初期状態を確定し、入力イベントを登録して初期描画を行う。 */
  protected override firstUpdated(): void {
    this._domReady = true;
    this._initStateFromAttributes();
    this._initUI();
  }

  /** 属性から内部状態を初期化する。DOM操作を含まず、状態確定だけを行う。 */
  private _initStateFromAttributes(): void {
    this._applyDefaultAttribute('min', DEFAULT_RANGE_SLIDER_STATE.min);
    this._applyDefaultAttribute('max', DEFAULT_RANGE_SLIDER_STATE.max);
    this._applyDefaultAttribute('value1', DEFAULT_RANGE_SLIDER_STATE.from);
    this._applyDefaultAttribute('value2', DEFAULT_RANGE_SLIDER_STATE.to);
    this._applyDefaultAttribute('orientation', DEFAULT_ORIENTATION);
    const match =
      this.getAttribute('match') ?? this.getAttribute('simple-search');
    this._state.match = match ?? DEFAULT_RANGE_SLIDER_STATE.match;
    this._state.min = parseNumber(
      this.min ?? 0,
      DEFAULT_RANGE_SLIDER_STATE.min
    );
    this._state.max = parseNumber(
      this.max ?? 1,
      DEFAULT_RANGE_SLIDER_STATE.max
    );
    this._syncStateFromAttributeValues();
    this._state.invert = toInvertValue(this.getAttribute('invert'));
    this.rulerNumberOfSteps = DEFAULT_RANGE_SLIDER_STATE.rulerNumberOfSteps;
  }

  /** 未指定属性だけを補完し、外部から明示された初期値を上書きしないようにする。 */
  private _applyDefaultAttribute(
    name: RangeSliderAttribute,
    fallback: string | number
  ): void {
    if (this.getAttribute(name) === null) {
      this.setAttribute(name, String(fallback));
    }
  }

  /** 初期属性は文字列なので、数値化と範囲補正を状態更新前にまとめて行う。 */
  private _syncStateFromAttributeValues(): void {
    const rawFrom = Math.min(+(this.value1 ?? 0), +(this.value2 ?? 1));
    const rawTo = Math.max(+(this.value1 ?? 0), +(this.value2 ?? 1));
    this._state.from = this._clampRangeValue(rawFrom);
    this._state.to = this._clampRangeValue(rawTo);
  }

  /** イベント登録と初期描画を行う。状態確定後に呼ぶ。 */
  private _initUI(): void {
    this._commitStateChange();
    this.invertChk.checked = this._state.invert;
    this._toggleOrientation(this.orientation ?? DEFAULT_ORIENTATION);
    this._reRenderRuler();
    this._fireEvent();
  }

  /** state変更後の描画同期とイベント発火を1箇所に集約し、副作用の重複を避ける。 */
  private _commitStateChange({ fireEvent = false } = {}): void {
    this.requestUpdate();
    this._syncInputsFromState();
    if (fireEvent) this._fireEvent();
  }

  /** 範囲値の変更だけがrange-changedを発火するよう、状態更新の副作用を明示する。 */
  private _updateRangeValue(prop: 'from' | 'to', value: unknown): void {
    setRangeValue(this._state, prop, value);
    this._commitStateChange({ fireEvent: true });
  }

  /** invert変更時の同期とイベント発火を明示し、単なる代入に副作用を隠さない。 */
  private _updateInvert(value: unknown): void {
    this._state.invert = toInvertValue(value);
    this._commitStateChange({ fireEvent: true });
  }

  /**
   * lazy 属性があるときは input（ドラッグ中）で視覚のみ更新し、
   * change（リリース時）だけ range-changed を発火する。
   * simple search で URL 変更・検索をリリース後に限定するために使う。
   */
  get lazy(): boolean {
    return this.hasAttribute('lazy');
  }

  set lazy(value: boolean) {
    if (value) {
      this.setAttribute('lazy', '');
    } else {
      this.removeAttribute('lazy');
    }
  }

  /** 下限スライダー操作をstateへ通し、数値入力とイベント発火を同じ経路に揃える。 */
  private _slider1Input = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('from', e.target.value);
  };

  /** 上限スライダー操作をstateへ通し、数値入力とイベント発火を同じ経路に揃える。 */
  private _slider2Input = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('to', e.target.value);
  };

  /** lazy モード: ドラッグ中は視覚のみ更新し range-changed を発火しない。 */
  private _slider1VisualUpdate = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    setRangeValue(this._state, 'from', e.target.value);
    this._commitStateChange();
  };

  /** lazy モード: ドラッグ中は視覚のみ更新し range-changed を発火しない。 */
  private _slider2VisualUpdate = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    setRangeValue(this._state, 'to', e.target.value);
    this._commitStateChange();
  };

  /** lazy モード: スライダーを放したときだけ range-changed を発火する。 */
  private _sliderLazyCommit = (): void => {
    this._fireEvent();
  };

  /** stateを唯一の正とし、2本のスライダー・数値入力・背景描画を同期する。 */
  private _syncInputsFromState(): void {
    this.slider1.value = String(Math.min(this._state.from, this._state.to));
    this.slider2.value = String(Math.max(this._state.from, this._state.to));
    this.from.value = formatInputValue(this._state.from);
    this.to.value = formatInputValue(this._state.to);
    this._fillSlider();
  }

  /** 上限の手入力もstateへ通し、スライダー操作と同じ補正・イベント発火を使う。 */
  private _toInput = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('to', e.target.value);
  };

  /** 下限の手入力もstateへ通し、スライダー操作と同じ補正・イベント発火を使う。 */
  private _fromInput = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('from', e.target.value);
  };

  /** checkboxのboolean値をstateへ通し、range-changedのdetail形式を既存仕様に揃える。 */
  private _invertChange = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateInvert(e.target.checked);
  };

  /** match radioはsimple search専用だが、状態同期とイベント発火は他の入力と同じ経路に揃える。 */
  private _matchClick = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;

    this._state.match = e.target.value;
    this._commitStateChange({ fireEvent: true });
  };

  /** Litのイベントバインディングに寄せているため、切断時はsuperへ任せる。 */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
  }
}
