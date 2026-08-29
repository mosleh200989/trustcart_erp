import {
  ISSUE_STATUS,
  ALL_ISSUE_STATUSES,
  decideTransition,
  availableTransitions,
  ActorContext,
} from './issue-status';

/**
 * Exhaustive checks on the Issues workflow.
 *
 * The module's whole value is that its history can be trusted, and the
 * transition table is what makes actions impossible rather than merely
 * hidden. So every (from, to, actor-kind) combination is exercised — not
 * just the happy paths.
 */

const REPORTER: ActorContext = { isReporter: true, isManager: false, isAdmin: false };
const MANAGER: ActorContext = { isReporter: false, isManager: true, isAdmin: false };
const ADMIN: ActorContext = { isReporter: false, isManager: false, isAdmin: true };
const BYSTANDER: ActorContext = { isReporter: false, isManager: false, isAdmin: false };
const REPORTING_MANAGER: ActorContext = { isReporter: true, isManager: true, isAdmin: false };

const { OPEN, IN_PROGRESS, RESOLVED, IN_REVIEW, CLOSED } = ISSUE_STATUS;

describe('the development team lane', () => {
  it('lets a manager take an open issue', () => {
    expect(decideTransition(OPEN, IN_PROGRESS, MANAGER).allowed).toBe(true);
  });

  it('lets a manager put work back or mark it done', () => {
    expect(decideTransition(IN_PROGRESS, OPEN, MANAGER).allowed).toBe(true);
    expect(decideTransition(IN_PROGRESS, RESOLVED, MANAGER).allowed).toBe(true);
    expect(decideTransition(RESOLVED, IN_PROGRESS, MANAGER).allowed).toBe(true);
  });

  it('does not let the reporter move work through the dev lane', () => {
    expect(decideTransition(OPEN, IN_PROGRESS, REPORTER).allowed).toBe(false);
    expect(decideTransition(IN_PROGRESS, RESOLVED, REPORTER).allowed).toBe(false);
  });
});

describe('verification belongs to the reporter', () => {
  it('lets the reporter start review, accept, or reopen', () => {
    expect(decideTransition(RESOLVED, IN_REVIEW, REPORTER).allowed).toBe(true);
    expect(decideTransition(RESOLVED, CLOSED, REPORTER).allowed).toBe(true);
    expect(decideTransition(IN_REVIEW, CLOSED, REPORTER).allowed).toBe(true);
    expect(decideTransition(IN_REVIEW, OPEN, REPORTER).allowed).toBe(true);
  });

  it('a manager can NEVER accept their own fix', () => {
    // The core fairness rule. Managing the issue grants nothing here.
    expect(decideTransition(RESOLVED, IN_REVIEW, MANAGER).allowed).toBe(false);
    expect(decideTransition(RESOLVED, CLOSED, MANAGER).allowed).toBe(false);
    expect(decideTransition(IN_REVIEW, CLOSED, MANAGER).allowed).toBe(false);
  });

  it('a manager who reported the issue verifies as its reporter', () => {
    expect(decideTransition(RESOLVED, CLOSED, REPORTING_MANAGER).allowed).toBe(true);
  });

  it('reopening requires a comment; accepting does not', () => {
    expect(decideTransition(IN_REVIEW, OPEN, REPORTER).requiresComment).toBe(true);
    expect(decideTransition(IN_REVIEW, CLOSED, REPORTER).requiresComment).toBe(false);
  });
});

describe('admin overrides', () => {
  it('exist for stuck issues, and always demand a written reason', () => {
    for (const [from, to] of [
      [OPEN, CLOSED],
      [IN_PROGRESS, CLOSED],
      [CLOSED, OPEN],
    ] as const) {
      const d = decideTransition(from, to, ADMIN);
      expect(d.allowed).toBe(true);
      expect(d.requiresComment).toBe(true);
    }
  });

  it('are admin-only', () => {
    expect(decideTransition(OPEN, CLOSED, MANAGER).allowed).toBe(false);
    expect(decideTransition(CLOSED, OPEN, REPORTER).allowed).toBe(false);
  });

  it('let an admin stand in for an absent reporter', () => {
    expect(decideTransition(RESOLVED, CLOSED, ADMIN).allowed).toBe(true);
    expect(decideTransition(IN_REVIEW, OPEN, ADMIN).allowed).toBe(true);
  });
});

describe('everything not explicitly allowed is refused', () => {
  it('a bystander can do nothing at all', () => {
    for (const from of ALL_ISSUE_STATUSES) {
      expect(availableTransitions(from, BYSTANDER)).toEqual([]);
    }
  });

  it('no actor can skip the workflow', () => {
    const everybody = [REPORTER, MANAGER, ADMIN, REPORTING_MANAGER];
    for (const ctx of everybody) {
      expect(decideTransition(OPEN, RESOLVED, ctx).allowed).toBe(false);   // skip in_progress
      expect(decideTransition(OPEN, IN_REVIEW, ctx).allowed).toBe(false);
      expect(decideTransition(IN_PROGRESS, IN_REVIEW, ctx).allowed).toBe(false);
      expect(decideTransition(CLOSED, IN_PROGRESS, ctx).allowed).toBe(false);
      expect(decideTransition(CLOSED, RESOLVED, ctx).allowed).toBe(false);
      expect(decideTransition(CLOSED, IN_REVIEW, ctx).allowed).toBe(false);
    }
  });

  it('rejects unknown statuses and self-transitions with a reason', () => {
    expect(decideTransition('nonsense', OPEN, ADMIN)).toMatchObject({
      allowed: false,
      reason: expect.stringContaining('unknown current status'),
    });
    expect(decideTransition(OPEN, 'nonsense', ADMIN)).toMatchObject({
      allowed: false,
      reason: expect.stringContaining('unknown target status'),
    });
    expect(decideTransition(OPEN, OPEN, ADMIN).allowed).toBe(false);
  });

  it('every refusal carries a human-readable reason', () => {
    for (const from of ALL_ISSUE_STATUSES) {
      for (const to of ALL_ISSUE_STATUSES) {
        const d = decideTransition(from, to, BYSTANDER);
        if (!d.allowed) expect(typeof d.reason).toBe('string');
      }
    }
  });
});

describe('availableTransitions drives the UI honestly', () => {
  it('matches decideTransition for every combination', () => {
    // The buttons the UI offers must be exactly the moves the server accepts.
    for (const ctx of [REPORTER, MANAGER, ADMIN, BYSTANDER, REPORTING_MANAGER]) {
      for (const from of ALL_ISSUE_STATUSES) {
        const offered = availableTransitions(from, ctx).map((t) => t.to).sort();
        const accepted = ALL_ISSUE_STATUSES.filter(
          (to) => decideTransition(from, to, ctx).allowed,
        ).sort();
        expect(offered).toEqual(accepted);
      }
    }
  });

  it('a closed issue offers nothing except the admin reopen', () => {
    expect(availableTransitions(CLOSED, REPORTER)).toEqual([]);
    expect(availableTransitions(CLOSED, MANAGER)).toEqual([]);
    expect(availableTransitions(CLOSED, ADMIN).map((t) => t.to)).toEqual([OPEN]);
  });
});
