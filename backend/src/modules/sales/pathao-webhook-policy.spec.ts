import { OrderManagementService } from './order-management.service';

/**
 * Wiring test for the auto-apply policy on the real Pathao webhook path.
 *
 * The policy unit tests prove the decision; this proves the decision is actually
 * honoured by processPathaoStatusUpdate — that `delivered` moves the order and
 * `returned` / `cancelled` do not, while still being recorded.
 */
function makeService(order: any) {
  const savedOrders: any[] = [];
  const trackingRows: any[] = [];
  const activityRows: any[] = [];

  const salesOrderRepository: any = {
    save: jest.fn(async (o: any) => { savedOrders.push({ ...o }); return o; }),
    findOne: jest.fn(async () => order),
    update: jest.fn(async () => undefined),
    query: jest.fn(async () => []),
  };
  const courierTrackingRepository: any = {
    save: jest.fn(async (r: any) => { trackingRows.push(r); return r; }),
  };
  const activityLogRepository: any = {
    create: jest.fn((r: any) => r),
    save: jest.fn(async (r: any) => { activityRows.push(r); return r; }),
  };

  const service = new OrderManagementService(
    salesOrderRepository,
    {} as any, {} as any, {} as any,
    activityLogRepository,
    courierTrackingRepository,
    { ensureCustomerForDeliveredOrder: jest.fn(async () => null) } as any,
    { autoCompleteReferralForDeliveredOrder: jest.fn(async () => undefined) } as any,
    {} as any,
    {} as any,
    {} as any,
    { sendForStatusTransition: jest.fn(async () => undefined) } as any,
    {} as any,
    { query: jest.fn(async () => []) } as any,
  );

  return { service, order, savedOrders, trackingRows, activityRows };
}

const baseOrder = (): any => ({
  id: 4242,
  status: 'in_transit',
  courierCompany: 'Pathao',
  courierOrderId: 'DT1234ABCD',
  trackingId: 'DT1234ABCD',
  courierStatus: 'In Transit',
  codAmount: null,
  customerId: null,
});

describe('Pathao webhook honours the auto-apply policy', () => {
  it('applies order.delivered automatically', async () => {
    const { service, order } = makeService(baseOrder());
    const res: any = await (service as any).processPathaoStatusUpdate(order, {
      consignment_id: 'DT1234ABCD', event: 'order.delivered', collected_amount: 1500,
    });

    expect(order.status).toBe('delivered');
    expect(order.deliveredAt).toBeInstanceOf(Date);
    expect(res.status).toBe('success');
  });

  it('applies in-flight progress states automatically', async () => {
    for (const [event, expected] of [
      ['order.picked', 'picked'],
      ['order.in-transit', 'in_transit'],
      ['order.on-hold', 'courier_hold'],
    ] as Array<[string, string]>) {
      const o: any = { ...baseOrder(), status: 'sent' };
      const { service } = makeService(o);
      await (service as any).processPathaoStatusUpdate(o, { consignment_id: 'X', event });
      expect(o.status).toBe(expected);
    }
  });

  it('does NOT apply order.returned — it is held for review', async () => {
    const { service, order, trackingRows, activityRows } = makeService(baseOrder());
    const res: any = await (service as any).processPathaoStatusUpdate(order, {
      consignment_id: 'DT1234ABCD', event: 'order.returned', reason: 'customer refused',
    });

    expect(order.status).toBe('in_transit');            // untouched
    expect(order.courierStatus).toBe('Returned');       // but the courier's word is visible
    expect(res.message).toMatch(/held for review/i);
    expect(trackingRows.some((r) => /HELD FOR REVIEW/.test(r.remarks))).toBe(true);
    expect(activityRows.some((r) => r.actionType === 'courier_status_held_for_review')).toBe(true);
  });

  it('does NOT apply a cancellation, and keeps the reason for the reviewer', async () => {
    const o: any = { ...baseOrder(), status: 'sent' };
    const { service, activityRows } = makeService(o);
    await (service as any).processPathaoStatusUpdate(o, {
      consignment_id: 'X', event: 'order.pickup-cancelled', reason: 'merchant unreachable',
    });

    expect(o.status).toBe('sent');
    expect(o.cancelledAt).toBeUndefined();
    expect(activityRows.some((r) => /merchant unreachable/.test(r.actionDescription))).toBe(true);
  });

  it('does NOT apply partial delivery — the COD differs from the order value', async () => {
    const o: any = { ...baseOrder(), status: 'in_transit' };
    const { service } = makeService(o);
    await (service as any).processPathaoStatusUpdate(o, {
      consignment_id: 'X', event: 'order.partial-delivery', collected_amount: 700,
    });

    expect(o.status).toBe('in_transit');
    expect(Number(o.codAmount)).toBe(700); // money still captured for the reviewer
  });

  it('still records COD on a held event so finance sees the real figure', async () => {
    const o: any = { ...baseOrder(), status: 'in_transit' };
    const { service, trackingRows } = makeService(o);
    await (service as any).processPathaoStatusUpdate(o, {
      consignment_id: 'X', event: 'order.returned', collected_amount: 0, delivery_fee: 80,
    });
    const held = trackingRows.find((r) => /HELD FOR REVIEW/.test(r.remarks));
    expect(held).toBeDefined();
    expect(held.deliveryCharge).toBe(80);
  });
});
