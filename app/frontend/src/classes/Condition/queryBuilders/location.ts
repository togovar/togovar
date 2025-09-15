// app/frontend/src/classes/Condition/query-builders/location.ts
import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  LocationQuery,
} from '../../../types/conditionTypes';
import type { BuildContext } from './index';

/** Build query for genomic location like "chr:pos" or "chr:start-end". */
export function buildLocationQuery(ctx: BuildContext): ConditionQuery {
  const first = ctx.values[0] as ConditionItemValueViewElement | undefined;
  if (!first) return {};

  const raw = first.value ?? '';
  const [chromosome, positionStr = ''] = raw.split(':');
  const parts = positionStr.split('-');

  const position =
    parts.length === 1
      ? Number(parts[0])
      : { gte: Number(parts[0]), lte: Number(parts[1]) };

  const q: LocationQuery = { location: { chromosome, position } };
  return q;
}
