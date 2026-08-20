import {
  ORDER_STATUS,
  HOLD_STATUSES,
  RELEASABLE_HOLD_STATUSES,
  NOT_HOLDABLE_STATUSES,
  IN_COURIER_HANDS_STATUSES,
  ACTIVE_ORDER_STATUSES,
  COURIER_SYNC_ELIGIBLE_STATUSES,
  MANUALLY_SETTABLE_STATUSES,
  REQUIRED_ORDER_STATUS_ENUM_VALUES,
} from './order-status.constants';

/**
 * Structural checks on the order-status groupings.
 *
 * The groupings are plain `string[]`, so a typo in one compiles fine and then
 * silently matches nothing — an order quietly missing from the Late Delivery
 * list or skipped by the courier reconciler, with no error anywhere. These
 * tests exist because the failure mode is invisible.
 *
 * order-status.constants.spec.ts covers what the groupings *mean*; this file
 * covers whether they are internally coherent.
 */

const ALL_STATUSES: string[] = Object.values(ORDER_STATUS);

const GROUPINGS: Array<[string, string[]]> = [
  ['HOLD_STATUSES', HOLD_STATUSES],
  ['RELEASABLE_HOLD_STATUSES', RELEASABLE_HOLD_STATUSES],
  ['NOT_HOLDABLE_STATUSES', NOT_HOLDABLE_STATUSES],
  ['IN_COURIER_HANDS_STATUSES', IN_COURIER_HANDS_STATUSES],
  ['ACTIVE_ORDER_STATUSES', ACTIVE_ORDER_STATUSES],
  ['COURIER_SYNC_ELIGIBLE_STATUSES', COURIER_SYNC_ELIGIBLE_STATUSES],
  ['MANUALLY_SETTABLE_STATUSES', MANUALLY_SETTABLE_STATUSES],
  ['REQUIRED_ORDER_STATUS_ENUM_VALUES', REQUIRED_ORDER_STATUS_ENUM_VALUES],
];

describe('every grouping references real statuses', () => {
  it.each(GROUPINGS)('%s contains only known ORDER_STATUS values', (_name, group) => {
    const unknown = group.filter((s) => !ALL_STATUSES.includes(s));
    expect(unknown).toEqual([]);
  });

  it.each(GROUPINGS)('%s has no duplicates', (_name, group) => {
    expect(group).toHaveLength(new Set(group).size);
  });

  it.each(GROUPINGS)('%s is not empty', (_name, group) => {
    expect(group.length).toBeGreaterThan(0);
  });
});

describe('statuses are lowercase snake_case', () => {
  // Comparisons against the database enum and incoming webhook payloads are
  // case-sensitive in places, so a stray capital is a real bug.
  it.each(ALL_STATUSES)('%s', (status) => {
    expect(status).toMatch(/^[a-z][a-z_]*$/);
  });
});

describe('relationships between groupings', () => {
  it('every releasable hold is a hold', () => {
    for (const s of RELEASABLE_HOLD_STATUSES) {
      expect(HOLD_STATUSES).toContain(s);
    }
  });

  it('a status is never both releasable by an agent and blocked from holding', () => {
    // Releasing and holding are opposite ends of the same workflow; an overlap
    // would mean an agent can release something they could never have held.
    const overlap = RELEASABLE_HOLD_STATUSES.filter((s) => NOT_HOLDABLE_STATUSES.includes(s));
    expect(overlap).toEqual([]);
  });

  it('anything in the courier\'s hands is still an open order', () => {
    for (const s of IN_COURIER_HANDS_STATUSES) {
      expect(ACTIVE_ORDER_STATUSES).toContain(s);
    }
  });

  it('anything in the courier\'s hands is still worth polling for updates', () => {
    for (const s of IN_COURIER_HANDS_STATUSES) {
      expect(COURIER_SYNC_ELIGIBLE_STATUSES).toContain(s);
    }
  });

  it('no finished order counts as active', () => {
    const finished = [
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.PARTIAL_DELIVERED,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.RETURNED,
      ORDER_STATUS.CANCELLED,
      ORDER_STATUS.ADMIN_CANCELLED,
      ORDER_STATUS.PICKUP_FAILED,
    ];
    for (const s of finished) {
      expect(ACTIVE_ORDER_STATUSES).not.toContain(s);
    }
  });

  it('no finished order is chased by the courier reconciler', () => {
    // Polling a delivered parcel forever is wasted courier API quota.
    for (const s of [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED]) {
      expect(COURIER_SYNC_ELIGIBLE_STATUSES).not.toContain(s);
    }
  });
});

describe('the deprecated hold value', () => {
  it('is still readable everywhere it used to appear', () => {
    // Historical rows still hold it; dropping it from read paths would hide them.
    for (const group of [HOLD_STATUSES, ACTIVE_ORDER_STATUSES, COURIER_SYNC_ELIGIBLE_STATUSES]) {
      expect(group).toContain(ORDER_STATUS.HOLD_LEGACY);
    }
  });

  it('is not one of the values the enum guard has to add', () => {
    // It predates the split, so it already exists in the database enum.
    expect(REQUIRED_ORDER_STATUS_ENUM_VALUES).not.toContain(ORDER_STATUS.HOLD_LEGACY);
  });
});

describe('the boot-time enum guard', () => {
  it('covers every status the manual endpoint can write', () => {
    // Each of the three enum-fix migrations in db/migrations exists because the
    // code wrote a status the database enum did not have. Anything settable
    // must either be an original enum value or be listed for the guard to add.
    const guarded = new Set<string>(REQUIRED_ORDER_STATUS_ENUM_VALUES);
    const introducedAfterTheOriginalEnum = [
      ORDER_STATUS.PICKUP_FAILED,
      ORDER_STATUS.CUSTOMER_HOLD,
      ORDER_STATUS.COURIER_HOLD,
    ];

    for (const status of introducedAfterTheOriginalEnum) {
      expect(MANUALLY_SETTABLE_STATUSES).toContain(status);
      expect(guarded.has(status)).toBe(true);
    }
  });
});
