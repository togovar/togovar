import type { Inequality } from '../../types';

const SYMBOL: Record<Inequality, string> = {
  gte: '≤',
  lte: '≤',
  gt: '<',
  lt: '<',
};

export function setInequalitySign(target: HTMLElement, sign: Inequality): void {
  target.dataset.inequalitySign = sign;
  target.textContent = SYMBOL[sign];
}

export function toggleInequality(sign: Inequality): Inequality {
  switch (sign) {
    case 'gte':
      return 'gt';
    case 'gt':
      return 'gte';
    case 'lte':
      return 'lt';
    case 'lt':
      return 'lte';
  }
}
