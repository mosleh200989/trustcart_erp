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
`automation_faqs`, `automation_outbox` and `automation_audit`, and seeds four
permissions.

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

Five layers, cheapest first. Each one is a safety gate, not just an optimisation.

1. **Escalation checks** — complaints, refunds, order numbers, phone numbers.
   Handed to a person; nothing is auto-sent.
2. **Keyword rules** — the common questions. Free and instant.
3. **ERP placeholders** — `{{product_price}}`, `{{order_status}}` and friends are
   filled from the shop's own tables. If a placeholder cannot be resolved, the
   rule is skipped rather than sending a broken reply.
4. **FAQ answers** — stated policy for the questions no table can answer.
   Sent word for word, still without an API call. See section 10.
5. **The AI** — only for what is left, and only allowed to state facts supplied
   from the ERP and the FAQ. A low-confidence answer becomes an escalation, not
   a reply.

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
| `db/migrations/2026-09-05-automation-faq.sql` | FAQ table + starter answers |
| `frontend/src/pages/admin/automation/` | The panel |
| `frontend/src/layouts/AutomationLayout.tsx` | Panel shell + password gate |

Retries and nightly pruning ride on `@nestjs/schedule`, already registered
globally in `AppModule` — there is nothing extra to start or supervise.

---

## 10. The FAQ layer

Prices and order status come from the ERP because they change. Delivery time,
coverage, payment terms and how to order live in no table at all — so before
this existed the reply engine had nothing grounded to say about the most common
questions on the page, and correctly escalated every one of them.

**Panel → FAQ.** An answer is written by a person and sent to the customer word
for word. That is why:

- **No `{{placeholders}}`.** The API refuses them. An answer needing live data
  belongs in a rule.
- **No figures that belong to the catalogue.** A price typed here goes stale
  exactly the way a price in an imported chat does — which is the mistake the
  whole masking design exists to avoid.
- **Starter answers ship switched off.** Their wording comes from the team's own
  imported threads, so it is their policy rather than an invention, but nobody
  has confirmed it is still current. Read them in the panel, correct them, then
  turn them on.

### Matching

A confident keyword match answers directly, with no model in the loop — which
is what makes this layer useful while the AI is switched off, and what keeps a
routine "koto din lagbe?" free once it is on.

| Signal | Score |
|---|---|
| A multi-word keyword phrase (`koto din`) | 1.0 |
| A single-word keyword (`delivery`) | 0.6 |
| A significant word from the question itself | 0.25 |

The default threshold is **0.75**, so a phrase is enough on its own and a single
shared word is not: "delivery" fits both "delivery koto din" and "delivery
charge koto", and sending the wrong stated answer is worse than asking a person.
Below the threshold the message carries on to the AI, which receives every
active answer as policy facts — a question phrased in a way the scorer missed is
exactly what the model is there for.

Tokenising keeps Unicode Marks (`\p{M}`) as well as Letters. Bengali vowel signs
are combining marks, so a letters-only class splits `ডেলিভারি` into four
meaningless fragments and no Bengali keyword can ever match.

Thresholds, the direct-reply switch and the prompt cap live in
**Panel → Settings → General**. The FAQ page has a dry-run tester that shows the
winning answer, its score and which keywords fired, and sends nothing.

---

## 11. Style examples

The grounding split has two halves. Facts come from the ERP and the FAQ.
**Voice** comes from the imported history.

Star a reply on **Panel → History import** and it is pasted into the system
prompt under `HOW OUR TEAM WRITES`, in conversation order — greeting, then
qualifying, then price, then order, then closing — so the block reads as a flow
rather than a bag of sentences.

Every figure in those messages was removed at import because it was already
stale, so the block tells the model plainly what to copy and what to ignore:
shown `eta [PRICE] tk` and told nothing, a model will happily send a customer
the literal word `[PRICE]`.

Two layers stop a stale number reaching anyone:

1. **Masking at import** — the original is never written to disk, so a leaked
   figure can be swept up later by re-running the masker (History import →
   re-clean). It cannot be leaked by a change to a query or a prompt, because it
   is not there.
2. **A withholding filter at load** — any starred example still carrying a run
   of three or more digits is dropped from the prompt and logged. Three, not
   four: the `NUMBER` masking rule only sweeps runs of four or more, so a
   three-digit price that never sat beside a currency word survives import
   looking like ordinary text.

Toggle and cap live in **Panel → Settings → AI**. With the toggle off the model
falls back on the channel's written persona alone.

---

## 12. Taking orders in the thread

**Panel → Settings → Orders from Messenger.** Off by default — every other
switch in this panel can only produce words; this one writes a row to
`sales_orders`.

The flow: settle the product and quantity, ask for name, mobile and address one
at a time, read the whole order back, and create it only when the customer
confirms in writing. The order is created through `SalesService`, not by
inserting rows, so a Messenger order is indistinguishable downstream from a
website one — order number, customer linking, courier, Meta CAPI and every
dashboard behave identically. It lands at status `processing`, cash on
delivery, with `order_source = 'messenger_bot'`.

### What it will not do

- **Never in shadow or off mode.** Everywhere else "shadow" means a message is
  not sent and the worst case is a customer not hearing back. Here it would
  mean a real delivery. The refusal is enforced in the decision itself.
- **Never takes payment details.** No bKash number, no transaction ID. They are
  worth more to an attacker sitting in a Facebook thread than they are to us,
  and a bot cannot verify either.
- **Never mentions stock.** Everything the catalogue can find is orderable.
- **Never creates two orders.** `sales_order_id` is written under a conditional
  update — the same claim-before-acting shape as the outbox — so a repeated
  "confirm" or a duplicated webhook is harmless. A partial unique index enforces
  it in the database as well.

### Two things it changes elsewhere

`escalate_on_phone_number` is suppressed while a draft is open. That rule exists
to catch someone trying to order in a public comment; during a private order
flow the customer typing their number is the flow working, and escalating on it
makes the order impossible to finish. It still fires everywhere else.

The flow needs the AI layer for extraction — nothing else can read a name or an
address out of free text. With the AI off, a thread that has an open draft is
handed to a person rather than guessed at.

---

## 13. Connection health

The Kasri page stopped receiving webhooks on 3 September and nobody noticed for
two days. Nothing looked wrong: the endpoint answered, the secret was
configured, and the events table was empty — which is exactly what a quiet day
looks like. The cause was the Facebook app having its **API access blocked**,
which one Graph call surfaces immediately.

**Panel → Overview** now carries a red banner when a page is disconnected, and
a **Check connection** button that probes Facebook on demand. A cron repeats it
every six hours.

Two independent signals, because either alone has a blind spot:

| Signal | Catches | Misses |
|---|---|---|
| Graph probe (`/me`, `/{page}/subscribed_apps`) | dead token, blocked app, page subscribed to nothing or to the wrong fields | a page that is subscribed but silently not delivering |
| Silence (`health_silence_hours`, default 24) | anything that stops deliveries | takes a day, and cannot tell a broken page from a quiet one |

A dead token outranks silence in the report, because fixing the token is the
action and the silence is a symptom of it.

Reading the subscription needs `pages_manage_metadata`. A token can lack it and
still receive and send perfectly well, so that case is reported as healthy with
a note rather than as a failure.

