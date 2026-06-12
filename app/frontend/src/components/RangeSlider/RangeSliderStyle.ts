type TrackBackgroundParams = {
  from: number;
  to: number;
  min: number;
  max: number;
  inverted: boolean;
};

/** 選択範囲の背景色だけを差し替えられるよう、linear-gradient生成をDOM更新から切り離す。 */
export function createTrackBackground({
  from,
  to,
  min,
  max,
  inverted,
}: TrackBackgroundParams): string {
  const range = max - min || 1;
  const percentFrom = ((from - min) * 100) / range;
  const percentTo = ((to - min) * 100) / range;
  const selectedColor = 'var(--color-key-dark1)';
  const unselectedColor = 'var(--color-light-gray)';

  if (inverted) {
    return `linear-gradient(90deg, ${selectedColor} 0%, ${selectedColor} ${percentFrom}%, ${unselectedColor} ${percentFrom}%, ${unselectedColor} ${percentTo}%, ${selectedColor} ${percentTo}%, ${selectedColor} 100% )`;
  }

  return `linear-gradient(90deg, ${unselectedColor} 0%, ${unselectedColor} ${percentFrom}% , ${selectedColor} ${percentFrom}%, ${selectedColor} ${percentTo}%, ${unselectedColor} ${percentTo}%, ${unselectedColor} 100% )`;
}

/** つまみの前後関係だけでCSSが決まるため、Shadow DOMへの反映前に文字列化する。 */
export function createThumbStyle(isSlider1Lower: boolean): string {
  if (isSlider1Lower) {
    return `#slider-1::-webkit-slider-thumb {
      border-right: 1px solid rgba(0, 0, 0, 0.5);
      transform: translateX(-1.5px);
    }
    #slider-2::-webkit-slider-thumb {
      border-left: 1px solid rgba(0, 0, 0, 0.5);
      transform: translateX(1.5px)
    }
    `;
  }

  return `#slider-2::-webkit-slider-thumb {
    border-right: 1px solid rgba(0, 0, 0, 0.5);
    transform: translateX(-1.5px);
  }
  #slider-1::-webkit-slider-thumb {
    border-left: 1px solid rgba(0, 0, 0, 0.5);
    transform: translateX(1.5px)
  }
  `;
}
