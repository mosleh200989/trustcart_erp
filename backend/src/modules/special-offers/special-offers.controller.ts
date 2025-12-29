import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SpecialOffersService } from './special-offers.service';
import { SpecialOffer } from './special-offer.entity';

@Controller('special-offers')
export class SpecialOffersController {
  constructor(private readonly specialOffersService: SpecialOffersService) {}

  @Get()
  async findAll(@Query('active') active?: string): Promise<SpecialOffer[]> {
    if (active === 'true') {
      return this.specialOffersService.findActive();
    }
    return this.specialOffersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<SpecialOffer | null> {
    return this.specialOffersService.findOne(id);
  }

  @Post()
  async create(@Body() offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    return this.specialOffersService.create(offerData);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() offerData: Partial<SpecialOffer>,
  ): Promise<SpecialOffer | null> {
    return this.specialOffersService.update(id, offerData);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.specialOffersService.remove(id);
  }
}
