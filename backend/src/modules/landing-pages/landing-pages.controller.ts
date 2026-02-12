import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LandingPagesService } from './landing-pages.service';
import { LandingPage } from './landing-page.entity';
import { LandingPageOrder } from './landing-page-order.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('landing-pages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  // ─── Public endpoints ───

  @Get('public/active')
  @Public()
  async findPublicActive(): Promise<LandingPage[]> {
    return this.landingPagesService.findActive();
  }

  @Get('public/slug/:slug')
  @Public()
  async findPublicBySlug(@Param('slug') slug: string): Promise<LandingPage | null> {
    const page = await this.landingPagesService.findActiveBySlug(slug);
    if (page) {
      // Fire and forget view count increment
      this.landingPagesService.incrementViewCount(page.id).catch(() => {});
    }
    return page;
  }

  // ─── Admin endpoints ───

  @Get()
  @RequirePermissions('manage-system-settings')
  async findAll(): Promise<LandingPage[]> {
    return this.landingPagesService.findAll();
  }

  @Get('stats')
  @RequirePermissions('manage-system-settings')
  async getStats() {
    return this.landingPagesService.getStats();
  }

  @Get(':id')
  @RequirePermissions('manage-system-settings')
  async findOne(@Param('id') id: number): Promise<LandingPage | null> {
    return this.landingPagesService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-system-settings')
  async create(@Body() data: Partial<LandingPage>): Promise<LandingPage> {
    return this.landingPagesService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-system-settings')
  async update(
    @Param('id') id: number,
    @Body() data: Partial<LandingPage>,
  ): Promise<LandingPage> {
    return this.landingPagesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage-system-settings')
  async remove(@Param('id') id: number): Promise<void> {
    return this.landingPagesService.remove(id);
  }

  @Put(':id/toggle')
  @RequirePermissions('manage-system-settings')
  async toggleActive(@Param('id') id: number): Promise<LandingPage> {
    return this.landingPagesService.toggleActive(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('manage-system-settings')
  async duplicate(@Param('id') id: number): Promise<LandingPage> {
    return this.landingPagesService.duplicate(id);
  }

  // ─── Order endpoints (Public) ───

  @Post('orders/submit')
  @Public()
  async submitOrder(@Body() data: Partial<LandingPageOrder>): Promise<LandingPageOrder> {
    return this.landingPagesService.createOrder(data);
  }

  // ─── Order endpoints (Admin) ───

  @Get('orders/all')
  @RequirePermissions('manage-system-settings')
  async findAllOrders(
    @Query('landing_page_id') landing_page_id?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<LandingPageOrder[]> {
    return this.landingPagesService.findAllOrders({
      landing_page_id: landing_page_id ? parseInt(landing_page_id, 10) : undefined,
      status,
      search,
    });
  }

  @Get('orders/stats')
  @RequirePermissions('manage-system-settings')
  async getOrderStats() {
    return this.landingPagesService.getOrderStats();
  }

  @Get('orders/:orderId')
  @RequirePermissions('manage-system-settings')
  async findOneOrder(@Param('orderId') orderId: number): Promise<LandingPageOrder | null> {
    return this.landingPagesService.findOneOrder(orderId);
  }

  @Put('orders/:orderId/status')
  @RequirePermissions('manage-system-settings')
  async updateOrderStatus(
    @Param('orderId') orderId: number,
    @Body() body: { status: string; admin_note?: string },
  ): Promise<LandingPageOrder> {
    return this.landingPagesService.updateOrderStatus(orderId, body.status, body.admin_note);
  }

  @Delete('orders/:orderId')
  @RequirePermissions('manage-system-settings')
  async deleteOrder(@Param('orderId') orderId: number): Promise<void> {
    return this.landingPagesService.deleteOrder(orderId);
  }

  @Post(':id/increment-order')
  @Public()
  async incrementOrder(@Param('id') id: number): Promise<{ success: boolean }> {
    await this.landingPagesService.incrementOrderCount(id);
    return { success: true };
  }
}
