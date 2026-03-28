import { Controller, Get, Put, Post, Body, Param, ParseIntPipe, UseGuards, Req, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SupplierService } from './supplier.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierProduct } from './entities/supplier-product.entity';

@Controller('supplier-portal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierPortalController {
  constructor(
    private readonly supplierService: SupplierService,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private supplierProductRepo: Repository<SupplierProduct>,
    private dataSource: DataSource,
  ) {}

  private async getSupplierForUser(userId: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { user_id: userId } });
    if (!supplier) throw new ForbiddenException('No supplier linked to this account');
    return supplier;
  }

  // ── Profile ─────────────────────────────────────────

  @Get('profile')
  @RequirePermissions('supplier-self-service')
  async getProfile(@Req() req: any) {
    const supplier = await this.getSupplierForUser(req.user.id);
    return this.supplierService.findOne(supplier.id);
  }

  @Put('profile')
  @RequirePermissions('supplier-self-service')
  async updateProfile(@Req() req: any, @Body() dto: any) {
    const supplier = await this.getSupplierForUser(req.user.id);
    // Restrict editable fields for supplier
    const allowed = ['contact_person', 'phone', 'alt_phone', 'email', 'address', 'city', 'district', 'bank_name', 'bank_account_number', 'bank_branch'];
    const filtered: any = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) filtered[key] = dto[key];
    }
    return this.supplierService.update(supplier.id, filtered);
  }

  // ── Purchase Orders ─────────────────────────────────

  @Get('purchase-orders')
  @RequirePermissions('supplier-self-service')
  async getPurchaseOrders(@Req() req: any) {
    const supplier = await this.getSupplierForUser(req.user.id);
    const orders = await this.dataSource.query(
      `SELECT po.*, w.name as warehouse_name
       FROM purchase_orders po
       LEFT JOIN warehouses w ON w.id = po.warehouse_id
       WHERE po.supplier_id = $1
       ORDER BY po.created_at DESC`,
      [supplier.id],
    );
    return orders;
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('supplier-self-service')
  async getPurchaseOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const supplier = await this.getSupplierForUser(req.user.id);
    const [order] = await this.dataSource.query(
      `SELECT po.*, w.name as warehouse_name FROM purchase_orders po LEFT JOIN warehouses w ON w.id = po.warehouse_id WHERE po.id = $1 AND po.supplier_id = $2`,
      [id, supplier.id],
    );
    if (!order) throw new NotFoundException('Purchase order not found');
    const items = await this.dataSource.query(
      `SELECT poi.*, p.name as product_name FROM purchase_order_items poi LEFT JOIN products p ON p.id = poi.product_id WHERE poi.purchase_order_id = $1`,
      [id],
    );
    return { ...order, items };
  }

  @Post('purchase-orders/:id/confirm')
  @RequirePermissions('supplier-self-service')
  async confirmPurchaseOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { expected_delivery_date?: string; notes?: string }) {
    const supplier = await this.getSupplierForUser(req.user.id);
    const [order] = await this.dataSource.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND supplier_id = $2`,
      [id, supplier.id],
    );
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status !== 'approved' && order.status !== 'sent') {
      throw new ForbiddenException('Only approved/sent POs can be confirmed');
    }
    await this.dataSource.query(
      `UPDATE purchase_orders SET status = 'confirmed', notes = COALESCE(notes, '') || $1, expected_delivery_date = COALESCE($2, expected_delivery_date), updated_at = NOW() WHERE id = $3`,
      [body.notes ? `\n[Supplier] ${body.notes}` : '', body.expected_delivery_date || null, id],
    );
    return { message: 'Purchase order confirmed', id };
  }

  // ── Catalog ─────────────────────────────────────────

  @Get('catalog')
  @RequirePermissions('supplier-self-service')
  async getCatalog(@Req() req: any) {
    const supplier = await this.getSupplierForUser(req.user.id);
    const products = await this.dataSource.query(
      `SELECT sp.*, p.name as product_name, p.sku as product_sku
       FROM supplier_products sp
       LEFT JOIN products p ON p.id = sp.product_id
       WHERE sp.supplier_id = $1 AND sp.is_active = true
       ORDER BY p.name ASC`,
      [supplier.id],
    );
    return products;
  }

  @Put('catalog/:id')
  @RequirePermissions('supplier-self-service')
  async updateCatalogItem(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: { unit_price?: number; min_order_quantity?: number; lead_time_days?: number }) {
    const supplier = await this.getSupplierForUser(req.user.id);
    const sp = await this.supplierProductRepo.findOne({ where: { id, supplier_id: supplier.id } });
    if (!sp) throw new NotFoundException('Catalog item not found');
    if (dto.unit_price !== undefined) sp.unit_price = dto.unit_price;
    if (dto.min_order_quantity !== undefined) sp.min_order_quantity = dto.min_order_quantity;
    if (dto.lead_time_days !== undefined) sp.lead_time_days = dto.lead_time_days;
    return this.supplierProductRepo.save(sp);
  }
}
