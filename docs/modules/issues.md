# Issues

Staff report software problems to the development team and track them to
closure, with an append-only history that makes every action attributable.

**Scope boundary:** staff → development team, *about the software itself* —
bugs, broken pages, wrong numbers, feature requests. Customer problems belong
in **Support**; HR matters belong in **HRM Complaints**. Keep it that way, or
this becomes a fourth overlapping inbox.

Sidebar: **Issues** (visible to every staff role). Pages: `/admin/issues`,
`/admin/issues/[id]`.

## The workflow

```
  open ────► in_progress ────► resolved ────► in_review ────► closed
   ▲   (dev takes it)   (dev: "done")  (reporter testing)  (reporter accepts)
   │                                        │
   └───────────── reopen ◄──────────────────┘
         (reporter rejects — comment REQUIRED)
```

| Transition | Who |
| --- | --- |
| create → `open` | any staff member |
| `open` → `in_progress` | dev team (assigns itself if unassigned) |
| `in_progress` → `resolved` / back to `open` | dev team |
| `resolved` → `in_review` or straight to `closed` | **reporter** (or admin) |
| `in_review` → `closed` | **reporter** (or admin) |
| `in_review` → `open` (reopen) | reporter — **comment mandatory** |
| `open`/`in_progress` → `closed`, `closed` → `open` | admin override — comment mandatory |

Two rules keep it fair in both directions: **a developer can never accept
their own fix** (closing belongs to the reporter), and **a reopen without a
written reason is rejected by the server**, not just the UI.

The table lives in
[issue-status.ts](../../backend/src/modules/issues/issue-status.ts) as a pure
function with an exhaustive spec beside it. The UI's buttons come from the same
table (`viewer.transitions` in the detail response), so the interface can never
offer a move the server would refuse.

## The history — why it can be trusted

- **`issue_events` is append-only at the database level.** A trigger rejects
  `UPDATE` and `DELETE`, so even a buggy service call cannot rewrite history.
- **Comments are never destroyed.** An edit inserts a new version pointing at
  the old one (shown as "edited", previous text one click away); a delete is a
  soft-delete whose tombstone stays in the timeline, with the original text
  preserved in the event payload.
- **Issue edits are recorded** with the previous title/description in the
  event — a report cannot be quietly rewritten after the fact to claim
  something different was asked.

If a dispute ever arises about who said or did what, the timeline is the
record, and nothing in the application can alter it retroactively.

## Attachments and voice notes

Comments accept screenshots (JPEG/PNG/WebP/GIF, ≤10 MB) and **voice notes**
recorded in the browser (≤5 minutes, ≤15 MB; webm/opus on Chrome, mp4 on
Safari). Files land in `backend/uploads/issues/` and are served from
`/uploads/issues/` on the API host — URLs are stored absolute, because the
storefront domains do not proxy `/uploads`.

**Backup:** the nightly job archives the whole `uploads/` directory
(`trustcart_uploads_*.tar.gz`, 14-day rotation) alongside the database dump —
added precisely because voice evidence that exists on one disk is not
evidence. `.\scripts\fetch-backup.ps1 -Uploads` pulls the newest archive to
your machine. See [operations/backups.md](../operations/backups.md).

## Permissions

| Slug | Granted to | Meaning |
| --- | --- | --- |
| `view-issues` | every staff role | see issues, timelines, history |
| `create-issues` | every staff role | report, comment, attach |
| `manage-issues` | `developer`, `admin`, `super-admin` | work the dev lane |

The migration grants view/create to every role **existing at the time it
runs**; a role created later needs the grants added in the Roles UI. Customer
accounts hold none of these, which is what keeps the module staff-only.

Put people on the dev team by assigning the **Developer** role in
`/admin/roles/assign`.

## Conventions

- Everyone sees everything — that transparency is deliberate. If something is
  security-sensitive, don't put the exploit details in the issue; link a
  private document instead.
- What you *did* about an issue goes in its comments; the module's own history
  handles the rest. No `ISSUE_FIXED.md` files.

## API

All under `/api/issues`, JWT + permissions guarded. Swagger at `/api/docs` is
the reference; the shape worth knowing is that `GET /issues/:id` returns the
full timeline plus `viewer.transitions` — the exact moves the current user may
make.
