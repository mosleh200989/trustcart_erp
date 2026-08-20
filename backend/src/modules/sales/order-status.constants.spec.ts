import {
  ACTIVE_ORDER_STATUSES,
  COURIER_SYNC_ELIGIBLE_STATUSES,
  HOLD_STATUSES,
  IN_COURIER_HANDS_STATUSES,
  MANUALLY_SETTABLE_STATUSES,
  NOT_HOLDABLE_STATUSES,
  ORDER_STATUS,
  RELEASABLE_HOLD_STATUSES,
  REQUIRED_ORDER_STATUS_ENUM_VALUES,
  isHoldStatus,
} from './order-status.constants';

describe('customer_hold vs courier_hold', () => {
  it('keeps the two holds distinct', () => {
    expect(ORDER_STATUS.CUSTOMER_HOLD).toBe('customer_hold');
    expect(ORDER_STATUS.COURIER_HOLD).toBe('courier_hold');
    expect(ORDER_STATUS.CUSTOMER_HOLD).not.toBe(ORDER_STATUS.COURIER_HOLD);
  });

  it('still recognises the legacy ambiguous value on read paths', () => {
    expect(isHoldStatus('hold')).toBe(true);
    expect(isHoldStatus('customer_hold')).toBe(true);
    expect(isHoldStatus('courier_hold')).toBe(true);
    expect(isHoldStatus('HOLD')).toBe(true);
    expect(isHoldStatus('delivered')).toBe(false);
    expect(isHoldStatus(null)).toBe(false);
  });

  it('lets agents release only their own holds, never a courier hold', () => {
    expect(RELEASABLE_HOLD_STATUSES).toContain('customer_hold');
    expect(RELEASABLE_HOLD_STATUSES).toContain('hold');
    expect(RELEASABLE_HOLD_STATUSES).not.toContain('courier_hold');
  });

  it('blocks a manual hold once the parcel is with the courier', () => {
    for (const s of ['sent', 'picked', 'in_transit', 'shipped', 'delivered', 'courier_hold']) {
      expect(NOT_HOLDABLE_STATUSES).toContain(s);
    }
    // Pre-courier states must remain holdable.
    for (const s of ['pending', 'processing', 'approved', 'in_review']) {
      expect(NOT_HOLDABLE_STATUSES).not.toContain(s);
    }
  });

  it('exposes both new values for the runtime enum guard', () => {
    expect(REQUIRED_ORDER_STATUS_ENUM_VALUES).toEqual(
      expect.arrayContaining(['customer_hold', 'courier_hold', 'pickup_failed']),
    );
  });

  it('allows both holds to be set manually', () => {
    expect(MANUALLY_SETTABLE_STATUSES).toContain('customer_hold');
    expect(MANUALLY_SETTABLE_STATUSES).toContain('courier_hold');
  });

  it('counts every hold flavour as an open order and as sync-eligible', () => {
    for (const s of HOLD_STATUSES) {
      expect(ACTIVE_ORDER_STATUSES).toContain(s);
      expect(COURIER_SYNC_ELIGIBLE_STATUSES).toContain(s);
    }
  });
});

describe('Late Delivery scope', () => {
  it('lists everything that is genuinely in the courier\'s hands', () => {
    expect(IN_COURIER_HANDS_STATUSES).toEqual(
      expect.arrayContaining(['pending', 'sent', 'picked', 'in_transit', 'shipped', 'courier_hold']),
    );
  });

  it('drops orders that reached a final outcome', () => {
    for (const s of ['delivered', 'partial_delivered', 'returned', 'cancelled', 'admin_cancelled', 'completed']) {
      expect(IN_COURIER_HANDS_STATUSES).not.toContain(s);
    }
  });

  it('excludes a customer hold — the parcel never went to a courier', () => {
    expect(IN_COURIER_HANDS_STATUSES).not.toContain('customer_hold');
    expect(IN_COURIER_HANDS_STATUSES).not.toContain('hold');
  });

  it('excludes pickup_failed — the courier never collected it', () => {
    expect(IN_COURIER_HANDS_STATUSES).not.toContain('pickup_failed');
  });
});
