import { BadRequestException } from '@nestjs/common';
import { SalesManagerService } from './sales-manager.service';

describe('SalesManagerService bulk rejection', () => {
  const createService = (existingCustomerIds: number[] = [101, 102]) => {
    const transactionQueries: Array<{ sql: string; params: any[] }> = [];
    const transactionManager = {
      query: jest.fn(async (sql: string, params: any[] = []) => {
        transactionQueries.push({ sql, params });
        if (sql.includes('SELECT id') && sql.includes('FROM customers')) {
          return existingCustomerIds.map((id) => ({ id }));
        }
        return [];
      }),
    };
    const customerRepository = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('information_schema.columns')) {
          return [{ column_name: 'assigned_by' }, { column_name: 'assigned_at' }];
        }
        return [];
      }),
      manager: {
        transaction: jest.fn(async (callback: (manager: any) => Promise<any>) => (
          callback(transactionManager)
        )),
      },
    };

    const service = new SalesManagerService(
      customerRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, customerRepository, transactionQueries };
  };

  it('rejects unique customers atomically and clears future/foreign assignments', async () => {
    const { service, customerRepository, transactionQueries } = createService();

    await expect(service.bulkRejectLeads([101, 102, 101], 77)).resolves.toEqual({
      requested: 2,
      rejected: 2,
      notFound: 0,
      customerIds: [101, 102],
    });

    expect(customerRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionQueries).toHaveLength(5);
    expect(transactionQueries[0].sql).toContain('FOR UPDATE');
    expect(transactionQueries[1].sql).toContain("customer_type = 'rejected'");
    expect(transactionQueries[1].sql).toContain("lead_status = 'rejected'");
    expect(transactionQueries[2].sql).toContain('INSERT INTO customer_tiers');
    expect(transactionQueries[2].sql).toContain("tier = 'rejected'");
    expect(transactionQueries[2].sql).toContain('$2::integer');
    expect(transactionQueries[2].sql).toContain("($2::integer)::text");
    expect(transactionQueries[3].sql).toContain('UPDATE scheduled_lead_assignments');
    expect(transactionQueries[3].sql).toContain("status = 'cancelled'");
    expect(transactionQueries[4].sql).toContain('UPDATE sales_orders');
    expect(transactionQueries[4].sql).toContain("foreign_customer.source");
  });

  it('reports selected records that no longer exist', async () => {
    const { service } = createService([101]);

    await expect(service.bulkRejectLeads([101, 999], 77)).resolves.toMatchObject({
      requested: 2,
      rejected: 1,
      notFound: 1,
      customerIds: [101],
    });
  });

  it('rejects empty selections and invalid actors before opening a transaction', async () => {
    const { service, customerRepository } = createService();

    await expect(service.bulkRejectLeads([], 77)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.bulkRejectLeads([101], 0)).rejects.toBeInstanceOf(BadRequestException);
    expect(customerRepository.manager.transaction).not.toHaveBeenCalled();
  });
});
