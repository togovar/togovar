import {
  DEFAULT_RANGE_SLIDER_STATE,
  EVENT_DETAIL_KEYS,
  METER_VERTICAL_CLASS,
  RANGE_CHANGED_EVENT,
} from './RangeSliderConstants';
import {
  createRangeSliderTemplate,
  createRulerScales,
  createSearchTypeSimple,
} from './RangeSliderTemplate';
import { createThumbStyle, createTrackBackground } from './RangeSliderStyle';
import {
  formatInputValue,
  formatSliderValue,
  parseNumber,
  setRangeValue,
  toInvertValue,
} from './RangeSliderValue';
import type {
  RangeSliderAttribute,
  RangeSliderData,
  RangeSliderState,
} from './RangeSliderTypes';

const template = createRangeSliderTemplate();

/** 頻度条件UIから使うため、属性・数値入力・2本のrange inputを1つのWeb Componentにまとめる。 */
export class RangeSlider extends HTMLElement {
  private state: RangeSliderState;
  private readonly shadow: ShadowRoot;
  private readonly slider1: HTMLInputElement;
  private readonly slider2: HTMLInputElement;
  private readonly sliderTrack: HTMLElement;
  private readonly from: HTMLInputElement;
  private readonly to: HTMLInputElement;
  private readonly invertChk: HTMLInputElement;
  private readonly _meter: HTMLElement;
  private readonly _ruler: HTMLElement;
  private readonly _sliderTrackStyle: HTMLStyleElement;

  /** 外部から属性で初期値や表示方向を渡せるよう、変更を監視する属性を明示する。 */
  static get observedAttributes(): RangeSliderAttribute[] {
    return [
      'min',
      'max',
      'input-step',
      'slider-step',
      'value1',
      'value2',
      'orientation',
      'invert',
      'match',
      'ruler-number-of-steps',
    ];
  }

  /** Shadow DOM内で完結するUIとして扱うため、必要な要素参照と初期状態をまとめて作る。 */
  constructor() {
    super();

    this.state = { ...DEFAULT_RANGE_SLIDER_STATE };
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(template.content.cloneNode(true));

    this.slider1 = this._selectShadowElement<HTMLInputElement>('#slider-1');
    this.slider2 = this._selectShadowElement<HTMLInputElement>('#slider-2');
    this.sliderTrack = this._selectShadowElement<HTMLElement>('#slider-track');
    this.from = this._selectShadowElement<HTMLInputElement>('.from');
    this.to = this._selectShadowElement<HTMLInputElement>('.to');
    this.invertChk = this._selectShadowElement<HTMLInputElement>('.invert');
    this._meter = this._selectShadowElement<HTMLElement>('.meter');
    this._ruler = this._selectShadowElement<HTMLElement>('.ruler');
    this._sliderTrackStyle = this._selectShadowElement<HTMLStyleElement>(
      "style[data='slider-track-style']"
    );
  }

  /** Shadow DOMのテンプレート不整合を早く検知するため、必須要素取得を共通化する。 */
  private _selectShadowElement<T extends Element>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) {
      throw new Error(`RangeSlider template is missing ${selector}`);
    }
    return element;
  }

  /** 属性変更をフォーム部品と内部状態へ反映し、外部からの値更新でも表示を同期する。 */
  attributeChangedCallback(
    name: RangeSliderAttribute,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue || newValue === null) return;

    switch (name) {
      case 'min':
        this._setInputProperty('min', newValue);
        this.state.min = parseNumber(newValue, this.state.min);
        break;
      case 'max':
        this._setInputProperty('max', newValue);
        this.state.max = parseNumber(newValue, this.state.max);
        break;
      case 'slider-step':
        this.slider1.step = newValue;
        this.slider2.step = newValue;
        break;
      case 'input-step':
        this.from.step = newValue;
        this.to.step = newValue;
        break;
      case 'value1':
      case 'value2': {
        if (name === 'value1') {
          this.slider1.value = formatSliderValue(newValue);
        } else {
          this.slider2.value = formatSliderValue(newValue);
        }
        const rawFrom = Math.min(+this.slider1.value, +this.slider2.value);
        const rawTo = Math.max(+this.slider1.value, +this.slider2.value);
        this.state.from = Math.min(Math.max(rawFrom, this.state.min), this.state.max);
        this.state.to = Math.min(Math.max(rawTo, this.state.min), this.state.max);
        if (this.isConnected) {
          this._syncInputsFromState();
          this._fireEvent();
          return;
        }
        break;
      }
      case 'invert': {
        const invert = toInvertValue(newValue);
        this.invertChk.checked = invert;
        if (this.isConnected) {
          this._updateInvert(invert);
        } else {
          this.state.invert = invert;
        }
        break;
      }
      case 'ruler-number-of-steps':
        this.state.rulerNumberOfSteps = parseNumber(
          newValue,
          this.state.rulerNumberOfSteps
        );
        this._reRenderRuler();
        break;
      case 'match':
        this.state.match = newValue;
        break;
      case 'orientation':
        this._toggleOrientation(newValue);
        this._reRenderRuler();
        break;
    }

    this._fillSlider();
  }

  /** min/maxは4つの入力要素で同じ値を使うため、属性反映の重複を避ける。 */
  private _setInputProperty(propertyName: 'min' | 'max', value: string): void {
    this.slider1[propertyName] = value;
    this.slider2[propertyName] = value;
    this.from[propertyName] = value;
    this.to[propertyName] = value;
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
    this._ruler.innerHTML = '';
    createRulerScales(
      this.state.min,
      this.state.max,
      this.state.rulerNumberOfSteps,
      this.orientation
    ).forEach((scale) => this._ruler.appendChild(scale));
  }

  /** 選択範囲とinvert状態を背景グラデーションへ反映し、現在の条件を視覚化する。 */
  private _fillSlider(): void {
    const val1 = Math.min(+this.slider1.value, +this.slider2.value);
    const val2 = Math.max(+this.slider1.value, +this.slider2.value);
    this.sliderTrack.style.background = createTrackBackground({
      from: val1,
      to: val2,
      min: this.state.min,
      max: this.state.max,
      inverted: this.state.invert,
    });

    this._drawThumbs();
  }

  /** 2つのつまみが重なっても境界が見えるよう、左右どちら側に線を出すかを値の大小で切り替える。 */
  private _drawThumbs(): void {
    this._sliderTrackStyle.innerHTML = createThumbStyle(
      +this.slider1.value < +this.slider2.value
    );
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
    if (value !== 'simple') return;

    const matchSelector = createSearchTypeSimple();
    const currentMatch = this.state.match;
    const initial = matchSelector.querySelector<HTMLInputElement>(
      `input[name="match"][value="${currentMatch}"]`
    );
    if (initial) initial.checked = true;
    this._selectShadowElement<HTMLElement>('.wrapper').appendChild(matchSelector);
    matchSelector.addEventListener('click', (e) => {
      if (!(e.target instanceof HTMLInputElement)) return;

      this.state.match = e.target.value;
      this._syncInputsFromState();
      this._fireEvent();
    });
  }

  /** invert変更も属性変更コールバックに集約し、checkboxと描画を同じ経路で同期する。 */
  set invert(value: boolean | string) {
    this.setAttribute('invert', String(value));
  }

  /** 外部の条件エディタが必要な値だけを受け取れるよう、内部状態から公開detailを切り出す。 */
  private _fireEvent(): void {
    const eventData = Object.fromEntries(
      Object.entries(this.state).filter(([key]) =>
        EVENT_DETAIL_KEYS.includes(key as (typeof EVENT_DETAIL_KEYS)[number])
      )
    ) as RangeSliderData;

    const event = new CustomEvent<RangeSliderData>(RANGE_CHANGED_EVENT, {
      bubbles: true,
      detail: eventData,
    });

    this.dispatchEvent(event);
  }

  /** DOM接続後に属性から初期状態を確定し、入力イベントを登録して初期描画を行う。 */
  connectedCallback(): void {
    this._initStateFromAttributes();
    this._initUI();
  }

  /** 属性から内部状態を初期化する。DOM操作を含まず、状態確定だけを行う。 */
  private _initStateFromAttributes(): void {
    this.min = this.getAttribute('min') || 0;
    this.max = this.getAttribute('max') || 1;
    this.value1 = this.getAttribute('value1') || 0;
    this.value2 = this.getAttribute('value2') || 1;
    this.orientation = this.getAttribute('orientation') || 'horizontal';
    const match = this.getAttribute('match') ?? this.getAttribute('simple-search');
    this.state.match = match ?? DEFAULT_RANGE_SLIDER_STATE.match;
    this.state.min = parseNumber(this.min ?? 0, DEFAULT_RANGE_SLIDER_STATE.min);
    this.state.max = parseNumber(this.max ?? 1, DEFAULT_RANGE_SLIDER_STATE.max);
    this.state.step = parseNumber(
      this.getAttribute('step') ?? DEFAULT_RANGE_SLIDER_STATE.step,
      DEFAULT_RANGE_SLIDER_STATE.step
    );
    const rawFrom = Math.min(+(this.value1 ?? 0), +(this.value2 ?? 1));
    const rawTo = Math.max(+(this.value1 ?? 0), +(this.value2 ?? 1));
    this.state.from = Math.min(Math.max(rawFrom, this.state.min), this.state.max);
    this.state.to = Math.min(Math.max(rawTo, this.state.min), this.state.max);
    this.state.invert = toInvertValue(this.getAttribute('invert'));
    this.rulerNumberOfSteps = DEFAULT_RANGE_SLIDER_STATE.rulerNumberOfSteps;
  }

  /** イベント登録と初期描画を行う。状態確定後に呼ぶ。 */
  private _initUI(): void {
    this._addEventListeners();
    this.from.value = formatInputValue(this.state.from);
    this.to.value = formatInputValue(this.state.to);
    this._fillSlider();
    this._reRenderRuler();
    this._fireEvent();
  }

  /** 範囲値の変更だけがrange-changedを発火するよう、状態更新の副作用を明示する。 */
  private _updateRangeValue(prop: 'from' | 'to', value: unknown): void {
    setRangeValue(this.state, prop, value);
    this._syncInputsFromState();
    this._fireEvent();
  }

  /** invert変更時の同期とイベント発火を明示し、単なる代入に副作用を隠さない。 */
  private _updateInvert(value: unknown): void {
    this.state.invert = toInvertValue(value);
    this._syncInputsFromState();
    this._fireEvent();
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

  /** イベント登録と解除の対応を保つため、接続時の登録処理を1箇所にまとめる。 */
  private _addEventListeners(): void {
    if (this.lazy) {
      this.slider1.addEventListener('input', this._slider1VisualUpdate);
      this.slider2.addEventListener('input', this._slider2VisualUpdate);
      this.slider1.addEventListener('change', this._sliderLazyCommit);
      this.slider2.addEventListener('change', this._sliderLazyCommit);
    } else {
      this.slider1.addEventListener('input', this._slider1Input);
      this.slider2.addEventListener('input', this._slider2Input);
    }
    this.from.addEventListener('change', this._fromChange);
    this.to.addEventListener('change', this._toChange);
    this.invertChk.addEventListener('change', this._invertChange);
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
    setRangeValue(this.state, 'from', e.target.value);
    this._syncInputsFromState();
  };

  /** lazy モード: ドラッグ中は視覚のみ更新し range-changed を発火しない。 */
  private _slider2VisualUpdate = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    setRangeValue(this.state, 'to', e.target.value);
    this._syncInputsFromState();
  };

  /** lazy モード: スライダーを放したときだけ range-changed を発火する。 */
  private _sliderLazyCommit = (): void => {
    this._fireEvent();
  };

  /** stateを唯一の正とし、2本のスライダー・数値入力・背景描画を同期する。 */
  private _syncInputsFromState(): void {
    this.slider1.value = String(Math.min(this.state.from, this.state.to));
    this.slider2.value = String(Math.max(this.state.from, this.state.to));
    this.from.value = formatInputValue(this.state.from);
    this.to.value = formatInputValue(this.state.to);
    this._fillSlider();
  }

  /** 上限の手入力もstateへ通し、スライダー操作と同じ補正・イベント発火を使う。 */
  private _toChange = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('to', e.target.value);
  };

  /** 下限の手入力もstateへ通し、スライダー操作と同じ補正・イベント発火を使う。 */
  private _fromChange = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateRangeValue('from', e.target.value);
  };

  /** checkboxのboolean値をstateへ通し、range-changedのdetail形式を既存仕様に揃える。 */
  private _invertChange = (e: Event): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    this._updateInvert(e.target.checked);
  };

  /** DOMから外れた後に古い要素参照へイベントが残らないよう、接続時の登録を解除する。 */
  disconnectedCallback(): void {
    if (this.lazy) {
      this.slider1.removeEventListener('input', this._slider1VisualUpdate);
      this.slider2.removeEventListener('input', this._slider2VisualUpdate);
      this.slider1.removeEventListener('change', this._sliderLazyCommit);
      this.slider2.removeEventListener('change', this._sliderLazyCommit);
    } else {
      this.slider1.removeEventListener('input', this._slider1Input);
      this.slider2.removeEventListener('input', this._slider2Input);
    }
    this.from.removeEventListener('change', this._fromChange);
    this.to.removeEventListener('change', this._toChange);
    this.invertChk.removeEventListener('change', this._invertChange);
  }
}

customElements.define('range-slider', RangeSlider);
