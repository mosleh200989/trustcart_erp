import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Issue } from './entities/issue.entity';
import { IssueComment } from './entities/issue-comment.entity';
import { IssueAttachment } from './entities/issue-attachment.entity';
import { IssueEvent } from './entities/issue-event.entity';
import { RbacService } from '../rbac/rbac.service';
import {
  ActorContext,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  availableTransitions,
  decideTransition,
} from './issue-status';

const ADMIN_ROLE_SLUGS = new Set(['super-admin', 'admin']);

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VOICE_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VOICE_BYTES = 15 * 1024 * 1024;

export interface ActorUser {
  id: number;
  name?: string;
}

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue) private issueRepo: Repository<Issue>,
    @InjectRepository(IssueComment) private commentRepo: Repository<IssueComment>,
    @InjectRepository(IssueAttachment) private attachmentRepo: Repository<IssueAttachment>,
    @InjectRepository(IssueEvent) private eventRepo: Repository<IssueEvent>,
    private readonly rbacService: RbacService,
  ) {}

  /* ------------------------------------------------------------ context */

  async actorContext(userId: number, issue: Issue): Promise<ActorContext> {
    const [permissions, roles] = await Promise.all([
      this.rbacService.getUserPermissions(userId),
      this.rbacService.getUserRoles(userId),
    ]);
    const permissionSlugs = new Set(permissions.map((p: any) => p.slug));
    const roleSlugs = new Set(roles.map((r: any) => r.slug));
    return {
      isReporter: issue.reporterId === userId,
      isManager: permissionSlugs.has('manage-issues'),
      isAdmin: [...roleSlugs].some((s) => ADMIN_ROLE_SLUGS.has(String(s))),
    };
  }

  /* ------------------------------------------------------------- create */

  async create(
    actor: ActorUser,
    dto: { title: string; description?: string; category?: string; priority?: string },
  ) {
    const title = String(dto.title || '').trim();
    if (!title) throw new BadRequestException('A title is required');
    if (title.length > 300) throw new BadRequestException('Title is limited to 300 characters');

    const category = dto.category || 'bug';
    const priority = dto.priority || 'normal';
    if (!ISSUE_CATEGORIES.includes(category as any)) {
      throw new BadRequestException(`Unknown category '${category}'`);
    }
    if (!ISSUE_PRIORITIES.includes(priority as any)) {
      throw new BadRequestException(`Unknown priority '${priority}'`);
    }

    const issue = await this.issueRepo.save(
      this.issueRepo.create({
        title,
        description: String(dto.description || ''),
        category,
        priority,
        status: 'open',
        reporterId: actor.id,
      }),
    );

    await this.recordEvent(issue.id, actor.id, 'created', null, 'open', {
      title,
      category,
      priority,
    });

    return this.detail(issue.id, actor.id);
  }

  /* --------------------------------------------------------------- list */

  async list(query: {
    status?: string;
    category?: string;
    reporterId?: number;
    assigneeId?: number;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const qb = this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.reporter', 'reporter')
      .leftJoinAndSelect('issue.assignee', 'assignee')
      .orderBy('issue.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('issue.status = :status', { status: query.status });
    if (query.category) qb.andWhere('issue.category = :category', { category: query.category });
    if (query.reporterId) qb.andWhere('issue.reporter_id = :rid', { rid: query.reporterId });
    if (query.assigneeId) qb.andWhere('issue.assignee_id = :aid', { aid: query.assigneeId });
    if (query.q) {
      qb.andWhere('(issue.title ILIKE :q OR issue.description ILIKE :q)', { q: `%${query.q}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      total,
      page,
      limit,
      items: items.map((i) => this.presentIssue(i)),
    };
  }

  /* ------------------------------------------------------------- detail */

  async detail(issueId: number, viewerId: number) {
    const issue = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: ['reporter', 'assignee'],
    });
    if (!issue) throw new NotFoundException('Issue not found');

    const [comments, events, attachments, ctx] = await Promise.all([
      this.commentRepo.find({
        where: { issueId },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      }),
      this.eventRepo.find({
        where: { issueId },
        relations: ['actor'],
        order: { createdAt: 'ASC' },
      }),
      this.attachmentRepo.find({ where: { issueId }, order: { createdAt: 'ASC' } }),
      this.actorContext(viewerId, issue),
    ]);

    // A superseded comment is an old version: shown only via its successor.
    const supersededIds = new Set(
      comments.filter((c) => c.supersedesId).map((c) => c.supersedesId as number),
    );

    const byComment = new Map<number, IssueAttachment[]>();
    const issueLevelAttachments: IssueAttachment[] = [];
    for (const a of attachments) {
      if (a.commentId) {
        if (!byComment.has(a.commentId)) byComment.set(a.commentId, []);
        byComment.get(a.commentId)!.push(a);
      } else {
        issueLevelAttachments.push(a);
      }
    }

    const presentedComments = comments
      .filter((c) => !supersededIds.has(c.id))
      .map((c) => ({
        id: c.id,
        author: c.author ? { id: c.author.id, name: c.author.name } : { id: c.authorId },
        body: c.deletedAt ? null : c.body,
        deleted: !!c.deletedAt,
        edited: !!c.supersedesId,
        previousVersions: this.versionChain(c, comments),
        attachments: (byComment.get(c.id) || []).map((a) => this.presentAttachment(a)),
        createdAt: c.createdAt,
      }));

    return {
      ...this.presentIssue(issue),
      description: issue.description,
      attachments: issueLevelAttachments.map((a) => this.presentAttachment(a)),
      comments: presentedComments,
      events: events.map((e) => ({
        id: e.id,
        actor: e.actor ? { id: e.actor.id, name: e.actor.name } : { id: e.actorId },
        action: e.action,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
      viewer: {
        ...ctx,
        transitions: availableTransitions(issue.status, ctx),
      },
    };
  }

  /* ---------------------------------------------------------- transition */

  async transition(actor: ActorUser, issueId: number, to: string, comment?: string) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const ctx = await this.actorContext(actor.id, issue);
    const decision = decideTransition(issue.status, to, ctx);
    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason);
    }

    const trimmedComment = String(comment || '').trim();
    if (decision.requiresComment && !trimmedComment) {
      throw new BadRequestException(
        `Moving this issue to '${to}' requires a comment explaining why`,
      );
    }

    const from = issue.status;
    issue.status = to;
    if (decision.action === 'started' && !issue.assigneeId) {
      issue.assigneeId = actor.id;
    }
    await this.issueRepo.save(issue);

    let commentId: number | undefined;
    if (trimmedComment) {
      const saved = await this.commentRepo.save(
        this.commentRepo.create({ issueId, authorId: actor.id, body: trimmedComment }),
      );
      commentId = saved.id;
    }

    await this.recordEvent(issueId, actor.id, decision.action!, from, to, {
      ...(commentId ? { commentId } : {}),
    });

    return this.detail(issueId, actor.id);
  }

  /* ------------------------------------------------------------ comments */

  async addComment(actor: ActorUser, issueId: number, body: string) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const trimmed = String(body || '').trim();
    if (!trimmed) throw new BadRequestException('Comment cannot be empty');

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ issueId, authorId: actor.id, body: trimmed }),
    );
    await this.recordEvent(issueId, actor.id, 'commented', null, null, { commentId: comment.id });
    await this.touch(issueId);
    return comment;
  }

  async editComment(actor: ActorUser, commentId: number, body: string) {
    const existing = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Comment not found');

    const issue = await this.issueRepo.findOne({ where: { id: existing.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    const ctx = await this.actorContext(actor.id, issue);
    if (existing.authorId !== actor.id && !ctx.isAdmin) {
      throw new ForbiddenException('Only the author (or an admin) may edit a comment');
    }

    const trimmed = String(body || '').trim();
    if (!trimmed) throw new BadRequestException('Comment cannot be empty');

    // Versioning, not mutation: the old row stays, the new one supersedes it.
    const replacement = await this.commentRepo.save(
      this.commentRepo.create({
        issueId: existing.issueId,
        authorId: existing.authorId,
        body: trimmed,
        supersedesId: existing.id,
      }),
    );
    // Re-point attachments so they follow the visible version.
    await this.attachmentRepo.update({ commentId: existing.id }, { commentId: replacement.id });

    await this.recordEvent(existing.issueId, actor.id, 'comment_edited', null, null, {
      commentId: replacement.id,
      supersedes: existing.id,
      previousBody: existing.body,
    });
    return replacement;
  }

  async deleteComment(actor: ActorUser, commentId: number) {
    const existing = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Comment not found');

    const issue = await this.issueRepo.findOne({ where: { id: existing.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    const ctx = await this.actorContext(actor.id, issue);
    if (existing.authorId !== actor.id && !ctx.isAdmin) {
      throw new ForbiddenException('Only the author (or an admin) may delete a comment');
    }

    // Soft delete: the tombstone stays in the timeline, the text is preserved
    // in the event payload for the record.
    existing.deletedAt = new Date();
    existing.deletedBy = actor.id;
    await this.commentRepo.save(existing);

    await this.recordEvent(existing.issueId, actor.id, 'comment_deleted', null, null, {
      commentId: existing.id,
      previousBody: existing.body,
    });
    return { ok: true };
  }

  /* ---------------------------------------------------------------- edit */

  async editIssue(
    actor: ActorUser,
    issueId: number,
    dto: { title?: string; description?: string; category?: string; priority?: string },
  ) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const ctx = await this.actorContext(actor.id, issue);
    if (!ctx.isReporter && !ctx.isAdmin && !ctx.isManager) {
      throw new ForbiddenException('Only the reporter, the dev team or an admin may edit an issue');
    }

    const changes: Record<string, { from: any; to: any }> = {};

    if (dto.title !== undefined) {
      const title = String(dto.title).trim();
      if (!title) throw new BadRequestException('Title cannot be empty');
      if (title !== issue.title) changes.title = { from: issue.title, to: title };
      issue.title = title;
    }
    if (dto.description !== undefined && String(dto.description) !== issue.description) {
      changes.description = { from: issue.description, to: String(dto.description) };
      issue.description = String(dto.description);
    }
    if (dto.category !== undefined && dto.category !== issue.category) {
      if (!ISSUE_CATEGORIES.includes(dto.category as any)) {
        throw new BadRequestException(`Unknown category '${dto.category}'`);
      }
      changes.category = { from: issue.category, to: dto.category };
      issue.category = dto.category;
    }
    if (dto.priority !== undefined && dto.priority !== issue.priority) {
      if (!ISSUE_PRIORITIES.includes(dto.priority as any)) {
        throw new BadRequestException(`Unknown priority '${dto.priority}'`);
      }
      changes.priority = { from: issue.priority, to: dto.priority };
      issue.priority = dto.priority;
    }

    if (Object.keys(changes).length === 0) return this.detail(issueId, actor.id);

    await this.issueRepo.save(issue);
    // The previous text is preserved in the event, so a description cannot be
    // quietly rewritten after the fact.
    await this.recordEvent(issueId, actor.id, 'edited', null, null, { changes });
    return this.detail(issueId, actor.id);
  }

  /* ---------------------------------------------------------- attachments */

  async saveAttachment(
    actor: ActorUser,
    issueId: number,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    opts: { kind: 'image' | 'voice'; commentId?: number; durationSecs?: number; baseUrl?: string },
  ) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    if (!file || !file.buffer?.length) throw new BadRequestException('No file received');

    const mime = String(file.mimetype || '').toLowerCase().split(';')[0].trim();
    if (opts.kind === 'image') {
      if (!IMAGE_MIMES.has(mime)) {
        throw new BadRequestException(`Unsupported image type: ${mime}`);
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Images are limited to 10 MB');
      }
    } else {
      if (!VOICE_MIMES.has(mime)) {
        throw new BadRequestException(`Unsupported audio type: ${mime}`);
      }
      if (file.size > MAX_VOICE_BYTES) {
        throw new BadRequestException('Voice notes are limited to 15 MB');
      }
    }

    const dir = path.join(process.cwd(), 'uploads', 'issues');
    fs.mkdirSync(dir, { recursive: true });

    const ext = this.extensionFor(mime, file.originalname);
    const filename = `issue-${issueId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);

    const attachment = await this.attachmentRepo.save(
      this.attachmentRepo.create({
        issueId,
        commentId: opts.commentId || null,
        kind: opts.kind,
        // Absolute URL on the API host, matching how product images are stored:
        // the storefront domains do not proxy /uploads, so a relative URL
        // would 404 there.
        url: `${(opts.baseUrl || '').replace(/\/+$/, '')}/uploads/issues/${filename}`,
        originalName: file.originalname?.slice(0, 255) || null,
        mime,
        sizeBytes: file.size,
        durationSecs: opts.durationSecs || null,
        uploadedBy: actor.id,
      }),
    );

    await this.recordEvent(issueId, actor.id, 'attachment_added', null, null, {
      attachmentId: attachment.id,
      kind: opts.kind,
      mime,
      sizeBytes: file.size,
    });
    await this.touch(issueId);
    return this.presentAttachment(attachment);
  }

  /* -------------------------------------------------------------- helpers */

  private extensionFor(mime: string, originalName?: string): string {
    const known: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/x-m4a': '.m4a',
    };
    if (known[mime]) return known[mime];
    const fromName = path.extname(originalName || '').toLowerCase();
    return /^\.[a-z0-9]{1,5}$/.test(fromName) ? fromName : '.bin';
  }

  private versionChain(comment: IssueComment, all: IssueComment[]) {
    const chain: Array<{ body: string; createdAt: Date }> = [];
    let current = comment;
    while (current.supersedesId) {
      const prev = all.find((c) => c.id === current.supersedesId);
      if (!prev) break;
      chain.push({ body: prev.body, createdAt: prev.createdAt });
      current = prev;
    }
    return chain;
  }

  private presentIssue(issue: Issue) {
    return {
      id: issue.id,
      title: issue.title,
      category: issue.category,
      priority: issue.priority,
      status: issue.status,
      reporter: issue.reporter
        ? { id: issue.reporter.id, name: issue.reporter.name }
        : { id: issue.reporterId },
      assignee: issue.assignee
        ? { id: issue.assignee.id, name: issue.assignee.name }
        : issue.assigneeId
          ? { id: issue.assigneeId }
          : null,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };
  }

  private presentAttachment(a: IssueAttachment) {
    return {
      id: a.id,
      kind: a.kind,
      url: a.url,
      originalName: a.originalName,
      mime: a.mime,
      sizeBytes: a.sizeBytes,
      durationSecs: a.durationSecs,
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt,
    };
  }

  private async touch(issueId: number) {
    await this.issueRepo.update({ id: issueId }, { updatedAt: new Date() });
  }

  private async recordEvent(
    issueId: number,
    actorId: number,
    action: string,
    fromStatus: string | null,
    toStatus: string | null,
    payload: Record<string, any>,
  ) {
    await this.eventRepo.insert({
      issueId,
      actorId,
      action,
      fromStatus,
      toStatus,
      payload,
    });
  }
}
