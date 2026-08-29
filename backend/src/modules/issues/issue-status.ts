/**
 * The Issues workflow, as one pure transition table.
 *
 *   open ────► in_progress ────► resolved ────► in_review ────► closed
 *    ▲   (dev takes it)   (dev: "done")  (reporter testing)  (reporter accepts)
 *    │                                        │
 *    └───────────── reopen ◄──────────────────┘
 *          (reporter rejects — comment REQUIRED)
 *
 * Two rules make the history trustworthy in both directions:
 *  - a developer can never accept their own fix — closing belongs to the
 *    reporter (or an admin override, which always leaves an event), and
 *  - a reopen without a written reason is rejected by the server, not just
 *    hidden in the UI.
 *
 * Everything here is pure and synchronous so it can be tested exhaustively;
 * the service layer supplies the actor context and persists the outcome.
 */

export const ISSUE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  IN_REVIEW: 'in_review',
  CLOSED: 'closed',
} as const;

export type IssueStatus = (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS];

export const ALL_ISSUE_STATUSES: IssueStatus[] = Object.values(ISSUE_STATUS);

export const ISSUE_CATEGORIES = ['bug', 'feature', 'data-issue', 'other'] as const;
export const ISSUE_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

/** Who the actor is relative to this issue. Admin implies nothing else. */
export interface ActorContext {
  /** The actor reported this issue. */
  isReporter: boolean;
  /** The actor holds the manage-issues permission (development team). */
  isManager: boolean;
  /** The actor holds an admin/super-admin role. */
  isAdmin: boolean;
}

interface TransitionRule {
  from: IssueStatus;
  to: IssueStatus;
  /** At least one must be true for the actor. */
  allowed: (ctx: ActorContext) => boolean;
  /** The server rejects the transition without a non-empty comment. */
  requiresComment: boolean;
  /** Event label recorded in issue_events. */
  action: string;
}

const RULES: TransitionRule[] = [
  // The development team picks work up and reports it done.
  {
    from: ISSUE_STATUS.OPEN,
    to: ISSUE_STATUS.IN_PROGRESS,
    allowed: (c) => c.isManager || c.isAdmin,
    requiresComment: false,
    action: 'started',
  },
  {
    from: ISSUE_STATUS.IN_PROGRESS,
    to: ISSUE_STATUS.OPEN,
    allowed: (c) => c.isManager || c.isAdmin,
    requiresComment: false,
    action: 'released',
  },
  {
    from: ISSUE_STATUS.IN_PROGRESS,
    to: ISSUE_STATUS.RESOLVED,
    allowed: (c) => c.isManager || c.isAdmin,
    requiresComment: false,
    action: 'resolved',
  },
  {
    from: ISSUE_STATUS.RESOLVED,
    to: ISSUE_STATUS.IN_PROGRESS,
    allowed: (c) => c.isManager || c.isAdmin,
    requiresComment: false,
    action: 'resumed',
  },

  // Verification belongs to the reporter. A manager who is ALSO the reporter
  // may verify their own report — but managing the issue alone never grants it.
  {
    from: ISSUE_STATUS.RESOLVED,
    to: ISSUE_STATUS.IN_REVIEW,
    allowed: (c) => c.isReporter || c.isAdmin,
    requiresComment: false,
    action: 'review_started',
  },
  {
    from: ISSUE_STATUS.RESOLVED,
    to: ISSUE_STATUS.CLOSED,
    allowed: (c) => c.isReporter || c.isAdmin,
    requiresComment: false,
    action: 'accepted',
  },
  {
    from: ISSUE_STATUS.IN_REVIEW,
    to: ISSUE_STATUS.CLOSED,
    allowed: (c) => c.isReporter || c.isAdmin,
    requiresComment: false,
    action: 'accepted',
  },
  {
    from: ISSUE_STATUS.IN_REVIEW,
    to: ISSUE_STATUS.OPEN,
    allowed: (c) => c.isReporter || c.isAdmin,
    requiresComment: true,
    action: 'reopened',
  },

  // Admin-only escape hatches. Both demand a written reason.
  {
    from: ISSUE_STATUS.OPEN,
    to: ISSUE_STATUS.CLOSED,
    allowed: (c) => c.isAdmin,
    requiresComment: true,
    action: 'admin_closed',
  },
  {
    from: ISSUE_STATUS.IN_PROGRESS,
    to: ISSUE_STATUS.CLOSED,
    allowed: (c) => c.isAdmin,
    requiresComment: true,
    action: 'admin_closed',
  },
  {
    from: ISSUE_STATUS.CLOSED,
    to: ISSUE_STATUS.OPEN,
    allowed: (c) => c.isAdmin,
    requiresComment: true,
    action: 'admin_reopened',
  },
];

export interface TransitionDecision {
  allowed: boolean;
  /** Set when allowed; the event label to record. */
  action?: string;
  /** Set when allowed; the caller must supply a comment when true. */
  requiresComment?: boolean;
  /** Set when refused; a human-readable reason. */
  reason?: string;
}

export function decideTransition(
  from: string,
  to: string,
  ctx: ActorContext,
): TransitionDecision {
  if (!ALL_ISSUE_STATUSES.includes(from as IssueStatus)) {
    return { allowed: false, reason: `unknown current status '${from}'` };
  }
  if (!ALL_ISSUE_STATUSES.includes(to as IssueStatus)) {
    return { allowed: false, reason: `unknown target status '${to}'` };
  }
  if (from === to) {
    return { allowed: false, reason: 'the issue is already in that status' };
  }

  const rule = RULES.find((r) => r.from === from && r.to === to);
  if (!rule) {
    return { allowed: false, reason: `no transition from '${from}' to '${to}'` };
  }
  if (!rule.allowed(ctx)) {
    return { allowed: false, reason: `you are not permitted to move this issue from '${from}' to '${to}'` };
  }
  return { allowed: true, action: rule.action, requiresComment: rule.requiresComment };
}

/** The transitions the given actor could perform right now — drives the UI buttons. */
export function availableTransitions(from: string, ctx: ActorContext): Array<{
  to: IssueStatus;
  action: string;
  requiresComment: boolean;
}> {
  return RULES.filter((r) => r.from === from && r.allowed(ctx)).map((r) => ({
    to: r.to,
    action: r.action,
    requiresComment: r.requiresComment,
  }));
}
