type IntersectionResult<T> = {
  update: T[];
  enter: T[];
  exit: T[];
};

let currentData: unknown[] = [];

/** 前回値との差分を小さな配列操作として再利用するため、追加・継続・削除に分けて返す。 */
export function intersection<T>(newValue: readonly T[]): IntersectionResult<T> {
  const previousData = currentData as T[];
  const previousSet = new Set(previousData);
  const newSet = new Set(newValue);

  const result = {
    update: previousData.filter((value) => newSet.has(value)),
    enter: newValue.filter((value) => !previousSet.has(value)),
    exit: previousData.filter((value) => !newSet.has(value)),
  };

  currentData = [...newValue];

  return result;
}
