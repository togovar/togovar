# GradientSliderBar Component

再利用可能なグラデーションスライダーバーコンポーネント

## 概要

`gradient-slider-bar` は、スライダーバー、ルーラー、閾値ボタンを表示する Lit コンポーネントです。
複数のビューで同じスライダー UI を使用したい場合に便利です。

## 使用方法

### 基本的な使い方

```typescript
import './GradientSliderBar';

// テンプレート内で使用
html`
  <gradient-slider-bar
    .activeDataset=${this.thresholdData}
    .minValue=${0.2}
    .maxValue=${0.8}
    .numberOfScales=${10}
    .sliderWidth=${247.5}
    @threshold-selected=${this._handleThreshold}
  ></gradient-slider-bar>
`;
```

## プロパティ

### `activeDataset`

- **型**: `Record<string, ThresholdData>`
- **デフォルト**: `{}`
- **説明**: 閾値データとグラデーション生成のためのオブジェクト

```typescript
interface ThresholdData {
  color: string;
  min: number;
  max: number;
  minInequalitySign: Inequality;
  maxInequalitySign: Inequality;
}
```

### `minValue`

- **型**: `number`
- **デフォルト**: `0`
- **説明**: スライダーの最小値（0-1 の範囲）

### `maxValue`

- **型**: `number`
- **デフォルト**: `1`
- **説明**: スライダーの最大値（0-1 の範囲）

### `numberOfScales`

- **型**: `number`
- **デフォルト**: `10`
- **説明**: ルーラーに表示する目盛りの数

### `sliderWidth`

- **型**: `number`
- **デフォルト**: `247.5`
- **説明**: グラデーション計算用のスライダー幅（ピクセル）

## イベント

### `threshold-selected`

- **説明**: 閾値ボタンがクリックされたときに発火
- **detail 型**: `ThresholdSelectedDetail`

```typescript
interface ThresholdSelectedDetail {
  key: string;
  minValue: number;
  maxValue: number;
  minInequalitySign: Inequality;
  maxInequalitySign: Inequality;
}
```

## 使用例

### PredictionRangeSliderView での使用

```typescript
<gradient-slider-bar
  .activeDataset=${this.activeDataset}
  .minValue=${this.minValue}
  .maxValue=${this.maxValue}
  .numberOfScales=${10}
  .sliderWidth=${247.5}
  @threshold-selected=${(e: CustomEvent) => {
    const { minValue, maxValue, minInequalitySign, maxInequalitySign } = e.detail;
    // 値を処理
    this.updateValues(minValue, maxValue, minInequalitySign, maxInequalitySign);
  }}
></gradient-slider-bar>
```

### カスタムビューでの使用

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './GradientSliderBar';

@customElement('my-custom-view')
export class MyCustomView extends LitElement {
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 1;

  private _handleThreshold(e: CustomEvent) {
    console.log('Threshold selected:', e.detail);
  }

  render() {
    return html`
      <gradient-slider-bar
        .minValue=${this.min}
        .maxValue=${this.max}
        @threshold-selected=${this._handleThreshold}
      ></gradient-slider-bar>
    `;
  }
}
```

## スタイリング

コンポーネントは `prediction-range-slider.scss` のスタイルを使用します。
カスタムスタイルを適用する場合は、CSS カスタムプロパティまたは Shadow DOM のスロットを使用してください。

## 注意事項

- `minValue` と `maxValue` は 0 から 1 の範囲で指定してください
- `activeDataset` の変更、`minValue`/`maxValue` の更新時、コンポーネントは自動的に表示を更新します
- グラデーション表示には `createGradientSlider` ユーティリティ関数を使用しています
