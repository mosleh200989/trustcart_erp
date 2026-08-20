import {
  PATHAO_EVENT_STATUS_MAP,
  humanizePathaoEvent,
  isPathaoStatusRegression,
  lookupPathaoEventStatus,
} from './pathao-status.map';

describe('Pathao webhook event mapping', () => {
  it('maps every delivery state Pathao publishes', () => {
    const cases: Array<[string, string]> = [
      ['order.created', 'sent'],
      ['order.pickup-requested', 'sent'],
      ['order.assigned-for-pickup', 'sent'],
      ['order.picked', 'picked'],
      ['order.pickup-failed', 'pickup_failed'],
      ['order.pickup-cancelled', 'cancelled'],
      ['order.at-the-sorting-hub', 'in_transit'],
      ['order.in-transit', 'in_transit'],
      ['order.received-at-last-mile-hub', 'in_transit'],
      ['order.assigned-for-delivery', 'in_transit'],
      ['order.delivered', 'delivered'],
      ['order.partial-delivery', 'partial_delivered'],
      ['order.on-hold', 'hold'],
      ['order.returned', 'returned'],
      ['order.returned-to-merchant', 'returned'],
      ['order.paid-return', 'returned'],
    ];
    for (const [event, expected] of cases) {
      expect(lookupPathaoEventStatus(event)).toEqual({ status: expected });
    }
  });

  it('never reads a FAILED delivery as a successful one', () => {
    // Regression guard: "order.delivery-failed" contains "deliver" and was previously
    // matched by a substring heuristic, marking undelivered parcels as delivered.
    expect(lookupPathaoEventStatus('order.delivery-failed')).toEqual({ status: 'hold' });
  });

  it('treats non-delivery events as informational, not as a status', () => {
    for (const event of [
      'order.updated',
      'order.paid',
      'order.exchanged',
      'order.return-id-created',
      'store.created',
      'store.updated',
    ]) {
      expect(lookupPathaoEventStatus(event)).toEqual({ status: null });
    }
  });

  it('is case- and whitespace-insensitive', () => {
    expect(lookupPathaoEventStatus('  Order.Delivered ')).toEqual({ status: 'delivered' });
  });

  it('returns undefined for unknown events so the caller can fall back', () => {
    expect(lookupPathaoEventStatus('order.teleported')).toBeUndefined();
    expect(lookupPathaoEventStatus(undefined)).toBeUndefined();
    expect(lookupPathaoEventStatus('')).toBeUndefined();
  });

  it('never maps an event to a raw event string', () => {
    const allowed = new Set([
      'sent', 'picked', 'in_transit', 'delivered',
      'partial_delivered', 'returned', 'cancelled', 'hold', 'pickup_failed',
    ]);
    for (const status of Object.values(PATHAO_EVENT_STATUS_MAP)) {
      if (status !== null) expect(allowed.has(status)).toBe(true);
    }
  });
});

describe('out-of-order webhook protection', () => {
  it('blocks a finished order being dragged back in-flight', () => {
    expect(isPathaoStatusRegression('delivered', 'sent')).toBe(true);
    expect(isPathaoStatusRegression('delivered', 'in_transit')).toBe(true);
    expect(isPathaoStatusRegression('returned', 'picked')).toBe(true);
    expect(isPathaoStatusRegression('cancelled', 'hold')).toBe(true);
  });

  it('allows normal forward progress', () => {
    expect(isPathaoStatusRegression('sent', 'picked')).toBe(false);
    expect(isPathaoStatusRegression('picked', 'in_transit')).toBe(false);
    expect(isPathaoStatusRegression('in_transit', 'delivered')).toBe(false);
    expect(isPathaoStatusRegression(null, 'sent')).toBe(false);
  });

  it('allows terminal-to-terminal corrections', () => {
    expect(isPathaoStatusRegression('delivered', 'returned')).toBe(false);
    expect(isPathaoStatusRegression('partial_delivered', 'delivered')).toBe(false);
  });
});

describe('courier status text', () => {
  it('renders a readable label', () => {
    expect(humanizePathaoEvent('order.at-the-sorting-hub')).toBe('At The Sorting Hub');
    expect(humanizePathaoEvent('order.delivered')).toBe('Delivered');
    expect(humanizePathaoEvent('order.pickup-failed')).toBe('Pickup Failed');
  });

  it('fits the courier_status varchar(50) column', () => {
    for (const event of Object.keys(PATHAO_EVENT_STATUS_MAP)) {
      expect(humanizePathaoEvent(event).length).toBeLessThanOrEqual(50);
    }
  });
});
