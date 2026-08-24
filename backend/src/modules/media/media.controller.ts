import {
  Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions('view-media-library')
  findAll(@Query('search') search?: string, @Query('page') page?: string) {
    return this.mediaService.findAll(search, Number(page) || 1);
  }

  /**
   * Files are uploaded through the existing /upload/image endpoint;
   * this records the result so the library can browse and reuse it.
   */
  @Post('register')
  @RequirePermissions('manage-media-library')
  register(
    @Body() data: { url: string; filename?: string; mime?: string; size_bytes?: number },
    @Req() req: any,
  ) {
    return this.mediaService.register(data, req.user?.id ?? null);
  }

  @Delete(':id')
  @RequirePermissions('manage-media-library')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
