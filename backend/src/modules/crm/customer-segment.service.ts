import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';

export type SegmentType = 'new' | 'legacy' | 'mixed';

@Injectable()
export class CustomerSegmentService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async getCustomersBySegment(
    type: SegmentType,
    params: { page?: number; limit?: number; search?: string },
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;
    const searchTerm = (params.search || '').trim();

    // Subqueries to check order prefix types per customer
    // has_so: customer has at least one order starting with "SO-"
    // has_leg: customer has at least one order starting with "LEG-"
    let whereClause = '';
    if (type === 'new') {
      // ALL orders start with SO- (has SO, no LEG)
      whereClause = `
        EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')
      `;
    } else if (type === 'legacy') {
      // ALL orders start with LEG- (has LEG, no SO)
      whereClause = `
        EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')
      `;
    } else {
      // Has BOTH SO- and LEG- orders
      whereClause = `
        EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')
        AND EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')
      `;
    }

    let searchClause = '';
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (searchTerm) {
      searchClause = `
        AND (
          c.name ILIKE $${paramIdx}
          OR c.last_name ILIKE $${paramIdx}
          OR c.phone ILIKE $${paramIdx}
          OR c.email ILIKE $${paramIdx}
        )
      `;
      queryParams.push(`%${searchTerm}%`);
      paramIdx++;
    }

    const countSql = `
      SELECT COUNT(DISTINCT c.id)::int AS total
      FROM customers c
      WHERE c.is_deleted = false
        AND (${whereClause})
        ${searchClause}
    `;
    const countResult = await this.customerRepo.query(countSql, queryParams);
    const total = countResult?.[0]?.total || 0;

    const dataSql = `
      SELECT
        c.id,
        c.name,
        c.last_name AS "lastName",
        c.email,
        c.phone,
        c.district,
        c.city,
        c.status,
        c.created_at AS "createdAt",
        (SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id) AS "totalOrders",
        (SELECT COALESCE(SUM(so.total_amount), 0)::numeric FROM sales_orders so WHERE so.customer_id = c.id) AS "totalSpent",
        (SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%') AS "soCount",
        (SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%') AS "legCount",
        u.name AS "agentName"
      FROM customers c
      LEFT JOIN users u ON u.id = c.assigned_user_id
      WHERE c.is_deleted = false
        AND (${whereClause})
        ${searchClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    queryParams.push(limit, offset);

    const data = await this.customerRepo.query(dataSql, queryParams);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSegmentCounts() {
    const sql = `
      SELECT
        COUNT(DISTINCT CASE
          WHEN has_so AND NOT has_leg THEN c.id
        END)::int AS "newCount",
        COUNT(DISTINCT CASE
          WHEN has_leg AND NOT has_so THEN c.id
        END)::int AS "legacyCount",
        COUNT(DISTINCT CASE
          WHEN has_so AND has_leg THEN c.id
        END)::int AS "mixedCount"
      FROM customers c
      CROSS JOIN LATERAL (
        SELECT
          EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%') AS has_so,
          EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%') AS has_leg
      ) flags
      WHERE c.is_deleted = false
        AND (flags.has_so OR flags.has_leg)
    `;
    const result = await this.customerRepo.query(sql);
    return result?.[0] || { newCount: 0, legacyCount: 0, mixedCount: 0 };
  }
}
