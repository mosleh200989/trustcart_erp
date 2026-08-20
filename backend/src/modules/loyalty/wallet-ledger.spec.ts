import { LoyaltyService } from './loyalty.service';
import { CustomerWallet } from './entities/customer-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

/**
 * Wallet ledger behaviour.
 *
 * This is customer money. The schema history shows why it needs covering:
 * `wallet-ledger-hardening-migration.sql` had to add an idempotency_key column
 * and a unique index "for safe retries", and a second migration was then needed
 * because the first had not reached every database. The database constraint
 * stops a duplicate row being written; these tests check the service actually
 * honours the key rather than surfacing a constraint violation as a 500.
 *
 * Backed by an in-memory stand-in for the transaction manager, so the arithmetic
 * and the guard clauses are exercised without a database.
 */

interface FakeWallet {
  id: number;
  customerId?: number;
  customerUuid?: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

function makeService() {
  const wallets: FakeWallet[] = [];
  const transactions: any[] = [];
  const lockModes: Array<string | undefined> = [];
  let walletSeq = 1;
  let txSeq = 1;

  const walletRepo = {
    findOne: jest.fn(async ({ where, lock }: any) => {
      lockModes.push(lock?.mode);
      return (
        wallets.find((w) =>
          where.customerUuid !== undefined
            ? w.customerUuid === where.customerUuid
            : w.customerId === where.customerId,
        ) || null
      );
    }),
    create: (data: any) => ({ ...data }),
    save: jest.fn(async (w: any) => {
      if (!w.id) {
        w.id = walletSeq++;
        wallets.push(w);
      }
      return w;
    }),
  };

  const txRepo = {
    findOne: jest.fn(async ({ where }: any) =>
      transactions.find((t) => t.idempotencyKey === where.idempotencyKey) || null,
    ),
    create: (data: any) => ({ ...data }),
    save: jest.fn(async (t: any) => {
      t.id = txSeq++;
      transactions.push(t);
      return t;
    }),
  };

  const manager = {
    getRepository: (entity: any) => (entity === CustomerWallet ? walletRepo : txRepo),
  };

  const service: LoyaltyService = Object.create(LoyaltyService.prototype);
  (service as any).walletRepo = {
    manager: { transaction: async (cb: any) => cb(manager) },
  };

  return { service, wallets, transactions, lockModes, walletRepo, txRepo };
}

const CUSTOMER = 42;

describe('crediting a wallet', () => {
  it('creates the wallet and records the balance after the movement', async () => {
    const { service, wallets, transactions } = makeService();

    const tx: any = await service.creditWallet(CUSTOMER, 250, 'refund');

    expect(wallets[0].balance).toBe(250);
    expect(wallets[0].totalEarned).toBe(250);
    expect(tx.transactionType).toBe('credit');
    expect(tx.balanceAfter).toBe(250);
    expect(tx.status).toBe('posted');
    expect(transactions).toHaveLength(1);
  });

  it('accumulates across several credits', async () => {
    const { service, wallets } = makeService();

    await service.creditWallet(CUSTOMER, 100, 'refund');
    await service.creditWallet(CUSTOMER, 50.5, 'bonus');

    expect(wallets[0].balance).toBe(150.5);
  });

  it('takes a write lock on the wallet row', async () => {
    // Without this, two concurrent movements can read the same balance and
    // each overwrite the other's result.
    const { service, lockModes } = makeService();
    await service.creditWallet(CUSTOMER, 100, 'refund');
    expect(lockModes).toContain('pessimistic_write');
  });
});

describe('idempotency', () => {
  it('does not credit twice for the same key', async () => {
    // The exact scenario the hardening migration was written for: a retried
    // request must not hand the customer the money a second time.
    const { service, wallets, transactions } = makeService();

    const first: any = await service.creditWallet(CUSTOMER, 500, 'refund', 'r', 1, 'refund-order-77');
    const second: any = await service.creditWallet(CUSTOMER, 500, 'refund', 'r', 1, 'refund-order-77');

    expect(wallets[0].balance).toBe(500);
    expect(transactions).toHaveLength(1);
    expect(second.id).toBe(first.id);
  });

  it('returns the original transaction rather than a fresh one', async () => {
    const { service } = makeService();
    const first: any = await service.creditWallet(CUSTOMER, 500, 'refund', 'first call', 1, 'k');
    const second: any = await service.creditWallet(CUSTOMER, 999, 'bonus', 'second call', 2, 'k');

    // The replay is ignored entirely — including its different amount.
    expect(second.amount).toBe(first.amount);
    expect(second.description).toBe('first call');
  });

  it('treats distinct keys as distinct movements', async () => {
    const { service, wallets, transactions } = makeService();
    await service.creditWallet(CUSTOMER, 100, 'refund', undefined, 1, 'a');
    await service.creditWallet(CUSTOMER, 100, 'refund', undefined, 2, 'b');

    expect(wallets[0].balance).toBe(200);
    expect(transactions).toHaveLength(2);
  });

  it('also guards debits', async () => {
    const { service, wallets, transactions } = makeService();
    await service.creditWallet(CUSTOMER, 500, 'refund');

    await service.debitWallet(CUSTOMER, 200, 'purchase', undefined, 'spend-order-9');
    await service.debitWallet(CUSTOMER, 200, 'purchase', undefined, 'spend-order-9');

    expect(wallets[0].balance).toBe(300);
    expect(transactions.filter((t) => t.transactionType === 'debit')).toHaveLength(1);
  });

  it('without a key, every call is a separate movement', async () => {
    // Documents current behaviour: callers that omit the key get no protection,
    // so anything money-related should always pass one.
    const { service, wallets } = makeService();
    await service.creditWallet(CUSTOMER, 100, 'refund');
    await service.creditWallet(CUSTOMER, 100, 'refund');
    expect(wallets[0].balance).toBe(200);
  });
});

describe('debiting a wallet', () => {
  it('reduces the balance and tracks total spent', async () => {
    const { service, wallets } = makeService();
    await service.creditWallet(CUSTOMER, 500, 'refund');

    const tx: any = await service.debitWallet(CUSTOMER, 120, 'purchase');

    expect(wallets[0].balance).toBe(380);
    expect(wallets[0].totalSpent).toBe(120);
    expect(tx.balanceAfter).toBe(380);
  });

  it('refuses to overdraw', async () => {
    const { service, wallets, transactions } = makeService();
    await service.creditWallet(CUSTOMER, 100, 'refund');

    await expect(service.debitWallet(CUSTOMER, 100.01, 'purchase')).rejects.toThrow(
      /Insufficient wallet balance/,
    );

    // The balance must be untouched by the failed attempt.
    expect(wallets[0].balance).toBe(100);
    expect(transactions.filter((t) => t.transactionType === 'debit')).toHaveLength(0);
  });

  it('allows spending the balance down to exactly zero', async () => {
    const { service, wallets } = makeService();
    await service.creditWallet(CUSTOMER, 100, 'refund');

    await service.debitWallet(CUSTOMER, 100, 'purchase');

    expect(wallets[0].balance).toBe(0);
  });

  it('fails when there is no wallet at all', async () => {
    const { service } = makeService();
    await expect(service.debitWallet(CUSTOMER, 10, 'purchase')).rejects.toThrow(/Wallet not found/);
  });
});

describe('amount validation', () => {
  it.each([
    ['zero', 0],
    ['negative', -50],
    ['not a number', NaN],
    ['infinite', Infinity],
    ['rounding down to zero', 0.001],
  ])('rejects %s', async (_label, amount) => {
    const { service, wallets } = makeService();
    await expect(service.creditWallet(CUSTOMER, amount as number, 'refund')).rejects.toThrow();
    expect(wallets).toHaveLength(0);
  });

  it('rounds to two decimal places', async () => {
    const { service, wallets } = makeService();
    await service.creditWallet(CUSTOMER, 10.994, 'refund');
    expect(wallets[0].balance).toBe(10.99);
  });
});
