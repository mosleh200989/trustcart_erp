# Facebook / Messenger automation

Automatic replies to Facebook Page comments and Messenger messages, plus posting
to the page — all inside the existing NestJS backend. No extra server, no queue
workers, no separate database.

Everything is configured from the **Automation** panel in the admin (top navbar →
Automation), which sits behind its own password. Only three values live in the
environment, because they are app-level secrets rather than per-page settings.

---

## 1. Environment variables

Add these to `backend/.env`:

```
# Meta (Facebook) webhook — comment & Messenger automation
# Any random string; type the SAME string into the Meta App Dashboard.
META_WEBHOOK_VERIFY_TOKEN=

# App Secret from Meta App Dashboard → Settings → Basic.
# Used to verify X-Hub-Signature-256 on every incoming event.
META_APP_SECRET=

# Optional debug escape hatch. Accepts unsigned webhook events but logs loudly.
# Use only while chasing a signature mismatch — never leave it on in production.
# META_WEBHOOK_ALLOW_UNSIGNED=false

# Optional. Only needed if you turn the AI reply layer on in the panel.
ANTHROPIC_API_KEY=
```

The webhook **fails closed**: until `META_APP_SECRET` holds a value, every incoming
event is rejected with 401 and logged. That is deliberate — the callback URL is
public, so an unconfigured secret must never leave an unauthenticated write
endpoint open on the internet.

Page access tokens are **not** environment variables. They are stored per channel
in the Automation panel, so a new brand page can be connected without a deploy.

---

## 2. Database migration

```bash
cd backend && npm run db:up
```

This creates `automation_settings`, `automation_channels`, `automation_events`,
`automation_conversations`, `automation_messages`, `automation_rules`,
`automation_outbox` and `automation_audit`, and seeds four permissions.

---

## 3. Permissions

Granted to `super-admin` and `admin` by the migration. Assign them to other roles
on **Users → Role Permissions** (module: *automation*).

| Permission | What it allows |
|---|---|
| `view-automation` | See the **Automation** button and open the panel |
| `manage-automation` | Change channels, rules and settings; publish posts |
| `reply-automation-inbox` | Reply by hand from the inbox; approve held replies |
| `manage-automation-security` | Set, change or clear the panel password |

`view-automation` alone is enough to see the button — that is the permission to
grant for read-only visibility.

---

## 4. The panel password

The Automation panel asks for a second password on top of the normal login. It is
a re-authentication gate, not a second identity: the caller must already be a
staff user holding `view-automation`.

- First person with `manage-automation-security` to open the panel sets it.
- The unlock lasts 30 minutes (configurable) and lives in `sessionStorage`, so it
  dies with the browser tab.
- Five wrong attempts locks the panel for 15 minutes.
- Forgot it? Someone with `manage-automation-security` can clear it under
  **Settings → Panel password → Clear password**, which sends the panel back to
  first-time setup. The action is recorded in the panel's History.

---

## 5. Meta App Dashboard setup

This is the manual half — it has to be done in your own Meta business account.

1. **App** — reuse the app that already runs Conversions API / WhatsApp, or create
   a new Business-type app.
2. **Products** — add *Messenger* and *Webhooks*.
3. **Webhook callback URL** —
   `https://<your-backend-domain>/api/automation/webhook/facebook`
   **Verify token** — the same string as `META_WEBHOOK_VERIFY_TOKEN`.
   Meta calls the URL with a GET; the endpoint answers the challenge as plain text.
4. **Subscribe the page to fields** — `feed` (comments), `messages`,
   `messaging_postbacks`, `message_reactions`. The panel can do this for you:
   **Channels → Subscribe**.
5. **Page access token** — generate one for the page and paste it into the channel
   in the panel, then press **Verify** to confirm it works.
6. **App Review** — required before the automation works on a page the public can
   see. Request `pages_messaging`, `pages_manage_engagement`,
   `pages_read_engagement`, `pages_show_list`. Allow 1–2 weeks. Everything works
   immediately on a **test page** in development mode, so this never blocks build
   or testing.

Health check, safe to open in a browser:

```
GET https://<your-backend-domain>/api/automation/webhook/facebook/health
```

---

## 6. Going live safely

The default path is deliberately slow, and worth following:

1. Create the channel — it starts in **shadow** mode.
2. Turn on **Settings → Automation enabled**.
3. Add keyword rules for your top questions. Use **Rules → Test a message** to dry
   run them; nothing is sent.
4. Let it run in shadow for a week. The bot writes each reply it *would* have sent
   and holds it. Read them under **Inbox** (purple bubbles) or **Overview → Held**.
5. Tune the rules. Approve individual held replies if you want to send one.
6. Switch the channel to **live**.
7. Watch **Overview** for the first few days. The **Kill switch** stops all sending
   instantly without changing any other configuration.

---

## 7. How a reply is decided

Four layers, cheapest first. Each one is a safety gate, not just an optimisation.

1. **Escalation checks** — complaints, refunds, order numbers, phone numbers.
   Handed to a person; nothing is auto-sent.
2. **Keyword rules** — the common questions. Free and instant.
3. **ERP placeholders** — `{{product_price}}`, `{{order_status}}` and friends are
   filled from the shop's own tables. If a placeholder cannot be resolved, the
   rule is skipped rather than sending a broken reply.
4. **Claude** — only for what is left, and only allowed to state facts supplied
   from the ERP. A low-confidence answer becomes an escalation, not a reply.

## 8. Built-in safety rails

| Rail | What it prevents |
|---|---|
| Echo filter | The bot replying to its own comment, forever, in public |
| Unique `meta_event_id` | Duplicate replies when Meta retries a delivery |
| Per-thread hourly cap | A misbehaving rule spamming one post |
| Shadow mode | Anything reaching a customer before you have read it |
| Kill switch | Everything, in one click |
| Signature verification | Forged events from anyone who finds the URL |
| Conversation takeover | The bot talking over a human who has stepped in |
| Log pruning | The events table filling the disk |

---

## 9. Where things are

| Path | What |
|---|---|
| `backend/src/modules/automation/` | The whole module |
| `backend/src/modules/automation/facebook/` | Webhook, Graph API, reply brain, outbox |
| `backend/src/common/guards/meta-webhook.guard.ts` | Signature verification |
| `db/migrations/2026-08-28-automation-suite.sql` | Schema + permissions |
| `frontend/src/pages/admin/automation/` | The panel |
| `frontend/src/layouts/AutomationLayout.tsx` | Panel shell + password gate |

Retries and nightly pruning ride on `@nestjs/schedule`, already registered
globally in `AppModule` — there is nothing extra to start or supervise.
