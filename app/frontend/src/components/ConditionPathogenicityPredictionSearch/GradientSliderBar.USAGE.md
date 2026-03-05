# GradientSliderBar 使用ガイド

## 📋 必要な値

`gradient-slider-bar` コンポーネントを使用するには、以下の値を渡す必要があります：

### 1. **activeDataset** (必須)

閾値データとグラデーション表示のためのオブジェクト

```typescript
activeDataset: Record<
  string,
  {
    color: string; // グラデーションの色 (例: '#ff5a54', '#04af58')
    min: number; // 閾値の最小値 (0-1)
    max: number; // 閾値の最大値 (0-1)
    minInequalitySign: Inequality; // 最小値の不等号 ('gte' | 'gt' | 'lte' | 'lt')
    maxInequalitySign: Inequality; // 最大値の不等号 ('gte' | 'gt' | 'lte' | 'lt')
  }
>;
```

### 2. **minValue** (任意)

- 型: `number`
- デフォルト: `0`
- 範囲: `0-1`
- 説明: スライダーバーの左側の位置

### 3. **maxValue** (任意)

- 型: `number`
- デフォルト: `1`
- 範囲: `0-1`
- 説明: スライダーバーの右側の位置

### 4. **numberOfScales** (任意)

- 型: `number`
- デフォルト: `10`
- 説明: ルーラーに表示する目盛りの数

### 5. **sliderWidth** (任意)

- 型: `number`
- デフォルト: `247.5`
- 説明: グラデーション計算用のスライダー幅（ピクセル）

---

## 🎯 Frequency での使用例

Frequency（頻度）データで使用する場合の例：

### 基本的な使い方（閾値なし）

```typescript
import './GradientSliderBar';

// シンプルな頻度スライダー（0.0 ~ 1.0）
html`
  <gradient-slider-bar
    .minValue=${0.0}
    .maxValue=${1.0}
    .numberOfScales=${10}
    .sliderWidth=${247.5}
  ></gradient-slider-bar>
`;
```

### 閾値付きの頻度スライダー

```typescript
// Frequency用の閾値データを定義
const FREQUENCY_THRESHOLDS = {
  'Very Rare': {
    color: '#04af58', // 緑
    min: 0,
    max: 0.001,
    minInequalitySign: 'gte' as const,
    maxInequalitySign: 'lt' as const,
  },
  Rare: {
    color: '#ffae00', // オレンジ
    min: 0.001,
    max: 0.01,
    minInequalitySign: 'gte' as const,
    maxInequalitySign: 'lt' as const,
  },
  Common: {
    color: '#ff5a54', // 赤
    min: 0.01,
    max: 1.0,
    minInequalitySign: 'gte' as const,
    maxInequalitySign: 'lte' as const,
  },
};

// 使用
html`
  <gradient-slider-bar
    .activeDataset=${FREQUENCY_THRESHOLDS}
    .minValue=${0.0}
    .maxValue=${0.05}
    .numberOfScales=${10}
    .sliderWidth=${247.5}
    @threshold-selected=${(e: CustomEvent) => {
      const { minValue, maxValue, minInequalitySign, maxInequalitySign } =
        e.detail;
      console.log('Selected threshold:', e.detail);
      // 値を更新
      this.updateFrequencyRange(minValue, maxValue);
    }}
  ></gradient-slider-bar>
`;
```

### カスタム頻度範囲（例: AFR 頻度）

```typescript
const AFR_FREQUENCY_THRESHOLDS = {
  Singleton: {
    color: '#9def3A',
    min: 0,
    max: 0.0001,
    minInequalitySign: 'gte' as const,
    maxInequalitySign: 'lte' as const,
  },
  'Ultra-rare': {
    color: '#bbba7e',
    min: 0.0001,
    max: 0.001,
    minInequalitySign: 'gt' as const,
    maxInequalitySign: 'lte' as const,
  },
  Rare: {
    color: '#ffae00',
    min: 0.001,
    max: 0.05,
    minInequalitySign: 'gt' as const,
    maxInequalitySign: 'lte' as const,
  },
  Common: {
    color: '#ff5a54',
    min: 0.05,
    max: 1.0,
    minInequalitySign: 'gt' as const,
    maxInequalitySign: 'lte' as const,
  },
};
```

---

## 🔧 完全な実装例（Frequency Slider Component）

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './GradientSliderBar';
import type { ThresholdSelectedDetail } from './GradientSliderBar';

@customElement('frequency-range-slider')
export class FrequencyRangeSlider extends LitElement {
  @property({ type: Number }) minFrequency = 0;
  @property({ type: Number }) maxFrequency = 1;

  @property({ type: Object })
  frequencyThresholds = {
    'Very Rare': {
      color: '#04af58',
      min: 0,
      max: 0.001,
      minInequalitySign: 'gte' as const,
      maxInequalitySign: 'lt' as const,
    },
    Rare: {
      color: '#ffae00',
      min: 0.001,
      max: 0.01,
      minInequalitySign: 'gte' as const,
      maxInequalitySign: 'lt' as const,
    },
    Common: {
      color: '#ff5a54',
      min: 0.01,
      max: 1.0,
      minInequalitySign: 'gte' as const,
      maxInequalitySign: 'lte' as const,
    },
  };

  private _handleThresholdClick(e: CustomEvent<ThresholdSelectedDetail>) {
    const { minValue, maxValue } = e.detail;
    this.minFrequency = minValue;
    this.maxFrequency = maxValue;

    // 親コンポーネントに通知
    this.dispatchEvent(
      new CustomEvent('frequency-changed', {
        detail: { from: minValue, to: maxValue },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div>
        <label>Frequency Range:</label>
        <div>
          <input
            type="number"
            .value=${String(this.minFrequency)}
            min="0"
            max="1"
            step="0.001"
            @input=${(e: Event) => {
              this.minFrequency = parseFloat(
                (e.target as HTMLInputElement).value
              );
            }}
          />
          ~
          <input
            type="number"
            .value=${String(this.maxFrequency)}
            min="0"
            max="1"
            step="0.001"
            @input=${(e: Event) => {
              this.maxFrequency = parseFloat(
                (e.target as HTMLInputElement).value
              );
            }}
          />
        </div>

        <gradient-slider-bar
          .activeDataset=${this.frequencyThresholds}
          .minValue=${this.minFrequency}
          .maxValue=${this.maxFrequency}
          .numberOfScales=${10}
          .sliderWidth=${247.5}
          @threshold-selected=${this._handleThresholdClick}
        ></gradient-slider-bar>
      </div>
    `;
  }
}
```

---

## 📊 データセット別の例

### 1. AlphaMissense 用

```typescript
const ALPHAMISSENSE_THRESHOLD = {
  'Likely benign': {
    color: '#9def3A',
    min: 0,
    max: 0.34,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Ambiguous: {
    color: '#bbba7e',
    min: 0.34,
    max: 0.564,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  'Likely pathogenic': {
    color: '#ffae00',
    min: 0.564,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
};
```

### 2. SIFT 用

```typescript
const SIFT_THRESHOLD = {
  Tolerated: {
    color: '#ff5a54',
    min: 0,
    max: 0.05,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Deleterious: {
    color: '#04af58',
    min: 0.05,
    max: 1,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
};
```

### 3. PolyPhen 用

```typescript
const POLYPHEN_THRESHOLD = {
  Benign: {
    color: '#04af58',
    min: 0,
    max: 0.446,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  'Possibly damaging': {
    color: '#ffae00',
    min: 0.446,
    max: 0.908,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
  'Probably damaging': {
    color: '#ff5a54',
    min: 0.908,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
};
```

---

## ⚡ イベントハンドリング

### threshold-selected イベント

閾値ボタンがクリックされたときに発火します。

```typescript
@threshold-selected=${(e: CustomEvent<ThresholdSelectedDetail>) => {
  const detail = e.detail;
  // detail.key: 閾値のキー (例: 'Very Rare')
  // detail.minValue: 最小値 (0-1)
  // detail.maxValue: 最大値 (0-1)
  // detail.minInequalitySign: 最小値の不等号
  // detail.maxInequalitySign: 最大値の不等号
}}
```

---

## 🎨 スタイルのカスタマイズ

デフォルトでは `prediction-range-slider.scss` を使用していますが、
カスタムスタイルを適用する場合：

```typescript
// 独自のスタイルファイルを作成
import CustomStyles from './frequency-slider.scss';

@customElement('my-frequency-slider')
export class MyFrequencySlider extends LitElement {
  static styles = [CustomStyles];
  // ...
}
```

---

## 💡 ヒント

1. **閾値なしで使用**: `activeDataset={}` を渡すと、単純なスライダーバーとして機能します
2. **動的な更新**: `minValue` / `maxValue` / `activeDataset` の変更は自動的に反映されます
3. **値の範囲**: すべての値は 0〜1 の範囲で正規化されます
4. **不等号の種類**:
   - `'gte'`: ≥ (以上)
   - `'gt'`: > (より大きい)
   - `'lte'`: ≤ (以下)
   - `'lt'`: < (より小さい)
