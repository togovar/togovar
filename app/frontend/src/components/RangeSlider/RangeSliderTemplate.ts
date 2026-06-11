const RANGE_SLIDER_TEMPLATE = `
<style data="slider-style">
input[type="range"] {
    height: 24px;
    padding: 0;
}

input[type="range"]::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 8px;
}

.-vertical {
  transform: rotate(-90deg);
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1em;
    width: 3px;
    background-color: transparent;
    border-top: solid 1px rgba(0, 0, 0, 0.5);
    border-bottom: solid 1px rgba(0, 0, 0, 0.5);
    cursor: col-resize;
    pointer-events: auto;
    margin-top: -0.2em;
}
</style>
<style data="slider-track-style"></style>
<div class="wrapper" part="wrapper">
  <div class="input" part="div-input">
    <input class="from" name="lower-limit" part="num-input limit-input" type="number" title="Lower limit">
    ~
    <input class="to" name="upper-limit" part="num-input limit-input" type="number" title="Upper limit">
    <label part="checkbox-label label">
      <input class="invert" name="invert-range" type="checkbox" part="checkbox">Invert range
    </label>
  </div>
  <div class="meter" part="meter">
    <div class="meter-container" part="meter-container">
      <div class="slider-track" id="slider-track" part="slider-track">
        <div class="ruler" part="ruler"></div>
      </div>
      <input
        part="slider"
        type="range"
        name="slider-1"
        id="slider-1"
        aria-label="Lower range limit"
      />
      <input
        part="slider"
        type="range"
        name="slider-2"
        id="slider-2"
        aria-label="Upper range limit"
      />
    </div>
  </div>
</div>
`;

/** Shadow DOM用テンプレートは毎回cloneするため、HTML文字列からtemplate要素へ閉じ込める。 */
export function createRangeSliderTemplate(): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = RANGE_SLIDER_TEMPLATE;
  return template;
}

/** ルーラーの目盛り要素を純粋関数として生成し、View の DOM 操作から切り離す。 */
export function createRulerScales(
  min: number,
  max: number,
  steps: number,
  orientation: string | null
): HTMLElement[] {
  const stepSize = (max - min) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const scale = document.createElement('div');
    scale.className = 'scale';
    scale.part = 'scale';
    scale.part.add(`scale-${orientation}`);
    scale.innerText = (min + i * stepSize).toFixed(1);
    scale.style.left = `calc(${(i * 100) / steps}% - 0.5em)`;
    return scale;
  });
}

/** simple search用のmatch切替UIは任意機能なので、必要なインスタンスごとに生成する。 */
export function createSearchTypeSimple(): HTMLDivElement {
  const searchTypeSimple = document.createElement('div');
  searchTypeSimple.className = 'match';
  searchTypeSimple.part = 'match';
  searchTypeSimple.innerHTML = `
<label part="match label">
  <input class="all" name="match" type="radio" value="all">
  for all datasets
</label>
<label part="label">
  <input class="any" checked="checked" name="match" type="radio" value="any">
  for any dataset
</label>
`;
  return searchTypeSimple;
}
