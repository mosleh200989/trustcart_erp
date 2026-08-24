import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { Testimonial } from './testimonial.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('testimonials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  @RequirePermissions('view-testimonials')
  findAll(@Query('approved') approved?: string) {
    return this.testimonialsService.findAll(approved === 'true');
  }

  @Post()
  @RequirePermissions('manage-testimonials')
  create(@Body() data: Partial<Testimonial>) {
    return this.testimonialsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-testimonials')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Testimonial>) {
    return this.testimonialsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage-testimonials')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testimonialsService.remove(id);
  }
}
