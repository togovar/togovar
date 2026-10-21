export type RulerScale = {
  label: string;
  left: string;
  vertical: boolean;
};

/** ルーラーの目盛り情報だけを作り、DOM生成は Lit の render に集約する。 */
export function createRulerScales(
  min: number,
  max: number,
  steps: number,
  orientation: string | null
): RulerScale[] {
  const safeSteps = steps > 0 ? steps : 1;
  const stepSize = (max - min) / safeSteps;
  return Array.from({ length: safeSteps + 1 }, (_, i) => {
    return {
      label: (min + i * stepSize).toFixed(1),
      left: `calc(${(i * 100) / safeSteps}% - 0.5em)`,
      vertical: orientation === 'vertical',
    };
  });
}
