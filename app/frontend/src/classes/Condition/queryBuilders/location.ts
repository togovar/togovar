import type { ConditionQuery, BuildContext } from '../../../types';

/** Build query for genomic location like "chr:pos" or "chr:start-end". */
export function buildLocationQuery(ctx: BuildContext): ConditionQuery {
  const raw = ctx.values[0]?.value?.trim();
  if (!raw) return {};

  // chr: expects 1-22, X, Y, MT, etc. The number part is one or more half-width digits.
  const m = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(raw);
  if (!m) return {};

  const [, chromosome, startStr, endStr] = m;
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : undefined;

  const position =
    end === undefined
      ? start
      : { gte: Math.min(start, end), lte: Math.max(start, end) };

  return { location: { chromosome, position } };
}
