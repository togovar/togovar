export const createGradientSlider = (activeDataset, rangeEl, sliderWidth) => {
  const gradientStops = Object.entries(activeDataset).flatMap(([_, value]) => {
    return [
      { color: value.color, division: value.min },
      { color: value.color, division: value.max },
    ];
  });

  let rangeLeft = parseInt(rangeEl.style.left) / 100 || 0;

  const gradientCss = gradientStops
    .map((stop) => {
      const position = (stop.division - rangeLeft) * sliderWidth;
      return `${stop.color} ${position}px`;
    })
    .join(', ');

  return `linear-gradient(to right, ${gradientCss})`;
};
