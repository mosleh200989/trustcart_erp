import { CommissionService } from './commission.service';

/**
 * Commission arithmetic.
 *
 * These are the pure calculation routines pulled out of CommissionService and
 * exercised directly — no database. Commission has accumulated eleven schema
 * migrations (slabs, partials, payment requests, a later simplification) and
 * had no tests at all, which is a poor combination for code that decides what
 * staff get paid.
 *
 * The service's repositories are never touched by these methods, so they are
 * passed as null rather than mocked.
 */
function makeService(): CommissionService {
  return new CommissionService(
    null as any, null as any, null as any, null as any, null as any, null as any,
  );
}

type Slab = {
  minOrderCount: number;
  maxOrderCount: number | null;
  commissionAmount: number;
  isActive?: boolean;
};

const slab = (min: number, max: number | null, amount: number, isActive = true): Slab =>
  ({ minOrderCount: min, maxOrderCount: max, commissionAmount: amount, isActive });

/** 1-10 pay 10 each, 11-20 pay 20 each, 21+ pay 30 each. */
const LADDER: Slab[] = [slab(1, 10, 10), slab(11, 20, 20), slab(21, null, 30)];

// Private helpers, reached by index access rather than being made public
// purely for tests.
const progressive = (svc: CommissionService, count: number, slabs: Slab[]) =>
  (svc as any).calculateProgressiveSlabCommission(count, slabs);
const delta = (svc: CommissionService, prev: number, added: number, slabs: Slab[]) =>
  (svc as any).calculateProgressiveSlabDelta(prev, added, slabs);
const effectiveRate = (svc: CommissionService, count: number, slabs: Slab[]) =>
  (svc as any).calculateEffectiveSlabRate(count, slabs);

describe('progressive slab commission', () => {
  let svc: CommissionService;
  beforeEach(() => { svc = makeService(); });

  describe('slab boundaries', () => {
    // Off-by-one here pays the wrong amount to a real person, so the edges
    // either side of every boundary are checked explicitly.
    it.each([
      [0, 0],
      [1, 10],
      [9, 90],
      [10, 100],   // last order of the first slab
      [11, 120],   // first order of the second slab: 100 + 20
      [12, 140],
      [20, 300],   // 100 + 200
      [21, 330],   // first order of the open-ended slab
      [25, 450],   // 100 + 200 + 5*30
    ])('pays %i orders -> %i', (count, expected) => {
      expect(progressive(svc, count, LADDER)).toBe(expected);
    });

    it('charges each tier only for the orders that fall inside it', () => {
      // Not 25 * 30 — the rate is progressive, not retroactive.
      expect(progressive(svc, 25, LADDER)).not.toBe(750);
    });
  });

  describe('invariants', () => {
    it('never decreases as the order count rises', () => {
      let previous = 0;
      for (let n = 0; n <= 60; n++) {
        const current = progressive(svc, n, LADDER);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    });

    it('splitting a run of orders pays the same as taking them at once', () => {
      // An agent who books 7 then 8 orders must earn exactly what an agent
      // booking 15 in one go earns.
      for (const split of [1, 5, 7, 10, 11, 14]) {
        const inOneGo = progressive(svc, 15, LADDER);
        const inTwoParts =
          progressive(svc, split, LADDER) + delta(svc, split, 15 - split, LADDER);
        expect(inTwoParts).toBe(inOneGo);
      }
    });

    it('the delta of a full run equals the full amount', () => {
      expect(delta(svc, 0, 25, LADDER)).toBe(progressive(svc, 25, LADDER));
    });
  });

  describe('malformed input', () => {
    it('treats a negative or fractional count as whole orders', () => {
      expect(progressive(svc, -5, LADDER)).toBe(0);
      expect(progressive(svc, 3.9, LADDER)).toBe(30); // floors to 3
    });

    it('returns zero when there are no slabs', () => {
      expect(progressive(svc, 50, [])).toBe(0);
    });

    it('ignores inactive slabs', () => {
      const withDisabled = [slab(1, 10, 10), slab(11, 20, 20, false), slab(21, null, 30)];
      // Orders 11-20 are not covered by any active slab, so they pay nothing,
      // and 21+ resumes at 30.
      expect(progressive(svc, 20, withDisabled)).toBe(100);
      expect(progressive(svc, 21, withDisabled)).toBe(130);
    });

    it('does not depend on the order the slabs arrive in', () => {
      const shuffled = [LADDER[2], LADDER[0], LADDER[1]];
      expect(progressive(svc, 25, shuffled)).toBe(progressive(svc, 25, LADDER));
    });

    it('skips a slab whose maximum is below its minimum', () => {
      const broken = [slab(1, 10, 10), slab(20, 15, 99)];
      expect(progressive(svc, 25, broken)).toBe(100);
    });

    it('does not pay twice when slabs overlap', () => {
      const overlapping = [slab(1, 10, 10), slab(5, 20, 20)];
      // Orders 1-10 pay 10 each; 11-20 pay 20 each. The overlap at 5-10 must
      // not be counted by both slabs.
      expect(progressive(svc, 20, overlapping)).toBe(100 + 200);
    });

    it('adds nothing for a non-positive delta', () => {
      expect(delta(svc, 10, 0, LADDER)).toBe(0);
      expect(delta(svc, 10, -3, LADDER)).toBe(0);
    });
  });

  describe('effective rate', () => {
    it('is the average paid per order', () => {
      expect(effectiveRate(svc, 10, LADDER)).toBe(10);
      expect(effectiveRate(svc, 20, LADDER)).toBe(15); // 300 / 20
    });

    it('is zero rather than dividing by zero at no orders', () => {
      expect(effectiveRate(svc, 0, LADDER)).toBe(0);
    });
  });
});

describe('order-value commission', () => {
  let svc: CommissionService;
  beforeEach(() => { svc = makeService(); });

  const settings = (over: Record<string, any>): any => ({
    minOrderValue: 0,
    commissionType: 'percentage',
    percentageRate: 10,
    fixedAmount: 0,
    maxCommission: null,
    ...over,
  });

  describe('the minimum order value', () => {
    it('pays nothing below the threshold', () => {
      expect(svc.calculateCommission(499, settings({ minOrderValue: 500 }))).toBe(0);
    });

    it('pays at exactly the threshold', () => {
      // The boundary is inclusive; an order worth precisely the minimum earns.
      expect(svc.calculateCommission(500, settings({ minOrderValue: 500 }))).toBe(50);
    });
  });

  it('applies a percentage rate', () => {
    expect(svc.calculateCommission(1000, settings({ percentageRate: 7.5 }))).toBe(75);
  });

  it('applies a fixed amount regardless of order size', () => {
    const fixed = settings({ commissionType: 'fixed', fixedAmount: 40 });
    expect(svc.calculateCommission(1000, fixed)).toBe(40);
    expect(svc.calculateCommission(9000, fixed)).toBe(40);
  });

  it('caps the payout', () => {
    expect(svc.calculateCommission(10_000, settings({ maxCommission: 250 }))).toBe(250);
  });

  it('does not raise a commission that is already under the cap', () => {
    expect(svc.calculateCommission(1000, settings({ maxCommission: 250 }))).toBe(100);
  });

  it('rounds to two decimal places', () => {
    // 333.33 * 7.5% = 24.99975
    expect(svc.calculateCommission(333.33, settings({ percentageRate: 7.5 }))).toBe(25);
  });

  it('pays nothing for an unrecognised commission type', () => {
    expect(svc.calculateCommission(1000, settings({ commissionType: 'nonsense' }))).toBe(0);
  });
});
