import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { LpExperiment } from './lp-experiment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('lp-experiments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  // ─── Public (visitor pages) ──────────────────────────────

  @Get('public/for-slug/:slug')
  @Public()
  publicForSlug(@Param('slug') slug: string) {
    return this.experimentsService.publicForSlug(slug);
  }

  @Post(':id/track-view')
  @Public()
  async trackView(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { variant?: string },
  ) {
    const variant = body?.variant === 'b' ? 'b' : 'a';
    await this.experimentsService.trackView(id, variant);
    return { ok: true };
  }

  // ─── Admin ───────────────────────────────────────────────

  @Get()
  @RequirePermissions('view-landing-pages')
  findAll() {
    return this.experimentsService.findAll();
  }

  @Get(':id/stats')
  @RequirePermissions('view-landing-pages')
  stats(@Param('id', ParseIntPipe) id: number) {
    return this.experimentsService.stats(id);
  }

  @Post()
  @RequirePermissions('manage-landing-pages')
  create(@Body() data: Partial<LpExperiment>) {
    return this.experimentsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-landing-pages')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<LpExperiment>) {
    return this.experimentsService.update(id, data);
  }

  @Post(':id/start')
  @RequirePermissions('manage-landing-pages')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.experimentsService.start(id);
  }

  @Post(':id/complete')
  @RequirePermissions('manage-landing-pages')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { winner_page_id: number; promote?: boolean },
  ) {
    return this.experimentsService.complete(id, Number(body?.winner_page_id), !!body?.promote);
  }

  @Delete(':id')
  @RequirePermissions('manage-landing-pages')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.experimentsService.remove(id);
  }
}
