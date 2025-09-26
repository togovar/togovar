import type { LocationLeaf, BuildContext } from '../../../types';

/** Build query for genomic location like "chr:pos" or "chr:start-end". */
export function buildLocationQuery(
  ctx: BuildContext<'location'>
): LocationLeaf {
  const v0 = ctx.values[0];
  if (!v0 || typeof v0.value !== 'string' || v0.value.trim() === '') {
    throw new Error('location: missing or empty value');
  }
  const raw = v0.value.trim();

  // chr: expects 1-22, X, Y, MT, etc. The number part is one or more half-width digits.
  const m = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(raw);
  if (!m) {
    throw new Error(
      `location: invalid format "${raw}". Expected "chr:pos" or "chr:start-end".`
    );
  }

  const [, chromosomeRaw, startStr, endStr] = m;

  const chromosome = chromosomeRaw.trim();
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : undefined;

  if (!Number.isFinite(start) || (endStr && !Number.isFinite(end!))) {
    throw new Error(`location: non-numeric position in "${raw}".`);
  }

  const position =
    end === undefined
      ? start
      : { gte: Math.min(start, end), lte: Math.max(start, end) };

  return { location: { chromosome, position } };
}
