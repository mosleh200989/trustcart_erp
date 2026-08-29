import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { IssuesService } from './issues.service';

/**
 * Staff-facing issue tracker. Every staff role holds view-issues and
 * create-issues (granted in the module's migration); customer accounts hold
 * neither, so the permission requirement is also what keeps customers out.
 *
 * Who may move an issue through the workflow is decided per-transition inside
 * the service (reporter / manage-issues / admin) — not at the route level,
 * because the answer depends on the issue itself.
 */
@Controller('issues')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Get()
  @RequirePermissions('view-issues')
  list(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('reporterId') reporterId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      category,
      reporterId: reporterId ? Number(reporterId) : undefined,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @RequirePermissions('create-issues')
  create(
    @Req() req: any,
    @Body() body: { title: string; description?: string; category?: string; priority?: string },
  ) {
    return this.service.create({ id: req.user.id }, body);
  }

  @Get(':id')
  @RequirePermissions('view-issues')
  detail(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('create-issues')
  edit(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; description?: string; category?: string; priority?: string },
  ) {
    return this.service.editIssue({ id: req.user.id }, id, body);
  }

  @Post(':id/transition')
  @RequirePermissions('view-issues')
  transition(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { to: string; comment?: string },
  ) {
    return this.service.transition({ id: req.user.id }, id, body.to, body.comment);
  }

  @Post(':id/comments')
  @RequirePermissions('create-issues')
  comment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { body: string },
  ) {
    return this.service.addComment({ id: req.user.id }, id, body.body);
  }

  @Patch('comments/:commentId')
  @RequirePermissions('create-issues')
  editComment(
    @Req() req: any,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { body: string },
  ) {
    return this.service.editComment({ id: req.user.id }, commentId, body.body);
  }

  @Post('comments/:commentId/delete')
  @RequirePermissions('create-issues')
  deleteComment(@Req() req: any, @Param('commentId', ParseIntPipe) commentId: number) {
    return this.service.deleteComment({ id: req.user.id }, commentId);
  }

  @Post(':id/attachments')
  @RequirePermissions('create-issues')
  @UseInterceptors(FileInterceptor('file'))
  attach(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
    @Query('commentId') commentId?: string,
    @Query('durationSecs') durationSecs?: string,
  ) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    return this.service.saveAttachment({ id: req.user.id }, id, file, {
      kind: kind === 'voice' ? 'voice' : 'image',
      commentId: commentId ? Number(commentId) : undefined,
      durationSecs: durationSecs ? Math.round(Number(durationSecs)) : undefined,
      baseUrl: `${protocol}://${host}`,
    });
  }
}
