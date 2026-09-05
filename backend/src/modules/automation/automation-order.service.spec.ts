import { Repository } from 'typeorm';
import {
  AutomationOrderService,
  formatMoney,
  toBengaliDigits,
} from './automation-order.service';
import { AutomationOrderDraft } from './entities/automation-order-draft.entity';
import { AutomationOrderSettings } from './automation-settings.service';
import { SalesService } from '../sales/sales.service';

/**
 * This is the only part of the automation that writes to sales_orders, so the
 * things pinned here are the ones that cost money when they are wrong: what
 * the customer was shown before agreeing, that agreeing twice buys one thing,
 * and that no payment identifier is ever collected.
 */

const SETTINGS: AutomationOrderSettings = {
  enabled: true,
  delivery_charge_inside_dhaka: 60,
  delivery_charge_outside_dhaka: 110,
  confirm_words: ['confirm', 'কনফার্ম', 'হ্যাঁ'],
  cancel_words: ['cancel', 'বাতিল', 'lagbe na'],
};

function draft(overrides: Partial<AutomationOrderDraft> = {}): AutomationOrderDraft {
  return {
    id: 1,
    conversation_id: 10,
    channel_id: 1,
    status: 'collecting',
    product_id: 311,
    product_name: 'Kasri Oil',
    unit_price: 990,
    quantity: 2,
    customer_name: 'Karim',
    phone: '01712345678',
    address: 'dhaka, rampura',
    district: 'Dhaka',
    delivery_charge: 60,
    sales_order_id: null,
    sales_order_number: null,
    placed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as AutomationOrderDraft;
}

describe('number formatting', () => {
  it('writes customer-facing figures in Bengali digits', () => {
    expect(toBengaliDigits(2)).toBe('২');
    expect(formatMoney(4500)).toBe('৪,৫০০');
    expect(formatMoney(990)).toBe('৯৯০');
  });
});

describe('AutomationOrderService.missingFields', () => {
  it('is empty for a complete draft', () => {
    expect(AutomationOrderService.missingFields(draft())).toEqual([]);
  });

  it('asks for the product before anything else', () => {
    const partial = draft({ product_id: null, product_name: null, customer_name: null });
    expect(AutomationOrderService.missingFields(partial)[0]).toBe('product');
  });

  it('treats a quantity of zero as missing rather than as none wanted', () => {
    expect(AutomationOrderService.missingFields(draft({ quantity: 0 }))).toEqual(['quantity']);
  });

  it('does not accept whitespace as an address', () => {
    expect(AutomationOrderService.missingFields(draft({ address: '   ' }))).toEqual(['address']);
  });

  it('asks one question at a time, in a fixed order', () => {
    const empty = draft({
      product_id: null,
      product_name: null,
      quantity: 0,
      customer_name: null,
      phone: null,
      address: null,
    });
    expect(AutomationOrderService.nextQuestion(empty)).toContain('প্রোডাক্ট');
    expect(AutomationOrderService.nextQuestion(draft())).toBeNull();
  });
});

describe('AutomationOrderService.deliveryCharge', () => {
  it('charges the Dhaka rate when the address says Dhaka', () => {
    expect(AutomationOrderService.deliveryCharge(draft(), SETTINGS)).toBe(60);
  });

  it('reads Dhaka written in Bangla', () => {
    const bn = draft({ district: null, address: 'ঢাকা, রামপুরা' });
    expect(AutomationOrderService.deliveryCharge(bn, SETTINGS)).toBe(60);
  });

  it('charges the outside rate elsewhere', () => {
    const sylhet = draft({ district: 'Sylhet', address: 'zindabazar, sylhet' });
    expect(AutomationOrderService.deliveryCharge(sylhet, SETTINGS)).toBe(110);
  });

  it('does not read "dhaka" out of the middle of another word', () => {
    const other = draft({ district: 'Chandpur', address: 'dhakashwari road, chandpur' });
    expect(AutomationOrderService.deliveryCharge(other, SETTINGS)).toBe(110);
  });
});

describe('AutomationOrderService.readback', () => {
  const text = AutomationOrderService.readback(draft());

  it('shows the price, delivery and total separately', () => {
    expect(text).toContain('*দাম:* ১,৯৮০ টাকা');
    expect(text).toContain('*ডেলিভারি চার্জ:* ৬০ টাকা');
    expect(text).toContain('*মোট বিল:* ২,০৪০ টাকা');
  });

  it('says cash on delivery, and asks for a word back', () => {
    expect(text).toContain('ক্যাশ অন ডেলিভারি');
    expect(text).toContain('কনফার্ম');
  });

  it('repeats every contact detail so a mishearing can be caught', () => {
    expect(text).toContain('Karim');
    expect(text).toContain('01712345678');
    expect(text).toContain('dhaka, rampura');
  });

  it('never mentions stock or a payment identifier', () => {
    const lower = text.toLowerCase();
    expect(lower).not.toContain('stock');
    expect(text).not.toContain('স্টক');
    expect(lower).not.toContain('bkash');
    expect(lower).not.toContain('transaction');
  });
});

describe('AutomationOrderService.isConfirmation', () => {
  it.each(['confirm', 'Confirm', 'ok confirm korlam', 'কনফার্ম', 'হ্যাঁ নিব'])(
    'accepts %s',
    (text) => {
      expect(AutomationOrderService.isConfirmation(text, SETTINGS)).toBe(true);
    },
  );

  it.each(['dam koto?', 'ekhon na', ''])('does not accept %s', (text) => {
    expect(AutomationOrderService.isConfirmation(text, SETTINGS)).toBe(false);
  });

  it('recognises backing out', () => {
    expect(AutomationOrderService.isCancellation('na lagbe na', SETTINGS)).toBe(true);
    expect(AutomationOrderService.isCancellation('confirm', SETTINGS)).toBe(false);
  });
});

describe('AutomationOrderService.place', () => {
  function makeService(options: { claimed?: boolean; createFails?: boolean } = {}) {
    const updates: any[] = [];
    const builder: any = {
      update: () => builder,
      set: (values: any) => {
        updates.push(values);
        return builder;
      },
      where: () => builder,
      execute: async () => ({ affected: options.claimed === false ? 0 : 1 }),
    };

    const draftRepository = {
      createQueryBuilder: () => builder,
      update: jest.fn(async (_where: any, values: any) => {
        updates.push(values);
        return { affected: 1 };
      }),
    } as unknown as Repository<AutomationOrderDraft>;

    const create = jest.fn(async () => {
      if (options.createFails) throw new Error('sales exploded');
      return { id: 555, salesOrderNumber: 'SO-1757000000-0001', totalAmount: 2040 };
    });

    const sales = { create } as unknown as SalesService;

    return { service: new AutomationOrderService(draftRepository, sales), create, updates };
  }

  it('creates the order through SalesService, as cash on delivery, at processing', async () => {
    const { service, create } = makeService();

    const placed = await service.place(draft({ status: 'confirming' }));

    expect(placed).toEqual({ id: 555, orderNumber: 'SO-1757000000-0001', total: 2040 });
    const dto = (create.mock.calls[0] as any[])[0];
    expect(dto.status).toBe('processing');
    expect(dto.payment_method).toBe('cash');
    expect(dto.payment_status).toBe('unpaid');
    expect(dto.order_source).toBe('messenger_bot');
    expect(dto.items).toEqual([
      { product_id: 311, product_name: 'Kasri Oil', quantity: 2, unit_price: 990 },
    ]);
  });

  it('sends no payment identifier to the ERP', async () => {
    const { service, create } = makeService();

    await service.place(draft({ status: 'confirming' }));

    const dto = JSON.stringify((create.mock.calls[0] as any[])[0]).toLowerCase();
    expect(dto).not.toContain('bkash');
    expect(dto).not.toContain('transaction');
  });

  it('places nothing when the row cannot be claimed', async () => {
    // A second "confirm", or a webhook Meta delivered twice.
    const { service, create } = makeService({ claimed: false });

    expect(await service.place(draft({ status: 'confirming' }))).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('hands the claim back when the ERP refuses, so it can be retried', async () => {
    const { service, updates } = makeService({ createFails: true });

    await expect(service.place(draft({ status: 'confirming' }))).rejects.toThrow('sales exploded');
    expect(updates.some((u) => u.status === 'confirming' && u.placed_at === null)).toBe(true);
  });
});
