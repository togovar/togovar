let currentData = [];

export function intersection(newVal) {
  const result = {
    update: currentData.filter((value) => newVal.includes(value)),
    enter: newVal.filter((value) => !currentData.includes(value)),
    exit: currentData.filter((value) => !newVal.includes(value)),
  };
  currentData = newVal;
  return result;
}
