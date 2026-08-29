import {
  AUTO_APPLIED_COURIER_STATUSES,
  COURIER_STATUS_HELD_ACTION,
  REVIEW_REQUIRED_COURIER_STATUSES,
  getAutoAppliedCourierStatuses,
  isAutoAppliableCourierStatus,
} from './courier-automation.policy';

describe('what automation may apply on its own', () => {
  afterEach(() => {
    delete process.env.COURIER_AUTO_APPLY_STATUSES;
  });

  it('applies delivered automatically — the outcome the business wants automated', () => {
    expect(isAutoAppliableCourierStatus('delivered')).toBe(true);
  });

  it('applies in-flight progress states so tracking stays live', () => {
    for (const s of ['sent', 'picked', 'in_transit', 'shipped', 'courier_hold', 'pickup_failed']) {
      expect(isAutoAppliableCourierStatus(s)).toBe(true);
    }
  });

  it('never auto-applies a terminal money-affecting outcome', () => {
    // The whole point: a courier must not be able to write off revenue unattended.
    expect(isAutoAppliableCourierStatus('cancelled')).toBe(false);
    expect(isAutoAppliableCourierStatus('returned')).toBe(false);
    expect(isAutoAppliableCourierStatus('partial_delivered')).toBe(false);
  });

  it('keeps the two sets disjoint', () => {
    for (const s of REVIEW_REQUIRED_COURIER_STATUSES) {
      expect(AUTO_APPLIED_COURIER_STATUSES).not.toContain(s);
    }
  });

  it('is case- and whitespace-insensitive, and rejects empty input', () => {
    expect(isAutoAppliableCourierStatus('  DELIVERED ')).toBe(true);
    expect(isAutoAppliableCourierStatus('')).toBe(false);
    expect(isAutoAppliableCourierStatus(null)).toBe(false);
    expect(isAutoAppliableCourierStatus(undefined)).toBe(false);
  });

  it('can be tightened to delivered-only without a deploy', () => {
    process.env.COURIER_AUTO_APPLY_STATUSES = 'delivered';
    expect(isAutoAppliableCourierStatus('delivered')).toBe(true);
    expect(isAutoAppliableCourierStatus('in_transit')).toBe(false);
    expect(isAutoAppliableCourierStatus('cancelled')).toBe(false);
  });

  it('can be loosened to include cancelled if the business reverses the decision', () => {
    process.env.COURIER_AUTO_APPLY_STATUSES = 'delivered, cancelled';
    expect(isAutoAppliableCourierStatus('cancelled')).toBe(true);
  });

  it('falls back to the default when the override is blank or junk', () => {
    process.env.COURIER_AUTO_APPLY_STATUSES = '   ';
    expect(getAutoAppliedCourierStatuses()).toEqual(AUTO_APPLIED_COURIER_STATUSES);
    process.env.COURIER_AUTO_APPLY_STATUSES = ' , , ';
    expect(getAutoAppliedCourierStatuses()).toEqual(AUTO_APPLIED_COURIER_STATUSES);
  });

  it('exposes a stable action_type so the review backlog is queryable', () => {
    expect(COURIER_STATUS_HELD_ACTION).toBe('courier_status_held_for_review');
  });
});
