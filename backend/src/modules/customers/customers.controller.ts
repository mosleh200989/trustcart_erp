import { Controller, Get, Post, Body, Param, Put, Delete, BadRequestException, UseGuards, Query, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogDataAccess } from '../../common/decorators/data-access.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Public lookup used by guest checkout to avoid exposing full customer lists
  @Get('lookup')
  @Public()
  async lookup(@Query('phone') phone?: string, @Query('email') email?: string) {
    let customer: any | null = null;
    if (phone) customer = await this.customersService.findByPhone(String(phone));
    if (!customer && email) customer = await this.customersService.findByEmail(String(email));
    return { id: customer?.id ?? null };
  }

  // Authenticated self-profile (used by customer portal / checkout autofill)
  @Get('me')
  async me(@Request() req: any) {
    const email = req?.user?.email;
    const phone = req?.user?.phone;

    let customer: any | null = null;
    if (email) customer = await this.customersService.findByEmail(String(email));
    if (!customer && phone) customer = await this.customersService.findByPhone(String(phone));
    return customer;
  }

  // Public customer creation (registration / guest checkout)
  @Post('public')
  @Public()
  async createPublic(@Body() createCustomerDto: any) {
    try {
      return await this.customersService.create(createCustomerDto);
    } catch (error: any) {
      console.error('Customer creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create customer');
    }
  }

  /**
   * The page size a caller may ask for.
   *
   * `limit` used to reach TypeORM untouched, so `?limit=95000` returned every
   * customer in the database — with phone numbers — in a single request that
   * nothing recorded. 500 covers the largest page any screen actually asks for
   * (admin/customers requests 500) while making a full harvest ~190 separate
   * requests, each one a row in the data access log. Bulk work goes through the
   * export endpoint below, which is permissioned and counted.
   */
  private static readonly MAX_PAGE_SIZE = 500;

  /** Bounded page numbers too: a negative page produced a negative OFFSET. */
  private pagination(page?: string, limit?: string) {
    const requested = limit ? parseInt(limit, 10) : 10;
    return {
      page: Math.max(1, page ? parseInt(page, 10) || 1 : 1),
      limit: Math.min(
        CustomersController.MAX_PAGE_SIZE,
        Math.max(1, Number.isFinite(requested) ? requested : 10),
      ),
    };
  }

  @Get()
  @RequirePermissions('view-customers')
  @LogDataAccess({ resource: 'customers', action: 'list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('agentId') agentId?: string,
    @Query('teamLeaderId') teamLeaderId?: string,
    @Query('landingPageSlug') landingPageSlug?: string,
  ) {
    const { page: pageNum, limit: limitNum } = this.pagination(page, limit);
    return this.customersService.findAllPaginated({
      page: pageNum,
      limit: limitNum,
      search,
      tier,
      agentId: agentId === 'unassigned' ? 'unassigned' : (agentId ? parseInt(agentId, 10) : undefined),
      teamLeaderId: teamLeaderId === 'unassigned' ? 'unassigned' : (teamLeaderId ? parseInt(teamLeaderId, 10) : undefined),
      landingPageSlug,
    });
  }

  /**
   * Bulk download, as a governed action rather than a browser trick.
   *
   * The CRM page used to build this CSV client-side from rows it had already
   * fetched, so the server saw nothing: no permission, no record, no limit.
   * Now it needs export-customers — granted per role from the Role Permissions
   * page — and every download lands in the data access log with the filters
   * used and the row count.
   */
  @Get('export/csv')
  @RequirePermissions('export-customers')
  @LogDataAccess({ resource: 'customers', action: 'export' })
  async exportCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('agentId') agentId?: string,
    @Query('teamLeaderId') teamLeaderId?: string,
    @Query('landingPageSlug') landingPageSlug?: string,
    @Query('ids') ids?: string,
  ) {
    const csv = await this.customersService.exportCsv({
      search,
      tier,
      agentId: agentId === 'unassigned' ? 'unassigned' : (agentId ? parseInt(agentId, 10) : undefined),
      teamLeaderId:
        teamLeaderId === 'unassigned' ? 'unassigned' : (teamLeaderId ? parseInt(teamLeaderId, 10) : undefined),
      landingPageSlug,
      ids: ids
        ? String(ids)
            .split(',')
            .map((value) => parseInt(value, 10))
            .filter((value) => Number.isFinite(value))
        : undefined,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${stamp}.csv"`);
    return csv;
  }

  @Get(':id')
  @RequirePermissions('view-customers')
  @LogDataAccess({ resource: 'customers', action: 'view', idParam: 'id' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @RequirePermissions('create-customers')
  async create(@Body() createCustomerDto: any) {
    try {
      return await this.customersService.create(createCustomerDto);
    } catch (error: any) {
      console.error('Customer creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create customer');
    }
  }

  @Put(':id')
  @RequirePermissions('edit-customers')
  async update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    try {
      return await this.customersService.update(id, updateCustomerDto);
    } catch (error: any) {
      console.error('Customer update error:', error);
      throw new BadRequestException(error.message || 'Failed to update customer');
    }
  }

  @Delete(':id')
  @RequirePermissions('delete-customers')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
