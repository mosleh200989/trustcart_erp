import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AutomationGateGuard } from './automation-gate.guard';
import { AutomationService } from './automation.service';
import { AutomationSettingsService } from './automation-settings.service';
import { AutomationAuditService } from './automation-audit.service';
import { FacebookEventService } from './facebook/facebook-event.service';
import { FacebookOutboxService } from './facebook/facebook-outbox.service';
import { HistoryImportService } from './history/history-import.service';
import {
  CreateChannelDto,
  CreateRuleDto,
  ManualReplyDto,
  PublishPostDto,
  SubscribePageDto,
  TestRulesDto,
  UpdateChannelDto,
  UpdateConversationStatusDto,
  UpdateRuleDto,
  UpdateSettingsSectionDto,
  StartImportDto,
  SetExampleDto,
} from './dto/automation.dto';

/** Settings sections the panel is allowed to patch. `gate` is off-limits here. */
const EDITABLE_SETTING_SECTIONS = new Set(['global', 'ai', 'escalation']);

/**
 * Everything the Automation panel talks to.
 *
 * Three guards, in order: you must be logged in, hold the right permission, and
 * have unlocked the panel with its own password within the session window.
 */
@Controller('automation')
@UseGuards(JwtAuthGuard, PermissionsGuard, AutomationGateGuard)
export class AutomationController {
  constructor(
    private readonly automation: AutomationService,
    private readonly settings: AutomationSettingsService,
    private readonly audit: AutomationAuditService,
    private readonly events: FacebookEventService,
    private readonly outbox: FacebookOutboxService,
    private readonly historyImport: HistoryImportService,
  ) {}

  private actor(request: Request) {
    const user = (request as any).user || {};
    return { id: user.id ? Number(user.id) : null, email: user.email ?? null, ip: request.ip };
  }

  // ─── Overview & settings ─────────────────────────────────────────────────

  @Get('overview')
  @RequirePermissions('view-automation')
  overview() {
    return this.automation.overview();
  }

  @Get('settings')
  @RequirePermissions('view-automation')
  getSettings() {
    return this.settings.getAll();
  }

  @Put('settings/:section')
  @RequirePermissions('manage-automation')
  async updateSettings(
    @Param('section') section: string,
    @Body() dto: UpdateSettingsSectionDto,
    @Req() request: Request,
  ) {
    if (!EDITABLE_SETTING_SECTIONS.has(section)) {
      // The gate section holds the password hash and is changed only through
      // the gate controller, which requires knowing the current password.
      throw new BadRequestException(`Unknown or protected settings section: ${section}`);
    }

    const actor = this.actor(request);
    const before = await this.settings.getAll();
    const updated = await this.settings.update(section, dto.patch, actor.id);

    await this.audit.record(
      actor,
      'settings.update',
      'settings',
      section,
      (before as any)[section],
      updated,
    );
    return updated;
  }

  /** One-click emergency stop. Separate endpoint so it is one call, always. */
  @Post('kill-switch')
  @RequirePermissions('manage-automation')
  async killSwitch(@Query('on') on: string, @Req() request: Request) {
    const actor = this.actor(request);
    const engaged = String(on ?? 'true').toLowerCase() !== 'false';
    const updated = await this.settings.update('global', { kill_switch: engaged }, actor.id);
    await this.audit.record(actor, engaged ? 'kill_switch.on' : 'kill_switch.off', 'settings', 'global');
    return updated;
  }

  // ─── Channels ────────────────────────────────────────────────────────────

  @Get('channels')
  @RequirePermissions('view-automation')
  listChannels() {
    return this.automation.listChannels();
  }

  @Get('channels/:id')
  @RequirePermissions('view-automation')
  getChannel(@Param('id', ParseIntPipe) id: number) {
    return this.automation.getChannel(id);
  }

  @Post('channels')
  @RequirePermissions('manage-automation')
  async createChannel(@Body() dto: CreateChannelDto, @Req() request: Request) {
    const actor = this.actor(request);
    const channel = await this.automation.createChannel(dto);
    await this.audit.record(actor, 'channel.create', 'channel', channel.id, null, channel);
    return channel;
  }

  @Put('channels/:id')
  @RequirePermissions('manage-automation')
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
    @Req() request: Request,
  ) {
    const actor = this.actor(request);
    const before = await this.automation.getChannel(id);
    const after = await this.automation.updateChannel(id, dto);

    await this.audit.record(actor, 'channel.update', 'channel', id, before, after);
    if (before.mode !== after.mode) {
      // Going live is the moment customers start seeing replies — log it apart.
      await this.audit.record(actor, 'channel.mode_change', 'channel', id, {
        mode: before.mode,
      }, { mode: after.mode });
    }
    return after;
  }

  @Delete('channels/:id')
  @RequirePermissions('manage-automation')
  async deleteChannel(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const actor = this.actor(request);
    const before = await this.automation.getChannel(id);
    const result = await this.automation.deleteChannel(id);
    await this.audit.record(actor, 'channel.delete', 'channel', id, before, null);
    return result;
  }

  @Post('channels/:id/verify')
  @RequirePermissions('manage-automation')
  async verifyChannel(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const result = await this.automation.verifyChannel(id);
    await this.audit.record(this.actor(request), 'channel.verify', 'channel', id, null, {
      ok: result.ok,
    });
    return result;
  }

  @Post('channels/:id/subscribe')
  @RequirePermissions('manage-automation')
  async subscribeChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubscribePageDto,
    @Req() request: Request,
  ) {
    const result = await this.automation.subscribeChannel(id, dto.fields);
    await this.audit.record(this.actor(request), 'channel.subscribe', 'channel', id, null, result);
    return result;
  }

  @Post('channels/:id/post')
  @RequirePermissions('manage-automation')
  async publishPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishPostDto,
    @Req() request: Request,
  ) {
    const result = await this.automation.publishPost(id, dto.message, dto.link);
    await this.audit.record(this.actor(request), 'channel.publish_post', 'channel', id, null, {
      ok: result.ok,
      post_id: result.postId ?? null,
      message: dto.message.slice(0, 200),
    });
    return result;
  }

  // ─── Rules ───────────────────────────────────────────────────────────────

  @Get('rules')
  @RequirePermissions('view-automation')
  listRules(@Query('channel_id') channelId?: string) {
    return this.automation.listRules(channelId ? Number(channelId) : undefined);
  }

  @Post('rules')
  @RequirePermissions('manage-automation')
  async createRule(@Body() dto: CreateRuleDto, @Req() request: Request) {
    const rule = await this.automation.createRule(dto);
    await this.audit.record(this.actor(request), 'rule.create', 'rule', rule.id, null, rule);
    return rule;
  }

  @Put('rules/:id')
  @RequirePermissions('manage-automation')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
    @Req() request: Request,
  ) {
    const rule = await this.automation.updateRule(id, dto);
    await this.audit.record(this.actor(request), 'rule.update', 'rule', id, null, rule);
    return rule;
  }

  @Delete('rules/:id')
  @RequirePermissions('manage-automation')
  async deleteRule(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const result = await this.automation.deleteRule(id);
    await this.audit.record(this.actor(request), 'rule.delete', 'rule', id);
    return result;
  }

  /** Dry-run — shows which rule would fire, sends nothing. */
  @Post('rules/test')
  @RequirePermissions('view-automation')
  testRules(@Body() dto: TestRulesDto) {
    return this.automation.testRules(dto.channel_id, dto.text, dto.thread_type || 'message');
  }

  // ─── Inbox ───────────────────────────────────────────────────────────────

  @Get('conversations')
  @RequirePermissions('view-automation')
  listConversations(
    @Query('channel_id') channelId?: string,
    @Query('status') status?: string,
    @Query('thread_type') threadType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.automation.listConversations({
      channelId: channelId ? Number(channelId) : undefined,
      status,
      threadType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('conversations/:id')
  @RequirePermissions('view-automation')
  getConversation(@Param('id', ParseIntPipe) id: number) {
    return this.automation.getConversation(id);
  }

  @Post('conversations/:id/reply')
  @RequirePermissions('reply-automation-inbox')
  async reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualReplyDto,
    @Req() request: Request,
  ) {
    const actor = this.actor(request);
    const message = await this.events.sendManualReply(id, dto.text, actor.id);
    await this.audit.record(actor, 'conversation.manual_reply', 'conversation', id, null, {
      text: dto.text.slice(0, 200),
    });
    return message;
  }

  @Put('conversations/:id/status')
  @RequirePermissions('reply-automation-inbox')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConversationStatusDto,
    @Req() request: Request,
  ) {
    const actor = this.actor(request);
    const conversation = await this.automation.setConversationStatus(id, dto.status, actor.id);
    await this.audit.record(actor, 'conversation.status', 'conversation', id, null, {
      status: dto.status,
    });
    return conversation;
  }

  /** Replies held back by shadow mode, for the watch-week review. */
  @Get('held-messages')
  @RequirePermissions('view-automation')
  listHeld(@Query('limit') limit?: string) {
    return this.automation.listHeldMessages(limit ? Number(limit) : 50);
  }

  /** Approves one held reply and actually sends it. */
  @Post('messages/:id/approve')
  @RequirePermissions('reply-automation-inbox')
  async approveHeld(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const message = await this.events.approveHeldMessage(id);
    await this.audit.record(this.actor(request), 'message.approve', 'message', id);
    return message ?? { error: 'Message not found or not held' };
  }

  // ─── Events, outbox, audit ───────────────────────────────────────────────

  @Get('events')
  @RequirePermissions('view-automation')
  listEvents(
    @Query('channel_id') channelId?: string,
    @Query('status') status?: string,
    @Query('event_type') eventType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.automation.listEvents({
      channelId: channelId ? Number(channelId) : undefined,
      status,
      eventType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('events/:id')
  @RequirePermissions('view-automation')
  getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.automation.getEvent(id);
  }

  @Get('outbox')
  @RequirePermissions('view-automation')
  listOutbox(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.automation.listOutbox({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post('outbox/:id/retry')
  @RequirePermissions('manage-automation')
  async retryOutbox(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const row = await this.outbox.retry(id);
    await this.audit.record(this.actor(request), 'outbox.retry', 'outbox', id);
    return row ?? { error: 'Outbox row not found' };
  }

  @Post('outbox/:id/cancel')
  @RequirePermissions('manage-automation')
  async cancelOutbox(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const cancelled = await this.outbox.cancel(id);
    await this.audit.record(this.actor(request), 'outbox.cancel', 'outbox', id);
    return { cancelled };
  }

  // ─── Messenger history import ────────────────────────────────────────────

  @Post('import/start')
  @RequirePermissions('import-automation-history')
  async startImport(@Body() dto: StartImportDto, @Req() request: Request) {
    const actor = this.actor(request);
    const run = await this.historyImport.start(dto.channel_id, dto.since_days ?? 180, actor.id);
    await this.audit.record(actor, 'history.import_start', 'import_run', run.id, null, {
      channel_id: dto.channel_id,
      since_days: dto.since_days ?? 180,
    });
    return run;
  }

  @Get('import/runs')
  @RequirePermissions('view-automation')
  listImportRuns(@Query('channel_id') channelId?: string) {
    return this.historyImport.listRuns(channelId ? Number(channelId) : undefined);
  }

  @Get('import/runs/:id')
  @RequirePermissions('view-automation')
  getImportRun(@Param('id', ParseIntPipe) id: number) {
    return this.historyImport.getRun(id);
  }

  @Post('import/runs/:id/cancel')
  @RequirePermissions('import-automation-history')
  async cancelImport(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const run = await this.historyImport.cancel(id);
    await this.audit.record(this.actor(request), 'history.import_cancel', 'import_run', id);
    return run;
  }

  @Get('history/stats')
  @RequirePermissions('view-automation')
  historyStats() {
    return this.historyImport.stats();
  }

  @Get('history/messages')
  @RequirePermissions('view-automation')
  listHistoryMessages(
    @Query('direction') direction?: 'inbound' | 'outbound',
    @Query('only_examples') onlyExamples?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.historyImport.listMessages({
      direction,
      onlyExamples: onlyExamples === 'true',
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Put('history/messages/:id/example')
  @RequirePermissions('import-automation-history')
  async setExample(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetExampleDto,
    @Req() request: Request,
  ) {
    const message = await this.historyImport.setExample(id, dto.is_example);
    await this.audit.record(this.actor(request), 'history.set_example', 'history_message', id, null, {
      is_example: dto.is_example,
    });
    return message;
  }

  @Get('audit')
  @RequirePermissions('view-automation')
  listAudit(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.audit.list({
      action,
      entity,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
