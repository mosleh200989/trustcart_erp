import { Controller, Get, Query } from '@nestjs/common';
import { CustomerSegmentService, SegmentType } from './customer-segment.service';

@Controller('crm/customer-segments')
export class CustomerSegmentController {
  constructor(private readonly segmentService: CustomerSegmentService) {}

  @Get('counts')
  async getCounts() {
    return this.segmentService.getSegmentCounts();
  }

  @Get()
  async getCustomers(
    @Query('type') type: string = 'new',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const validTypes: SegmentType[] = ['new', 'legacy', 'mixed'];
    const segmentType: SegmentType = validTypes.includes(type as SegmentType)
      ? (type as SegmentType)
      : 'new';

    return this.segmentService.getCustomersBySegment(segmentType, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search || undefined,
    });
  }
}
