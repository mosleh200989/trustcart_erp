import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SpecialOffersService } from './special-offers.service';
import { SpecialOffer } from './special-offer.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('special-offers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpecialOffersController {
  constructor(private readonly specialOffersService: SpecialOffersService) {}

  @Get('public')
  @Public()
  async findPublic(): Promise<SpecialOffer[]> {
    return this.specialOffersService.findActive();
  }

  // Thank You page offer (single record, configured from admin)
  @Get('thank-you')
  @Public()
  async getThankYouOffer(): Promise<SpecialOffer | null> {
    return this.specialOffersService.findThankYouOffer(false);
  }

  @Get('thank-you/admin')
  @RequirePermissions('manage-discounts')
  async getThankYouOfferForAdmin(): Promise<SpecialOffer | null> {
    return this.specialOffersService.findThankYouOffer(true);
  }

  @Put('thank-you')
  @RequirePermissions('manage-discounts')
  async upsertThankYouOffer(@Body() offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    return this.specialOffersService.upsertThankYouOffer(offerData);
  }

  @Get()
  @RequirePermissions('manage-discounts')
  async findAll(@Query('active') active?: string): Promise<SpecialOffer[]> {
    if (active === 'true') {
      return this.specialOffersService.findActive();
    }
    return this.specialOffersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('manage-discounts')
  async findOne(@Param('id') id: number): Promise<SpecialOffer | null> {
    return this.specialOffersService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-discounts')
  async create(@Body() offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    return this.specialOffersService.create(offerData);
  }

  @Put(':id')
  @RequirePermissions('manage-discounts')
  async update(
    @Param('id') id: number,
    @Body() offerData: Partial<SpecialOffer>,
  ): Promise<SpecialOffer | null> {
    return this.specialOffersService.update(id, offerData);
  }

  @Delete(':id')
  @RequirePermissions('manage-discounts')
  async remove(@Param('id') id: number): Promise<void> {
    return this.specialOffersService.remove(id);
  }
}
