const INEQUALITY_SIGN = {
  gte: '&#8804;',
  lte: '&#8804;',
  gt: '&#60;',
  lt: '&#60;',
};

export const setInequalitySign = (target, sign) => {
  target.dataset.inequalitySign = sign;
  target.innerHTML = INEQUALITY_SIGN[sign];
};
